// seed_calvin_es.js
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

const LANGUAGE = process.env.COMMENTARY_LANG || 'es';
// ⭐ Apuntamos a la fuente existente de Calvino
const SOURCE_NAME = process.env.COMMENTARY_SOURCE || 'CALVIN';

const BOOK_MAP = {
  'Genesis': { abbr: 'Gen', order: 1 },
  'Exodus': { abbr: 'Exod', order: 2 },
  'Leviticus': { abbr: 'Lev', order: 3 },
  'Numbers': { abbr: 'Num', order: 4 },
  'Deuteronomy': { abbr: 'Deut', order: 5 },
  'Joshua': { abbr: 'Josh', order: 6 },
  'Judges': { abbr: 'Judg', order: 7 },
  'Ruth': { abbr: 'Ruth', order: 8 },
  '1 Samuel': { abbr: '1Sam', order: 9 },
  'I Samuel': { abbr: '1Sam', order: 9 },
  '2 Samuel': { abbr: '2Sam', order: 10 },
  'II Samuel': { abbr: '2Sam', order: 10 },
  '1 Kings': { abbr: '1Kgs', order: 11 },
  'I Kings': { abbr: '1Kgs', order: 11 },
  '2 Kings': { abbr: '2Kgs', order: 12 },
  'II Kings': { abbr: '2Kgs', order: 12 },
  '1 Chronicles': { abbr: '1Chr', order: 13 },
  'I Chronicles': { abbr: '1Chr', order: 13 },
  '2 Chronicles': { abbr: '2Chr', order: 14 },
  'II Chronicles': { abbr: '2Chr', order: 14 },
  'Ezra': { abbr: 'Ezra', order: 15 },
  'Nehemiah': { abbr: 'Neh', order: 16 },
  'Esther': { abbr: 'Esth', order: 17 },
  'Job': { abbr: 'Job', order: 18 },
  'Psalms': { abbr: 'Ps', order: 19 },
  'Psalm': { abbr: 'Ps', order: 19 },
  'Proverbs': { abbr: 'Prov', order: 20 },
  'Ecclesiastes': { abbr: 'Eccl', order: 21 },
  'Song of Solomon': { abbr: 'Song', order: 22 },
  'Isaiah': { abbr: 'Isa', order: 23 },
  'Jeremiah': { abbr: 'Jer', order: 24 },
  'Lamentations': { abbr: 'Lam', order: 25 },
  'Ezekiel': { abbr: 'Ezek', order: 26 },
  'Daniel': { abbr: 'Dan', order: 27 },
  'Hosea': { abbr: 'Hos', order: 28 },
  'Joel': { abbr: 'Joel', order: 29 },
  'Amos': { abbr: 'Amos', order: 30 },
  'Obadiah': { abbr: 'Obad', order: 31 },
  'Jonah': { abbr: 'Jonah', order: 32 },
  'Micah': { abbr: 'Mic', order: 33 },
  'Nahum': { abbr: 'Nah', order: 34 },
  'Habakkuk': { abbr: 'Hab', order: 35 },
  'Zephaniah': { abbr: 'Zeph', order: 36 },
  'Haggai': { abbr: 'Hag', order: 37 },
  'Zechariah': { abbr: 'Zech', order: 38 },
  'Malachi': { abbr: 'Mal', order: 39 },
  'Matthew': { abbr: 'Matt', order: 40 },
  'Mark': { abbr: 'Mark', order: 41 },
  'Luke': { abbr: 'Luke', order: 42 },
  'John': { abbr: 'John', order: 43 },
  'Acts': { abbr: 'Acts', order: 44 },
  'Romans': { abbr: 'Rom', order: 45 },
  '1 Corinthians': { abbr: '1Cor', order: 46 },
  'I Corinthians': { abbr: '1Cor', order: 46 },
  '2 Corinthians': { abbr: '2Cor', order: 47 },
  'II Corinthians': { abbr: '2Cor', order: 47 },
  'Galatians': { abbr: 'Gal', order: 48 },
  'Ephesians': { abbr: 'Eph', order: 49 },
  'Philippians': { abbr: 'Phil', order: 50 },
  'Colossians': { abbr: 'Col', order: 51 },
  '1 Thessalonians': { abbr: '1Thess', order: 52 },
  'I Thessalonians': { abbr: '1Thess', order: 52 },
  '2 Thessalonians': { abbr: '2Thess', order: 53 },
  'II Thessalonians': { abbr: '2Thess', order: 53 },
  '1 Timothy': { abbr: '1Tim', order: 54 },
  'I Timothy': { abbr: '1Tim', order: 54 },
  '2 Timothy': { abbr: '2Tim', order: 55 },
  'II Timothy': { abbr: '2Tim', order: 55 },
  'Titus': { abbr: 'Titus', order: 56 },
  'Philemon': { abbr: 'Phlm', order: 57 },
  'Hebrews': { abbr: 'Heb', order: 58 },
  'James': { abbr: 'Jas', order: 59 },
  '1 Peter': { abbr: '1Pet', order: 60 },
  'I Peter': { abbr: '1Pet', order: 60 },
  '2 Peter': { abbr: '2Pet', order: 61 },
  'II Peter': { abbr: '2Pet', order: 61 },
  '1 John': { abbr: '1John', order: 62 },
  'I John': { abbr: '1John', order: 62 },
  '2 John': { abbr: '2John', order: 63 },
  'II John': { abbr: '2John', order: 63 },
  '3 John': { abbr: '3John', order: 64 },
  'III John': { abbr: '3John', order: 64 },
  'Jude': { abbr: 'Jude', order: 65 },
  'Revelation': { abbr: 'Rev', order: 66 },
  'Revelations': { abbr: 'Rev', order: 66 },
  'Revelation of John': { abbr: 'Rev', order: 66 },
};

function parseRef(ref) {
  if (!ref) return null;
  if (ref.includes('Heading') || ref.includes('0:0')) return null;

  const match = ref.match(/^(.+?)\s+(\d+):(\d+)(?:-(\d+))?$/);
  if (!match) return null;

  const [, bookName, chapter, verseStart, verseEnd] = match;
  const bookInfo = BOOK_MAP[bookName.trim()];
  if (!bookInfo) return null;

  return {
    bookAbbr: bookInfo.abbr,
    bookOrder: bookInfo.order,
    chapter: parseInt(chapter),
    verseStart: parseInt(verseStart),
    verseEnd: verseEnd ? parseInt(verseEnd) : parseInt(verseStart),
  };
}

function decodeHtmlEntities(text) {
  if (!text) return '';
  return text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
}

function extractPlainText(html) {
  if (!html) return '';
  let decoded = decodeHtmlEntities(html);
  let text = decoded
    .replace(/<title[^>]*>.*?<\/title>/gi, '')
    .replace(/<note[^>]*>.*?<\/note>/gi, ' ')
    .replace(/<reference[^>]*>(.*?)<\/reference>/gi, '\$1')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return text;
}

function parseCalvinESXML(xmlContent) {
  const entries = [];
  const unmappedRefs = new Set();

  const entryRegex = /<entry\s+ref="([^"]*)">([\s\S]*?)<\/entry>/g;

  let match;
  while ((match = entryRegex.exec(xmlContent)) !== null) {
    const ref = match[1];
    const content = match[2];

    const parsedRef = parseRef(ref);
    if (!parsedRef) {
      if (!ref.includes('Heading') && !ref.includes('0:0')) {
        unmappedRefs.add(ref);
      }
      continue;
    }

    const plainText = extractPlainText(content);
    if (!plainText || plainText.length < 50) continue;
    if (plainText.includes('No Commentary on these verses')) continue;

    entries.push({
      ref,
      ...parsedRef,
      content: plainText,
      contentHtml: decodeHtmlEntities(content).trim(),
    });
  }

  if (unmappedRefs.size > 0) {
    console.log('\n⚠️  Referencias no mapeadas (primeras 10):');
    [...unmappedRefs].slice(0, 10).forEach(r => console.log(`   - ${r}`));
  }

  return entries;
}

async function importEntries(entries, sourceId) {
  const BATCH = 100;
  let total = 0;
  let errors = 0;

  for (let i = 0; i < entries.length; i += BATCH) {
    const batch = entries.slice(i, i + BATCH);

    const dataToInsert = batch.map((entry, idx) => ({
      sourceId,
      language: LANGUAGE,
      bookAbbr: entry.bookAbbr,
      bookOrder: entry.bookOrder,
      chapter: entry.chapter,
      verseStart: entry.verseStart,
      verseEnd: entry.verseEnd,
      content: entry.content,
      contentHtml: entry.contentHtml,
      // ⭐ divId con prefijo "calvin-es-"
      divId: `calvin-es-${entry.bookAbbr}-${entry.chapter}-${entry.verseStart}-${i + idx}`,
      sectionType: 'commentary',
      volume: 1,
    }));

    try {
      await prisma.commentaryEntry.createMany({
        data: dataToInsert,
        skipDuplicates: true,
      });
      total += batch.length;
    } catch (e) {
      console.error(`\n   ❌ Error en batch ${i}-${i + BATCH}: ${e.message}`);
      errors += batch.length;
    }

    process.stdout.write(`\r   📥 Importadas: ${total}/${entries.length}`);
  }

  console.log('');
  return { total, errors };
}

async function main() {
  console.log('══════════════════════════════════════');
  console.log("🚀 Importando Comentario de Juan Calvino (Español)");
  console.log('══════════════════════════════════════');
  console.log(`   Idioma: ${LANGUAGE}`);
  console.log(`   Fuente: ${SOURCE_NAME}\n`);

  // 1. ⭐ Buscar fuente existente — NO creamos una nueva
  const source = await prisma.commentarySource.findUnique({
    where: { name: SOURCE_NAME },
  });

  if (!source) {
    console.error(`❌ Fuente "${SOURCE_NAME}" no encontrada en la DB.`);
    console.error('   Asegúrate de que el seed EN de Calvin ya fue ejecutado.');
    process.exit(1);
  }

  console.log(`✅ Fuente encontrada: ${source.name} (id: ${source.id})`);

  // 2. Leer y parsear el archivo XML
  const filepath = path.join(__dirname, 'data', 'Calvin_ES.xml');

  if (!fs.existsSync(filepath)) {
    console.error(`❌ Archivo no encontrado: ${filepath}`);
    process.exit(1);
  }

  console.log('📖 Leyendo Calvin_ES.xml...');
  const xmlContent = fs.readFileSync(filepath, 'utf-8');

  console.log('🔍 Parseando entradas...');
  const entries = parseCalvinESXML(xmlContent);

  console.log(`\n   ✅ Encontradas ${entries.length} entradas válidas\n`);

  // 3. Resumen por libro
  const bookSummary = {};
  for (const entry of entries) {
    bookSummary[entry.bookAbbr] = (bookSummary[entry.bookAbbr] || 0) + 1;
  }

  console.log('📚 Resumen por libro:');
  const sortedBooks = Object.entries(bookSummary).sort((a, b) => {
    const orderA = Object.values(BOOK_MAP).find(v => v.abbr === a[0])?.order || 99;
    const orderB = Object.values(BOOK_MAP).find(v => v.abbr === b[0])?.order || 99;
    return orderA - orderB;
  });
  for (const [abbr, count] of sortedBooks) {
    console.log(`   ${abbr}: ${count} entradas`);
  }
  console.log('');

  // 4. Importar
  if (entries.length > 0) {
    console.log('💾 Importando entradas a la base de datos...');
    const { total, errors } = await importEntries(entries, source.id);

    console.log('\n══════════════════════════════════════');
    console.log('🎉 ¡IMPORTACIÓN COMPLETADA!');
    console.log(`   Total entradas importadas: ${total}`);
    if (errors > 0) console.log(`   ⚠️  Errores: ${errors}`);
    console.log('══════════════════════════════════════\n');
  } else {
    console.log('⚠️  No se encontraron entradas para importar.');
  }
}

main()
  .catch(e => {
    console.error('💥 ERROR:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
