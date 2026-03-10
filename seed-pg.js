const { Client } = require('pg');
const xml2js = require('xml2js');
const fetch = require('node-fetch');

const DIRECT_URL = process.env.DIRECT_URL;
const VERSION_NAME = 'RV60';
const XML_URL = 'https://raw.githubusercontent.com/jmcots-svg/Bible_EEBV/gh-pages/data/RV60.xml';

async function seed() {
  const client = new Client({ connectionString: DIRECT_URL });
  await client.connect();
  console.log('✅ PG conectado');

  // CREATE TABLES if not exist
  await client.query(`
    CREATE TABLE IF NOT EXISTS "BibleVersion" (
      id SERIAL PRIMARY KEY,
      name VARCHAR(50) UNIQUE NOT NULL,
      fullName VARCHAR(100) NOT NULL,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
  await client.query(`
    CREATE TABLE IF NOT EXISTS "Book" (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      testament VARCHAR(10) NOT NULL,
      abbr VARCHAR(10),
      order INT NOT NULL,
      versionId INT REFERENCES "BibleVersion"(id),
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(name, versionId)
    );
  `);
  await client.query(`
    CREATE TABLE IF NOT EXISTS "Chapter" (
      id SERIAL PRIMARY KEY,
      number INT NOT NULL,
      bookId INT REFERENCES "Book"(id),
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(number, bookId)
    );
  `);
  await client.query(`
    CREATE TABLE IF NOT EXISTS "Verse" (
      id SERIAL PRIMARY KEY,
      number INT NOT NULL,
      text TEXT NOT NULL,
      chapterId INT REFERENCES "Chapter"(id),
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(number, chapterId)
    );
  `);
  console.log('✅ Tablas creadas/OK');

  // Limpia data
  await client.query('DELETE FROM "Verse";');
  await client.query('DELETE FROM "Chapter";');
  await client.query('DELETE FROM "Book";');
  await client.query('DELETE FROM "BibleVersion";');
  console.log('🧹 Limpieza OK');

  // Version
  const resVersion = await client.query(
    'INSERT INTO "BibleVersion" (name, fullName) VALUES (\$1, \$2) RETURNING id',
    [VERSION_NAME, 'Reina-Valera 1960']
  );
  const versionId = resVersion.rows[0].id;
  console.log(`✅ Versión ID: ${versionId}`);

  // XML
  const response = await fetch(XML_URL);
  const xmlContent = await response.text();
  const parser = new xml2js.Parser({ explicitArray: false, trim: true });
  const data = await parser.parseStringPromise(xmlContent);

  const xmlbible = data.xmlbible || data.XMLBIBLE;
  let bibleBooks = xmlbible.biblebook || xmlbible.BibleBook || [];
  if (!Array.isArray(bibleBooks)) bibleBooks = [bibleBooks];

  const otBooks = ['GÉNESIS','ÉXODO','LEVÍTICO','NÚMEROS','DEUTERONOMIO','JOSUÉ','JUECES','RUT','1SAMUEL','2SAMUEL','1REYES','2REYES','1CRÓNICAS','2CRÓNICAS','ESDRAS','NEHEMÍAS','ESTER','JOB','SALMOS','PROVERBIOS','ECLESIASTÉS','SANTIAGO','ISAÍAS','JEREMÍAS','LAMENTACIONES','EZEQUIEL','DANIEL','OSEAS','JOEL','AMÓS','OBADÍAS','JONÁS','MICAÍAS','NAHÚM','HABACUC','SOFONÍAS','AGEO','ZACARÍAS','MALAQUÍAS'];
  let bookOrder = 1;
  let totalVerses = 0;

  for (const bookNode of bibleBooks) {
    const bookName = (bookNode.bookname || bookNode.BookName || '').toUpperCase().trim();
    if (!bookName) continue;
    const testament = otBooks.includes(bookName) ? 'OT' : 'NT';
    const abbr = (bookNode._attributes?.osisid || bookName.slice(0,3)).split('.')[0];

    const resBook = await client.query(
      'INSERT INTO "Book" (name, testament, abbr, "order", "versionId") VALUES (\$1, \$2, \$3, \$4, \$5) RETURNING id',
      [bookName, testament, abbr, bookOrder++, versionId]
    );
    const bookId = resBook.rows[0].id;
    console.log(`📖 ${bookOrder-1}. ${bookName} ID: ${bookId}`);

    let chapters = bookNode.chapter || bookNode.Chapter || [];
    if (!Array.isArray(chapters)) chapters = [chapters];

    for (const chNode of chapters) {
      const chNum = parseInt(chNode._attributes?.osisid?.split('.')?.[1] || 1);
      const resCh = await client.query(
        'INSERT INTO "Chapter" ("number", "bookId") VALUES (\$1, \$2) RETURNING id',
        [chNum, bookId]
      );
      const chapterId = resCh.rows[0].id;

      let verses = chNode.verse || chNode.Verse || [];
      if (!Array.isArray(verses)) verses = [verses];

      let vCount = 0;
      for (const vNode of verses) {
        const vNum = parseInt(vNode._attributes?.osisid?.split('.')?.[2] || 1);
        const vText = (vNode.versetext || vNode.VerseText || '').trim();
        if (vText) {
          await client.query(
            'INSERT INTO "Verse" ("number", text, "chapterId") VALUES (\$1, \$2, \$3)',
            [vNum, vText, chapterId]
          );
          vCount++;
          totalVerses++;
        }
      }
      console.log(`  Cap ${chNum}: ${vCount} versos`);
    }
  }

  console.log(`🎉 SEED OK! Versos: ${totalVerses}`);
  await client.end();
  process.exit(0);
}

seed().catch(e => {
  console.error('ERROR:', e);
  process.exit(1);
});
