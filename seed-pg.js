async function seed() {
  await client.connect();
  console.log('✅ Conectado a Neon. Iniciando carga...');

  try {
    // 1. Iniciamos una transacción para que sea rápido y seguro
    await client.query('BEGIN');

    // Verificar versión
    const checkVersion = await client.query('SELECT id FROM "BibleVersion" WHERE name = $1', [VERSION_SHORT]);
    if (checkVersion.rows.length > 0) {
      console.log(`⚠️ La versión ${VERSION_SHORT} ya existe. Saltando inserción de versión...`);
    } else {
      const rv = await client.query(
        `INSERT INTO "BibleVersion" (name, "fullName") VALUES ($1, $2) RETURNING id`,
        [VERSION_SHORT, VERSION_FULL]
      );
      var versionId = rv.rows[0].id;
    }

    console.log('📥 Leyendo y parseando XML...');
    let xml = fs.readFileSync(XML_PATH, 'utf-8').replace(/^\uFEFF/, '').trimStart();
    
    const parser = new xml2js.Parser({ 
      explicitArray: false, 
      trim: true,
      mergeAttrs: true 
    });
    
    const data = await parser.parseStringPromise(xml);
    let testaments = data.bible.testament;
    if (!Array.isArray(testaments)) testaments = [testaments];

    let totalV = 0;

    for (const t of testaments) {
      const tName = t.name === 'Old' ? 'OT' : 'NT';
      let books = t.book || [];
      if (!Array.isArray(books)) books = [books];

      for (const b of books) {
        const bNumber = parseInt(b.number);
        const bName = bookNames[bNumber] || `Libro ${bNumber}`;
        const abbr = bName.slice(0, 3).toUpperCase();

        const rb = await client.query(
          `INSERT INTO "Book" (name, testament, abbr, "bookOrder", "versionId") VALUES ($1,$2,$3,$4,$5) RETURNING id`,
          [bName, tName, abbr, bNumber, versionId]
        );
        const bookId = rb.rows[0].id;

        let chapters = b.chapter || [];
        if (!Array.isArray(chapters)) chapters = [chapters];

        for (const ch of chapters) {
          const chNum = parseInt(ch.number);
          const rc = await client.query(
            `INSERT INTO "Chapter" (number, "bookId") VALUES ($1,$2) RETURNING id`,
            [chNum, bookId]
          );
          const chId = rc.rows[0].id;

          // CORRECCIÓN AQUÍ: Usamos ch.verse según tu XML
          let verses = ch.verse || [];
          if (!Array.isArray(verses)) verses = [verses];

          for (const v of verses) {
            const vNum = parseInt(v.number);
            // El texto en xml2js suele venir en la propiedad '_' cuando hay atributos
            const vText = (typeof v === 'string') ? v : (v._ || "");
            
            if (vText) {
              await client.query(
                `INSERT INTO "Verse" (number, text, "chapterId") VALUES ($1,$2,$3)`,
                [vNum, vText.toString().trim(), chId]
              );
              totalV++;
            }
          }
        }
        console.log(`📖 Cargado: ${bName}`);
      }
    }

    // 2. Si todo salió bien, guardamos los cambios definitivamente
    await client.query('COMMIT');
    console.log(`\n🎉 ¡Proceso completado! Total versículos: ${totalV}`);

  } catch (e) {
    // 3. Si hubo CUALQUIER error, deshacemos todo para no dejar datos a medias
    await client.query('ROLLBACK');
    console.error('❌ Error durante el seed. Se ha hecho ROLLBACK:', e);
  } finally {
    await client.end();
  }
}
