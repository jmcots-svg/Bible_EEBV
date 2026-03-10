const { Client } = require('pg');
const xml2js = require('xml2js');

const client = new Client({ 
  connectionString: process.env.DIRECT_URL,
  ssl: { rejectUnauthorized: false }
});

const XMLURL = 'https://raw.githubusercontent.com/jmcots-svg/Bible_EEBV/main/data/RV60.xml';

async function seed() {
  await client.connect();
  console.log('Conectado');

  await client.query('DROP TABLE IF EXISTS "Verse" CASCADE');
  await client.query('DROP TABLE IF EXISTS "Chapter" CASCADE');
  await client.query('DROP TABLE IF EXISTS "Book" CASCADE');
  await client.query('DROP TABLE IF EXISTS "BibleVersion" CASCADE');
  console.log('Limpio');

  await client.query(`
    CREATE TABLE "BibleVersion" (
      id SERIAL PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      "fullName" TEXT NOT NULL
    )
  `);
  await client.query(`
    CREATE TABLE "Book" (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      testament TEXT NOT NULL,
      abbr TEXT,
      "bookOrder" INTEGER NOT NULL,
      "versionId" INTEGER REFERENCES "BibleVersion"(id)
    )
  `);
  await client.query(`
    CREATE TABLE "Chapter" (
      id SERIAL PRIMARY KEY,
      number INTEGER NOT NULL,
      "bookId" INTEGER REFERENCES "Book"(id)
    )
  `);
  await client.query(`
    CREATE TABLE "Verse" (
      id SERIAL PRIMARY KEY,
      number INTEGER NOT NULL,
      text TEXT NOT NULL,
      "chapterId" INTEGER REFERENCES "Chapter"(id)
    )
  `);
  console.log('Tablas OK');

  const rv = await client.query(
    `INSERT INTO "BibleVersion" (name, "fullName") VALUES ('RV60', 'Reina-Valera 1960') RETURNING id`
  );
  const versionId = rv.rows[0].id;
  console.log('Version ID:', versionId);

  console.log('Fetch XML...');
  const res = await fetch(XMLURL);
  console.log('HTTP Status:', res.status);
  if (!res.ok) throw new Error('HTTP ' + res.status);
  
  let xml = await res.text();
  xml = xml.replace(/^\uFEFF/, '').trimStart();
  console.log('XML chars:', xml.length, 'inicio:', JSON.stringify(xml.slice(0,50)));

  const parser = new xml2js.Parser({ 
    explicitArray: false, 
    trim: true, 
    normalizeTags: true  // Esto convierte las etiquetas a minúsculas
  });

  const data = await parser.parseStringPromise(xml);
  
  // ✅ CAMBIO: El elemento raíz es "bible", no "xmlbible"
  const root = data.bible;

  // ✅ CAMBIO: Los libros están en "b", no en "biblebook"
  let books = root.b || [];
  if (!Array.isArray(books)) books = [books];
  console.log('Libros:', books.length);

  let bookNum = 1;
  let totalV = 0;

  for (const b of books) {
    // ✅ CAMBIO: El nombre del libro está en el atributo "n"
    const attrs = b.$ || {};
    const bName = (attrs.n || '').trim();
    if (!bName) continue;
    
    const testament = bookNum <= 39 ? 'OT' : 'NT';
    const abbr = bName.slice(0, 3).toUpperCase();

    const rb = await client.query(
      `INSERT INTO "Book" (name, testament, abbr, "bookOrder", "versionId") VALUES (\$1,\$2,\$3,\$4,\$5) RETURNING id`,
      [bName, testament, abbr, bookNum++, versionId]
    );
    const bookId = rb.rows[0].id;
    console.log((bookNum - 1) + '. ' + bName);

    // ✅ CAMBIO: Los capítulos están en "c", no en "chapter"
    let chapters = b.c || [];
    if (!Array.isArray(chapters)) chapters = [chapters];

    for (const ch of chapters) {
      // ✅ CAMBIO: El número de capítulo está en el atributo "n"
      const chAttrs = ch.$ || {};
      const chNum = parseInt(chAttrs.n || '1');

      const rc = await client.query(
        `INSERT INTO "Chapter" (number, "bookId") VALUES (\$1,\$2) RETURNING id`,
        [chNum, bookId]
      );
      const chId = rc.rows[0].id;

      // ✅ CAMBIO: Los versículos están en "v", no en "verse"
      let verses = ch.v || [];
      if (!Array.isArray(verses)) verses = [verses];

      for (const v of verses) {
        // ✅ CAMBIO: El número de versículo está en el atributo "n"
        const vAttrs = v.$ || {};
        const vNum = parseInt(vAttrs.n || '1');
        
        // ✅ CAMBIO: El texto está directamente en "_", no en "versetext"
        const vText = (v._ || v || '').toString().trim();
        
        if (vText && vText !== '[object Object]') {
          await client.query(
            `INSERT INTO "Verse" (number, text, "chapterId") VALUES (\$1,\$2,\$3)`,
            [vNum, vText, chId]
          );
          totalV++;
        }
      }
    }
  }

  console.log('DONE! Versos:', totalV);
  await client.end();
}

seed().catch(e => { 
  console.error('ERROR:', e.message); 
  process.exit(1); 
});