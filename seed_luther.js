// seed_luther.js
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

const LANGUAGE = process.env.COMMENTARY_LANG || 'en';
const SOURCE_NAME = process.env.COMMENTARY_SOURCE || 'LUTHER';

// ============================================
// MAPEO: Nombre del libro → abreviatura OSIS y orden
// ============================================
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
  '2 Samuel': { abbr: '2Sam', order: 10 },
  '1 Kings': { abbr: '1Kgs', order: 11 },
  '2 Kings': { abbr: '2Kgs', order: 12 },
  '1 Chronicles': { abbr: '1Chr', order: 13 },
  '2 Chronicles': { abbr: '2Chr', order: 14 },
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
  '2 Corinthians': { abbr: '2Cor', order: 47 },
  'Galatians': { abbr: 'Gal', order: 48 },
  'Ephesians': { abbr: 'Eph', order: 49 },
  'Philippians': { abbr: 'Phil', order: 50 },
  'Colossians': { abbr: 'Col', order: 51 },
  '1 Thessalonians': { abbr: '1Thess', order: 52 },
  '2 Thessalonians': { abbr: '2Thess', order: 53 },
  '1 Timothy': { abbr: '1Tim', order: 54 },
  '2 Timothy': { abbr: '2Tim', order: 55 },
  'Titus': { abbr: 'Titus', order: 56 },
  'Philemon': { abbr: 'Phlm', order: 57 },
  'Hebrews': { abbr: 'Heb', order: 58 },
  'James': { abbr: 'Jas', order: 59 },
  '1 Peter': { abbr: '1Pet', order: 60 },
  '2 Peter': { abbr: '2Pet', order: 61 },
  '1 John': { abbr: '1John', order: 62 },
  '2 John': { abbr: '2John', order: 63 },
  '3 John': { abbr: '3John', order: 64 },
  'Jude': { abbr: 'Jude', order: 65 },
  'Revelation': { abbr: 'Rev', order: 66 },
  'Revelations': { abbr: 'Rev', order: 66 },
};

// ============================================
// Parsear la referencia del atributo "ref"
// Ejemplos: "Genesis 1:1", "Psalm 82:1", "Matthew 5:1"
// ============================================
function parseRef(ref) {
  if (!ref) return null;

  // Ignorar entradas especiales
  if (ref.includes('Heading') || ref.includes('0:0')) {
    return null;
  }

  // Patrón: "BookName Chapter:Verse" o "BookName Chapter:VerseStart-VerseEnd"
  const match = ref.match(/^(.+?)\s+(\d+):(\d+)(?:-(\d+))?$/);
  if (!match) return null;

  const [, bookName, chapter, verseStart, verseEnd] = match;
  const bookInfo = BOOK_MAP[bookName.trim()];

  if (!bookInfo) {
    return null;
  }

  return {
    bookAbbr: bookInfo.abbr,
    bookOrder: bookInfo.order,
    chapter: parseInt(chapter),
    verseStart: parseInt(verseStart),
    verseEnd: verseEnd ? parseInt(verseEnd) : parseInt(verseStart),
  };
}

// ============================================
// Decodificar entidades HTML y limpiar contenido
// ============================================
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

// ============================================
// Extraer texto plano del HTML decodificado
// ============================================
function extractPlainText(html) {
  if (!html) return '';
  
  // Decodificar entidades HTML
  let decoded = decodeHtmlEntities(html);
  
  // Remover tags HTML pero preservar espacios
  let text = decoded
    .replace(/<title[^>]*>.*?<\/title>/gi, '') // Remover títulos
    .replace(/<note[^>]*>.*?<\/note>/gi, ' ')  // Remover notas inline
    .replace(/<reference[^>]*>(.*?)<\/reference>/gi, '\$1') // Mantener texto de referencias
    .replace(/<[^>]*>/g, ' ')  // Remover todos los demás tags
    .replace(/\s+/g, ' ')      // Normalizar espacios
    .trim();

  return text;
}

// ============================================
// Parsear el XML simple de Luther
// ============================================
function parseLutherXML(xmlContent) {
  const entries = [];
  
  // Regex para capturar cada <entry ref="...">...</entry>
  const entryRegex = /<entry\s+ref="([^"]*)">([\s\S]*?)<\/entry>/g;
  
  let match;
  while ((match = entryRegex.exec(xmlContent)) !== null) {
    const ref = match[1];
    const content = match[2];
    
    // Parsear la referencia
    const parsedRef = parseRef(ref);
    if (!parsedRef) continue; // Saltar entradas 0:0 y headings
    
    // Extraer contenido limpio
    const plainText = extractPlainText(content);
    
    // Saltar entradas vacías o muy cortas
    if (!plainText || plainText.length < 50) continue;
    
    // Saltar entradas que son solo "No Commentary on these verses"
    if (plainText.includes('No Commentary on these verses')) continue;
    
    entries.push({
      ref,
      ...parsedRef,
      content: plainText,
      contentHtml: decodeHtmlEntities(content).trim(),
    });
  }
  
  return entries;
}

// ============================================
// Importar entradas en lotes
// ============================================
async function importEntries(entries, sourceId) {
  const BATCH = 100;
  let total = 0;
  let errors = 0;
  let skipped = 0;

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
      divId: `luther-${entry.bookAbbr}-${entry.chapter}-${entry.verseStart}-${i + idx}`,
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
  return { total, errors, skipped };
}

// ============================================
// MAIN
// ============================================
async function main() {
  console.log('══════════════════════════════════════');
  console.log('🚀 Importando Martin Luther\'s Commentary');
  console.log('══════════════════════════════════════');
  console.log(`   Idioma: ${LANGUAGE}`);
  console.log(`   Fuente: ${SOURCE_NAME}\n`);

  // 1. Crear o encontrar la fuente
  let source = await prisma.commentarySource.findUnique({
    where: { name: SOURCE_NAME }
  });

  if (!source) {
    source = await prisma.commentarySource.create({
      data: {
        name: SOURCE_NAME,
        fullName: "Martin Luther's Commentary",
        author: 'Martin Luther',
        volumes: 1,
        description: "Martin Luther's biblical commentaries including works on Genesis, Psalms, Sermon on the Mount, Galatians, and selections from the Church Postil",
        publishedYear: '1517-1546',
        isPublicDomain: true,
      }
    });
    console.log('✅ Fuente creada:', source.name);
  } else {
    console.log('ℹ️  Fuente existente:', source.name);
  }

  // 2. Leer y parsear el archivo XML
  const filepath = path.join(__dirname, 'data', 'Luther.xml');

  if (!fs.existsSync(filepath)) {
    console.error(`❌ Archivo no encontrado: ${filepath}`);
    process.exit(1);
  }

  console.log('\n📖 Leyendo Luther.xml...');
  const xmlContent = fs.readFileSync(filepath, 'utf-8');
  
  console.log('🔍 Parseando entradas...');
  const entries = parseLutherXML(xmlContent);
  
  console.log(`   ✅ Encontradas ${entries.length} entradas válidas\n`);

  // 3. Mostrar resumen por libro
  const bookSummary = {};
  for (const entry of entries) {
    if (!bookSummary[entry.bookAbbr]) {
      bookSummary[entry.bookAbbr] = 0;
    }
    bookSummary[entry.bookAbbr]++;
  }
  
  console.log('📚 Resumen por libro:');
  for (const [abbr, count] of Object.entries(bookSummary)) {
    console.log(`   ${abbr}: ${count} entradas`);
  }
  console.log('');

  // 4. Importar entradas
  if (entries.length > 0) {
    console.log('💾 Importando entradas a la base de datos...');
    const { total, errors } = await importEntries(entries, source.id);

    console.log('\n══════════════════════════════════════');
    console.log('🎉 ¡IMPORTACIÓN COMPLETADA!');
    console.log(`   Total entradas importadas: ${total}`);
    if (errors > 0) {
      console.log(`   ⚠️  Errores: ${errors}`);
    }
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
