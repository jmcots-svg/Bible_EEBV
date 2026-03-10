const { Client } = require('pg');
const xml2js = require('xml2js');

const DIRECT_URL = process.env.DIRECT_URL;
const VERSION_NAME = 'RV60';
const XML_URL = 'https://raw.githubusercontent.com/jmcots-svg/Bible_EEBV/gh-pages/data/RV60.xml';

async function seed() {
  const client = new Client({ 
    connectionString: DIRECT_URL,
    ssl: { rejectUnauthorized: false }
  });
  await client.connect();
  console.log('✅ PG conectado');

  // DROP y CREATE TABLES
  await client.query(`DROP TABLE IF EXISTS "Verse" CASCADE;`);
  await client.query(`DROP TABLE IF EXISTS "Chapter" CASCADE;`);
  await client.query(`DROP TABLE IF EXISTS "Book" CASCADE;`);
  await client.query(`DROP TABLE IF EXISTS "BibleVersion" CASCADE;`);
  console.log('🧹 Tablas borradas');

  await client.query(`
    CREATE TABLE "BibleVersion" (
      id SERIAL PRIMARY KEY,
      name VARCHAR(50) UNIQUE NOT NULL,
      "fullName" VARCHAR(100) NOT NULL,
      "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await client.query(`
    CREATE TABLE "Book" (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      testament VARCHAR(10) NOT NULL,
      abbr VARCHAR(10),
      "bookOrder" INTEGER NOT NULL,
      "versionId" INTEGER REFERENCES "BibleVersion"(id),
      "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(name, "versionId")
    );
  `);

  await client.query(`
    CREATE TABLE "Chapter" (
      id SERIAL PRIMARY KEY,
      number INTEGER NOT NULL,
      "bookId" INTEGER REFERENCES "Book"(id),
      "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(number, "bookId")
    );
  `);

  await client.query(`
    CREATE TABLE "Verse" (
      id SERIAL PRIMARY KEY,
      number INTEGER NOT NULL,
      text TEXT NOT NULL,
      "chapterId" INTEGER REFERENCES "Chapter"(id),
      "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(number, "chapterId")
    );
  `);
  console.log('✅ Tablas creadas');

  // Version
  const resVersion = await client.query(
    'INSERT INTO "BibleVersion" (name, "fullName") VALUES (\$1, \$2) RETURNING id',
    [VERSION_NAME, 'Reina-Valera 1960']
  );
  const versionId = resVersion.rows[0].id;
  console.log(`✅ Versión ID: ${versionId}`);

  // XML fetch y parse
  console.log('📥 Descargando XML...');
  const response = await fetch(XML_URL);
  const xmlContent = await response.text();
  console.log('📋 Parseando XML...');
  const parser = new xml2js.Parser({ 
    explicitArray: false, 
    trim: true,
    normalizeTags: true
  });
  const data = await parser.parseStringPromise(xmlContent);

  const xmlbible = data.xmlbible || data.XMLBIBLE;
  let bibleBooks = xmlbible.biblebook || xmlbible.BibleBook || [];
  if (!Array.isArray(bibleBooks)) bibleBooks = [bibleBooks];
  console.log(`📚 ${bibleBooks.length} libros encontrados`);

  const otBooks = ['GÉNESIS','ÉXODO','LEVÍTICO','NÚMEROS','DEUTERONOMIO','JOSUÉ','JUECES','RUT','1SAMUEL','2SAMUEL','1REYES','2REYES','1CRÓNICAS','2CRÓNICAS','ESDRAS','NEHEMÍAS','ESTER','JOB','SALMOS','PROVERBIOS','ECLESIASTÉS','CANTARES','ISAÍAS','JEREMÍAS','LAMENTACIONES','EZEQUIEL','DANIEL','OSEAS','JOEL','AMÓS','OBADÍAS','JONÁS','MIQUEAS','NAHÚM','HABACUC','SOFONÍAS','HAGEO','ZACARÍAS','MALAQUÍAS'];

  let bookOrder = 1;
  let totalVerses = 0;

  for (const bookNode of bibleBooks) {
    const bookName = (bookNode.bookname || bookNode.BookName || '').toUpperCase().trim();
    if (!bookName) continue;

    const testament = bookOrder <= 39 ? 'OT' : 'NT';
    const attrs = bookNode.$ || bookNode._attributes || {};
    const osisId = attrs.osisid || attrs.osisID || '';
    const abbr = osisId.split('.')[0] || bookName.slice(0,3);

    const resBook = await client.query(
      'INSERT INTO "Book" (name, testament, abbr, "bookOrder", "versionId") VALUES (\$1, \$2, \$3, \$4, \$5) RETURNING id',
      [bookName, testament, abbr, bookOrder++, versionId]
    );
    const bookId = resBook.rows[0].id;
    console.log(`📖 ${bookOrder-1}. ${bookName} (${testament})`);

    let chapters = bookNode.chapter || bookNode.Chapter || [];
    if (!Array.isArray(chapters)) chapters = [chapters];

    for (const chNode of chapters) {
      const chAttrs = chNode.$ || chNode._attributes || {};
      const osisIdCh = chAttrs.osisid || chAttrs.osisID || '';
      const chNum = parseInt(osisIdCh.split('.')?.[1] || 1);

      const resCh = await client.query(
        'INSERT INTO "Chapter" (number, "bookId") VALUES (\$1, \$2) RETURNING id',
        [chNum, bookId]
      );
      const chapterId = resCh.rows[0].id;

      let verses = chNode.verse || chNode.Verse || [];
      if (!Array.isArray(verses)) verses = [verses];

      let vCount = 0;
      for (const vNode of verses) {
        const vAttrs = vNode.$ || vNode._attributes || {};
        const osisIdV = vAttrs.osisid || vAttrs.osisID || '';
        const vNum = parseInt(osisIdV.split('.')?.[2] || 1);
        const vText = (vNode.versetext || vNode.VerseText || '').trim();

        if (vText) {
          await client.query(
            'INSERT INTO "Verse" (number, text, "chapterId") VALUES (\$1, \$2, \$3)',
            [vNum, vText, chapterId]
          );
          vCount++;
          totalVerses++;
        }
      }
      console.log(`  Cap ${chNum}: ${vCount} versos`);
    }
  }

  console.log(`🎉 SEED OK! Libros: ${bookOrder-1} | Versos: ${totalVerses}`);
  await client.end();
  process.exit(0);
}

seed().catch(e => {
  console.error('💥 ERROR:', e.message);
  process.exit(1);
});
