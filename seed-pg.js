const { Client } = require('pg');
const xml2js = require('xml2js');

const client = new Client({ 
  connectionString: process.env.DIRECT_URL,
  ssl: { rejectUnauthorized: false }
});

// CONFIGURACIÓN DE LA NUEVA VERSIÓN
const XMLURL = 'https://raw.githubusercontent.com/jmcots-svg/Bible_EEBV/main/data/NUEVA_VERSION.xml'; // <--- CAMBIA ESTO
const VERSION_SHORT = 'NVI'; // <--- CAMBIA ESTO (Ej: NVI, KJV)
const VERSION_FULL = 'Nueva Versión Internacional'; // <--- CAMBIA ESTO

async function seed() {
  await client.connect();
  console.log('Conectado a la DB');

  // 1. Crear tablas solo si no existen (No borramos nada)
  await client.query(`CREATE TABLE IF NOT EXISTS "BibleVersion" (id SERIAL PRIMARY KEY, name TEXT UNIQUE NOT NULL, "fullName" TEXT NOT NULL)`);
  await client.query(`CREATE TABLE IF NOT EXISTS "Book" (id SERIAL PRIMARY KEY, name TEXT NOT NULL, testament TEXT NOT NULL, abbr TEXT, "bookOrder" INTEGER, "versionId" INTEGER REFERENCES "BibleVersion"(id))`);
  await client.query(`CREATE TABLE IF NOT EXISTS "Chapter" (id SERIAL PRIMARY KEY, number INTEGER NOT NULL, "bookId" INTEGER REFERENCES "Book"(id))`);
  await client.query(`CREATE TABLE IF NOT EXISTS "Verse" (id SERIAL PRIMARY KEY, number INTEGER NOT NULL, text TEXT NOT NULL, "chapterId" INTEGER REFERENCES "Chapter"(id))`);
  
  console.log('Estructura de tablas verificada.');

  // 2. Verificar si la versión ya existe para no duplicar
  const checkVersion = await client.query('SELECT id FROM "BibleVersion" WHERE name = $1', [VERSION_SHORT]);
  if (checkVersion.rows.length > 0) {
    console.error(`❌ ERROR: La versión ${VERSION_SHORT} ya existe en la base de datos. Abortando para evitar duplicados.`);
    await client.end();
    return;
  }

  // 3. Insertar nueva versión
  const rv = await client.query(
    `INSERT INTO "BibleVersion" (name, "fullName") VALUES ($1, $2) RETURNING id`,
    [VERSION_SHORT, VERSION_FULL]
  );
  const versionId = rv.rows[0].id;
  console.log(`✅ Registrada nueva versión: ${VERSION_FULL} (ID: ${versionId})`);

  // 4. Fetch XML
  console.log(`Descargando XML de: ${XMLURL}`);
  const res = await fetch(XMLURL);
  if (!res.ok) throw new Error('No se pudo descargar el XML: ' + res.status);
  
  let xml = await res.text();
  xml = xml.replace(/^\uFEFF/, '').trimStart();

  const parser = new xml2js.Parser({ explicitArray: false, trim: true, normalizeTags: true });
  const data = await parser.parseStringPromise(xml);
  const root = data.bible;

  let books = root.b || [];
  if (!Array.isArray(books)) books = [books];
  console.log(`Procesando ${books.length} libros...`);

  let bookNum = 1;
  let totalV = 0;

  for (const b of books) {
    const attrs = b.$ || {};
    const bName = (attrs.n || '').trim();
    if (!bName) continue;
    
    const testament = bookNum <= 39 ? 'OT' : 'NT';
    const abbr = bName.slice(0, 3).toUpperCase();

    // Insertar Libro vinculado a la nueva VersionID
    const rb = await client.query(
      `INSERT INTO "Book" (name, testament, abbr, "bookOrder", "versionId") VALUES ($1,$2,$3,$4,$5) RETURNING id`,
      [bName, testament, abbr, bookNum++, versionId]
    );
    const bookId = rb.rows[0].id;

    let chapters = b.c || [];
    if (!Array.isArray(chapters)) chapters = [chapters];

    for (const ch of chapters) {
      const chAttrs = ch.$ || {};
      const chNum = parseInt(chAttrs.n || '1');

      const rc = await client.query(
        `INSERT INTO "Chapter" (number, "bookId") VALUES ($1,$2) RETURNING id`,
        [chNum, bookId]
      );
      const chId = rc.rows[0].id;

      let verses = ch.v || [];
      if (!Array.isArray(verses)) verses = [verses];

      for (const v of verses) {
        const vAttrs = v.$ || {};
        const vNum = parseInt(vAttrs.n || '1');
        const vText = (v._ || v || '').toString().trim();
        
        if (vText && vText !== '[object Object]') {
          await client.query(
            `INSERT INTO "Verse" (number, text, "chapterId") VALUES ($1,$2,$3)`,
            [vNum, vText, chId]
          );
          totalV++;
        }
      }
    }
    console.log(`Libro finalizado: ${bName}`);
  }

  console.log(`\n🎉 ¡CARGA COMPLETADA!`);
  console.log(`Versión: ${VERSION_SHORT}`);
  console.log(`Total versículos insertados: ${totalV}`);
  await client.end();
}

seed().catch(e => { 
  console.error('🔴 ERROR CRÍTICO:', e.message); 
  process.exit(1); 
});
