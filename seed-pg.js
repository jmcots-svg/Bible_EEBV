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
    normalizeTags: true 
  });

  const data = await parser.parseStringPromise(xml);
  const root = data.xmlbible;

  let books = root.biblebook || [];
  if (!Array.isArray(books)) books = [books];
  console.log('Libros:', books.length);

  let bookNum = 1;
  let totalV = 0;

  for (const b of books) {
    const bName = (b.bookname || '').toUpperCase().trim();
    if (!bName) continue;
    const testament = bookNum <= 39 ? 'OT' : 'NT';
    const attrs = b.$ || {};
    const abbr = (attrs.osisid || bName.slice(0,3)).split('.')[0];

    const rb = await client.query(
      `INSERT INTO "Book" (name, testament, abbr, "bookOrder", "versionId") VALUES (\$1,\$2,\$3,\$4,\$5) RETURNING id`,
      [bName, testament, abbr, bookNum++, versionId]
    );
    const bookId = rb.rows[0].id;
    console.log(bookNum-1 + '. ' + bName);

    let chapters = b.chapter || [];
    if (!Array.isArray(chapters)) chapters = [chapters];

    for (const ch of chapters) {
      const chAttrs = ch.$ || {};
      const osisId = chAttrs.osisid || '';
      const chNum = parseInt(osisId.split('.')[1] || '1');

      const rc = await client.query(
        `INSERT INTO "Chapter" (number, "bookId") VALUES (\$1,\$2) RETURNING id`,
        [chNum, bookId]
      );
      const chId = rc.rows[0].id;

      let verses = ch.verse || [];
      if (!Array.isArray(verses)) verses = [verses];

      for (const v of verses) {
        const vAttrs = v.$ || {};
        const vOsis = vAttrs.osisid || '';
        const vNum = parseInt(vOsis.split('.')[2] || '1');
        const vText = (v.versetext || '').trim();
        if (vText) {
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
