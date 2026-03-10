// seed-node.js - COMPLETO y FIJO para RV60 XML + Prisma
const { PrismaClient } = require('@prisma/client');
const xml2js = require('xml2js');

const prisma = new PrismaClient();
const VERSION_NAME = 'RV60';
const VERSION_FULL = 'Reina-Valera 1960';
const XML_URL = 'https://raw.githubusercontent.com/jmcots-svg/Bible_EEBV/gh-pages/data/RV60.xml';

async function seed() {
  console.log('🧹 Limpiando DB...');
  await prisma.verse.deleteMany({});
  await prisma.chapter.deleteMany({});
  await prisma.book.deleteMany({});
  await prisma.bibleVersion.deleteMany({});

  const version = await prisma.bibleVersion.create({
    data: { name: VERSION_NAME, fullName: VERSION_FULL }
  });
  console.log(`✅ Versión ${VERSION_FULL} creada (ID: ${version.id})`);

  console.log('📥 Descargando XML...');
  const response = await fetch(XML_URL);
  if (!response.ok) throw new Error(`Fetch fail: ${response.status}`);
  const xmlContent = await response.text();

  console.log('📋 Parseando XML...');
  const parser = new xml2js.Parser({
    explicitArray: false,
    trim: true,
    normalizeTags: true,
    normalize: true
  });
  const data = await parser.parseStringPromise(xmlContent);
  console.log('✅ Parse OK');

  const xmlbible = data.xmlbible || data.XMLBIBLE || data;
  let bibleBooks = xmlbible.biblebook || xmlbible.BibleBook || [];
  if (!Array.isArray(bibleBooks)) bibleBooks = [bibleBooks];

  console.log(`📚 Encontrados ${bibleBooks.length} libros`);

  const otBooks = ['GÉNESIS','ÉXODO','LEVÍTICO','NÚMEROS','DEUTERONOMIO','JOSUÉ','JUECES','RUT','1 SAMUEL','2 SAMUEL','1 REYES','2 REYES','1 CRÓNICAS','2 CRÓNICAS','ESDRAS','NEHEMÍAS','ESTER','JOB','SALMOS','PROVERBIOS','ECLESIASTÉS','SANTIAGO','ISAÍAS','JEREMÍAS','LAMENTACIONES','EZEQUIEL','DANIEL','OSEAS','JOEL','AMÓS','OBADÍAS','JONÁS','MICAÍAS','NAHÚM','HABACUC','SOFONÍAS','HAGEO','ZACARÍAS','MALAQUÍAS'];
  let bookOrder = 1;
  let totalVerses = 0;

  for (const bookNode of bibleBooks) {
    if (!bookNode) continue;
    const bookName = (bookNode.bookname || bookNode.BookName || bookNode._attributes?.n || 'DESCONOCIDO').toUpperCase().trim();
    const osisId = bookNode._attributes?.osisid || bookNode._attributes?.osisID || '';
    const testament = otBooks.includes(bookName) ? 'OT' : 'NT';
    const abbr = osisId.split('.')[0] || bookName.slice(0,3);

    const book = await prisma.book.create({
      data: {
        name: bookName,
        testament,
        abbr,
        order: bookOrder++,
        versionId: version.id
      }
    });
    console.log(`📖 Libro ${bookOrder-1}: ${bookName} (${testament})`);

    // Capítulos
    let chapters = bookNode.chapter || bookNode.Chapter || [];
    if (!Array.isArray(chapters)) chapters = [chapters];

    for (const chNode of chapters) {
      const chNum = parseInt(chNode._attributes?.osisid?.split('.')?.[1] || chNode.chapternumber || chNode.ChapterNumber || 1);
      const chapter = await prisma.chapter.create({
        data: { number: chNum, bookId: book.id }
      });

      // Versos
      let verses = chNode.verse || chNode.Verse || [];
      if (!Array.isArray(verses)) verses = [verses];

      let verseCount = 0;
      for (const vNode of verses) {
        const vNum = parseInt(vNode._attributes?.osisid?.split('.')?.[2] || vNode.versenumber || vNode.VerseNumber || 1);
        const vText = (vNode.versetext || vNode.VerseText || '').trim();
        if (vText && vText.length > 0) {
          await prisma.verse.create({
            data: { number: vNum, text: vText, chapterId: chapter.id }
          });
          verseCount++;
          totalVerses++;
        }
      }
      console.log(`  Cap. ${chNum}: ${verseCount} versos`);
    }
  }

  console.log(`🎉 ¡SEED TERMINADO! Libros: ${bookOrder-1} | Versos totales: ${totalVerses}`);
  process.exit(0);
}

seed().catch((e) => {
  console.error('💥 ERROR:', e);
  process.exit(1);
});
