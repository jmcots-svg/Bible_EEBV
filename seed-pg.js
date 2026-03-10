const { Client } = require('pg');
const xml2js = require('xml2js');

const client = new Client({ 
  // Intentamos añadir el parámetro sslmode directamente si no lo tiene la URL
  connectionString: process.env.DIRECT_URL.includes('sslmode') 
    ? process.env.DIRECT_URL 
    : `${process.env.DIRECT_URL}?sslmode=require`,
  ssl: {
    rejectUnauthorized: false
  },
  connectionTimeoutMillis: 10000, 
});

// CONFIGURACIÓN PARA LBLA
const XMLURL = 'https://jmcots-svg.github.io/Bible_EEBV/data/SpanishLBLABible.xml'; 
const VERSION_SHORT = 'LBLA';
const VERSION_FULL = 'La Biblia de las Américas 1997';

// Mapeo de nombres de libros por número (Basado en el canon estándar)
const bookNames = {
  1: "Génesis", 2: "Éxodo", 3: "Levítico", 4: "Números", 5: "Deuteronomio",
  6: "Josué", 7: "Jueces", 8: "Rut", 9: "1 Samuel", 10: "2 Samuel",
  11: "1 Reyes", 12: "2 Reyes", 13: "1 Crónicas", 14: "2 Crónicas", 15: "Esdras",
  16: "Nehemías", 17: "Ester", 18: "Job", 19: "Salmos", 20: "Proverbios",
  21: "Eclesiastés", 22: "Cantares", 23: "Isaías", 24: "Jeremías", 25: "Lamentaciones",
  26: "Ezequiel", 27: "Daniel", 28: "Oseas", 29: "Joel", 30: "Amós",
  31: "Abdías", 32: "Jonás", 33: "Miqueas", 34: "Nahúm", 35: "Habacuc",
  36: "Sofonías", 37: "Hageo", 38: "Zacarías", 39: "Malaquías", 40: "Mateo",
  41: "Marcos", 42: "Lucas", 43: "Juan", 44: "Hechos", 45: "Romanos",
  46: "1 Corintios", 47: "2 Corintios", 48: "Gálatas", 49: "Efesios", 50: "Filipenses",
  51: "Colosenses", 52: "1 Tesalonicenses", 53: "2 Tesalonicenses", 54: "1 Timoteo", 55: "2 Timoteo",
  56: "Tito", 57: "Filemón", 58: "Hebreos", 59: "Santiago", 60: "1 Pedro",
  61: "2 Pedro", 62: "1 Juan", 63: "2 Juan", 64: "3 Juan", 65: "Judas", 66: "Apocalipsis"
};

async function seed() {
  await client.connect();
  console.log('Conectado a la DB para cargar LBLA');

  // Verificar si la versión ya existe para no duplicar
  const checkVersion = await client.query('SELECT id FROM "BibleVersion" WHERE name = $1', [VERSION_SHORT]);
  if (checkVersion.rows.length > 0) {
    console.error(`❌ La versión ${VERSION_SHORT} ya existe. Abortando.`);
    await client.end();
    return;
  }

  // Insertar la versión
  const rv = await client.query(
    `INSERT INTO "BibleVersion" (name, "fullName") VALUES ($1, $2) RETURNING id`,
    [VERSION_SHORT, VERSION_FULL]
  );
  const versionId = rv.rows[0].id;

  console.log(`Descargando y parseando XML de LBLA...`);
  const res = await fetch(XMLURL);
  let xml = await res.text();
  xml = xml.replace(/^\uFEFF/, '').trimStart();

  const parser = new xml2js.Parser({ 
    explicitArray: false, 
    trim: true,
    mergeAttrs: true 
  });
  
  const data = await parser.parseStringPromise(xml);
  
  // Navegamos por: testament -> book -> chapter -> verse
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

      console.log(`Cargando: ${bName}...`);

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

        let verses = ch.verse || [];
        if (!Array.isArray(verses)) verses = [verses];

        for (const v of verses) {
          const vNum = parseInt(v.number);
          // En xml2js con mergeAttrs, si hay texto y atributos, el texto va a "_" o es el valor directo si es string
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
    }
  }

  console.log(`\n🎉 ¡LBLA Cargada con éxito!`);
  console.log(`Total versículos insertados: ${totalV}`);
  await client.end();
}

seed().catch(e => { 
  console.error('Error durante el seed:', e); 
  process.exit(1); 
});
