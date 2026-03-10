// seed.ts - OPTIMIZADO para tu RV60.xml (fetch directo + estructura exacta)
import { PrismaClient } from '@prisma/client';
import { xml2js } from 'xml-js';

const prisma = new PrismaClient();
const VERSION_NAME = 'RV60';
const VERSION_FULL = 'Reina-Valera 1960';
const XML_URL = 'https://jmcots-svg.github.io/Bible_EEBV/data/RV60.xml';

async function seed() {
  console.log('🧹 Limpiando DB...');
  await prisma.verse.deleteMany();
  await prisma.chapter.deleteMany();
  await prisma.book.deleteMany();
  await prisma.bibleVersion.deleteMany();

  // Crea versión
  const version = await prisma.bibleVersion.create({
    data: { name: VERSION_NAME, fullName: VERSION_FULL }
  });
  console.log(`✅ Versión ${VERSION_FULL} creada (ID: ${version.id})`);

  // Fetch y parse XML
  console.log('📥 Fetching XML...');
  const response = await fetch(XML_URL);
  const xmlContent = await response.text();
  const data = xml2js(xmlContent, { compact: true, trim: true });
  console.log('📋 XML parseado OK. Root:', Object.keys(data));

  const xmlbible = data.XMLBIBLE;
  const bibleBooks = xmlbible.BibleBook || [];
  console.log(`📚 ${bibleBooks.length} libros encontrados.`);

  let bookOrder = 1;
  let totalVerses = 0;
  const bookOT = ['GÉNESIS','ÉXODO','LEVÍTICO','NÚMEROS','DEUTERONOMIO','JOSUÉ','JUECES','RUT','1 SAMUEL','2 SAMUEL','1 REYES','2 REYES','1 CRÓNICAS','2 CRÓNICAS','ESDRAS','NEHEMÍAS','ESTER','JOB','SALA-MOS','PROVERBIOS','ECLESIASTÉS','CANTAR','ISAÍAS','JEREMÍAS','LAMENTACIONES','EZEQUIEL','DANIEL','OSEAS','JOEL','AMÓS','OBADÍAS','JONÁS','MICAÍAS','NAHÚM','HABACUC','SOFONÍAS','HAGEO','ZACARÍAS','MALAQUÍAS'];

  for (const bookNode of bibleBooks) {
    const bookOsis = bookNode._attributes?.osisID || '';
    const bookName = (bookNode.BookName?._text || bookOsis.split('.')[0]?.toUpperCase() || 'DESCONOCIDO').toUpperCase();
    const testament = bookOT.includes(bookName) ? 'OT' : 'NT';
    const bookAbbr = bookOsis.split('.')[0] || bookName.slice(0,3);

    const book = await prisma.book.create({
      data: {
        name: bookName,
        testament,
        abbr: bookAbbr,
        order: bookOrder++,
        versionId: version.id
      }
    });
    console.log(`📖 ${bookOrder-1}. ${bookName} (${testament}) - ID: ${book.id}`);

    const chapters = bookNode.Chapter || [];
    for (const chapterNode of chapters) {
      const chOsis = chapterNode._attributes?.osisID || '';
      const chNum = parseInt(chOsis.split('.')[1] || '1');
      const chapter = await prisma.chapter.create({
        data: { number: chNum, bookId: book.id }
      });

      const verses = chapterNode.Verse || [];
      for (const verseNode of verses) {
        const vOsis = verseNode._attributes?.osisID || '';
        const vNum = parseInt(vOsis.split('.')[2] || verseNode.VerseNumber?._text || '1');
        const vText = verseNode.VerseText?._text?.trim() || '';
        if (vText) {
          await prisma.verse.create({
            data: { number: vNum, text: vText, chapterId: chapter.id }
          });
          totalVerses++;
        }
      }
      console.log(`  Cap. ${chNum}: ${verses.length} versos`);
    }
  }

  console.log(`🎉 ¡SEED COMPLETADO! Total versos: ${totalVerses} | Libros: ${bookOrder-1}`);
  await prisma.$disconnect();
}

if (import.meta.main) {
  seed().catch((e) => {
    console.error('❌ ERROR:', e);
    Deno.exit(1);
  });
}