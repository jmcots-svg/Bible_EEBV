// seed_henry.js
const { PrismaClient } = require('@prisma/client');
const { XMLParser } = require('fast-xml-parser');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

const LANGUAGE = process.env.COMMENTARY_LANG || 'en';
const SOURCE_NAME = process.env.COMMENTARY_SOURCE || 'MHC';

// ============================================
// MAPEO: título del div1 del XML → datos del libro
// El XML usa el título COMPLETO en inglés
// ============================================
const BOOK_MAP = {
  // --- Antiguo Testamento ---
  'Genesis':         { abbr: 'Gen',   order: 1  },
  'Exodus':          { abbr: 'Exod',  order: 2  },
  'Leviticus':       { abbr: 'Lev',   order: 3  },
  'Numbers':         { abbr: 'Num',   order: 4  },
  'Deuteronomy':     { abbr: 'Deut',  order: 5  },
  'Joshua':          { abbr: 'Josh',  order: 6  },
  'Judges':          { abbr: 'Judg',  order: 7  },
  'Ruth':            { abbr: 'Ruth',  order: 8  },
  'First Samuel':    { abbr: '1Sam',  order: 9  },
  'Second Samuel':   { abbr: '2Sam',  order: 10 },
  'First Kings':     { abbr: '1Kgs',  order: 11 },
  'Second Kings':    { abbr: '2Kgs',  order: 12 },
  'First Chronicles':  { abbr: '1Chr', order: 13 },
  'Second Chronicles': { abbr: '2Chr', order: 14 },
  'Ezra':            { abbr: 'Ezra',  order: 15 },
  'Nehemiah':        { abbr: 'Neh',   order: 16 },
  'Esther':          { abbr: 'Esth',  order: 17 },
  'Job':             { abbr: 'Job',   order: 18 },
  'Psalms':          { abbr: 'Ps',    order: 19 },
  'Proverbs':        { abbr: 'Prov',  order: 20 },
  'Ecclesiastes':    { abbr: 'Eccl',  order: 21 },
  'Song of Solomon': { abbr: 'Song',  order: 22 },
  'Isaiah':          { abbr: 'Isa',   order: 23 },
  'Jeremiah':        { abbr: 'Jer',   order: 24 },
  'Lamentations':    { abbr: 'Lam',   order: 25 },
  'Ezekiel':         { abbr: 'Ezek',  order: 26 },
  'Daniel':          { abbr: 'Dan',   order: 27 },
  'Hosea':           { abbr: 'Hos',   order: 28 },
  'Joel':            { abbr: 'Joel',  order: 29 },
  'Amos':            { abbr: 'Amos',  order: 30 },
  'Obadiah':         { abbr: 'Obad',  order: 31 },
  'Jonah':           { abbr: 'Jonah', order: 32 },
  'Micah':           { abbr: 'Mic',   order: 33 },
  'Nahum':           { abbr: 'Nah',   order: 34 },
  'Habakkuk':        { abbr: 'Hab',   order: 35 },
  'Zephaniah':       { abbr: 'Zeph',  order: 36 },
  'Haggai':          { abbr: 'Hag',   order: 37 },
  'Zechariah':       { abbr: 'Zech',  order: 38 },
  'Malachi':         { abbr: 'Mal',   order: 39 },
  // --- Nuevo Testamento ---
  'Matthew':         { abbr: 'Matt',  order: 40 },
  'Mark':            { abbr: 'Mark',  order: 41 },
  'Luke':            { abbr: 'Luke',  order: 42 },
  'John':            { abbr: 'John',  order: 43 },
  'Acts':            { abbr: 'Acts',  order: 44 },
  'Romans':          { abbr: 'Rom',   order: 45 },
  'First Corinthians':  { abbr: '1Cor',  order: 46 },
  'Second Corinthians': { abbr: '2Cor',  order: 47 },
  'Galatians':       { abbr: 'Gal',   order: 48 },
  'Ephesians':       { abbr: 'Eph',   order: 49 },
  'Philippians':     { abbr: 'Phil',  order: 50 },
  'Colossians':      { abbr: 'Col',   order: 51 },
  'First Thessalonians':  { abbr: '1Thess', order: 52 },
  'Second Thessalonians': { abbr: '2Thess', order: 53 },
  'First Timothy':   { abbr: '1Tim',  order: 54 },
  'Second Timothy':  { abbr: '2Tim',  order: 55 },
  'Titus':           { abbr: 'Titus', order: 56 },
  'Philemon':        { abbr: 'Phlm',  order: 57 },
  'Hebrews':         { abbr: 'Heb',   order: 58 },
  'James':           { abbr: 'Jas',   order: 59 },
  'First Peter':     { abbr: '1Pet',  order: 60 },
  'Second Peter':    { abbr: '2Pet',  order: 61 },
  'First John':      { abbr: '1John', order: 62 },
  'Second John':     { abbr: '2John', order: 63 },
  'Third John':      { abbr: '3John', order: 64 },
  'Jude':            { abbr: 'Jude',  order: 65 },
  'Revelation':      { abbr: 'Rev',   order: 66 },
};

// Títulos a ignorar (no son libros bíblicos)
const SKIP_TITLES = ['Title Page', 'Preface', 'Indexes', 'Index'];

// ============================================
// Resolver el título del div1 al BOOK_MAP
// Maneja casos como "First Samuel", "Song of Solomon"
// y también formatos parciales del título
// ============================================
function resolveBookFromTitle(title) {
  if (!title) return null;

  // 1. Buscar coincidencia exacta
  if (BOOK_MAP[title]) return { key: title, ...BOOK_MAP[title] };

  // 2. Buscar si el título EMPIEZA con un nombre de libro conocido
  //    (para manejar títulos como "Genesis: Chapter 1" o "First Samuel to Second Samuel")
  for (const [bookName, info] of Object.entries(BOOK_MAP)) {
    if (title.startsWith(bookName)) {
      return { key: bookName, ...info };
    }
  }

  // 3. Para títulos que son solo la primera palabra (ej: "First", "Second", "Third", "Song")
  //    NO podemos resolverlo solo con la primera palabra, pero el XML
  //    de CCEL usa el título completo, así que esto no debería pasar.

  return null;
}

// ============================================
// Limpiar texto HTML → texto plano
// ============================================
function cleanText(text) {
  if (!text) return null;
  return String(text)
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim() || null;
}

// ============================================
// Extraer todo el texto de un nodo (recursivo)
// ============================================
function extractAllText(node) {
  if (!node) return '';
  if (typeof node === 'string') return node;
  if (typeof node === 'number') return String(node);

  let text = '';

  if (node['#text']) {
    text += node['#text'] + ' ';
  }

  // Recorrer todas las propiedades del nodo
  for (const [key, value] of Object.entries(node)) {
    if (key.startsWith('@_')) continue; // Ignorar atributos
    if (key === '#text') continue; // Ya procesado

    if (Array.isArray(value)) {
      for (const item of value) {
        text += extractAllText(item) + ' ';
      }
    } else if (typeof value === 'object' && value !== null) {
      text += extractAllText(value) + ' ';
    } else if (typeof value === 'string') {
      text += value + ' ';
    }
  }

  return text;
}

// ============================================
// Parsear referencia bíblica del scripRef
// ============================================
const SCRIPREF_BOOK_MAP = {
  'Gen': 1, 'Exod': 2, 'Lev': 3, 'Num': 4, 'Deut': 5,
  'Josh': 6, 'Judg': 7, 'Ruth': 8, '1Sam': 9, '2Sam': 10,
  '1Kgs': 11, '2Kgs': 12, '1Chr': 13, '2Chr': 14,
  'Ezra': 15, 'Neh': 16, 'Esth': 17, 'Job': 18, 'Ps': 19,
  'Prov': 20, 'Eccl': 21, 'Song': 22, 'Isa': 23, 'Jer': 24,
  'Lam': 25, 'Ezek': 26, 'Dan': 27, 'Hos': 28, 'Joel': 29,
  'Amos': 30, 'Obad': 31, 'Jonah': 32, 'Mic': 33, 'Nah': 34,
  'Hab': 35, 'Zeph': 36, 'Hag': 37, 'Zech': 38, 'Mal': 39,
  'Matt': 40, 'Mark': 41, 'Luke': 42, 'John': 43, 'Acts': 44,
  'Rom': 45, '1Cor': 46, '2Cor': 47, 'Gal': 48, 'Eph': 49,
  'Phil': 50, 'Col': 51, '1Thess': 52, '2Thess': 53,
  '1Tim': 54, '2Tim': 55, 'Titus': 56, 'Phlm': 57, 'Heb': 58,
  'Jas': 59, '1Pet': 60, '2Pet': 61, '1John': 62, '2John': 63,
  '3John': 64, 'Jude': 65, 'Rev': 66,
  // Variantes comunes en los XMLs de CCEL
  'Ex': 2, 'Ec': 21, 'Deu': 5, 'Mat': 40, 'Ro': 45,
};

function parseChapterFromDiv(div) {
  // Intentar extraer capítulo del atributo id o title del div2
  const id = div['@_id'] || '';
  const title = div['@_title'] || '';

  // Buscar patrón "Chapter X" en el título
  const chMatch = title.match(/Chapter\s+(\d+)/i);
  if (chMatch) return parseInt(chMatch[1]);

  // Buscar patrón en el id (ej: "Gen.1", "iv.ii" etc.)
  const idMatch = id.match(/\.(\d+)/);
  if (idMatch) return parseInt(idMatch[1]);

  return null;
}

function parseOsisRef(osisRef) {
  // Parsear "Bible:Gen.1.1" o "Bible:Eccl.12.13"
  if (!osisRef) return null;
  const match = osisRef.match(/Bible:(\w+)\.(\d+)\.(\d+)/);
  if (!match) return null;

  const [, book, chapter, verse] = match;
  const order = SCRIPREF_BOOK_MAP[book];
  if (!order) return null;

  return {
    bookAbbr: book,
    bookOrder: order,
    chapter: parseInt(chapter),
    verseStart: parseInt(verse),
    verseEnd: parseInt(verse),
  };
}

// ============================================
// Extraer entradas de un div (capítulo/sección)
// ============================================
function extractCommentaryEntries(div, sourceId, bookAbbr, bookOrder, volumeNum) {
  const entries = [];
  const chapter = parseChapterFromDiv(div);

  // Recopilar todos los párrafos (pueden estar en div.p, div.div.p, etc.)
  const paragraphs = collectParagraphs(div);

  for (const p of paragraphs) {
    if (!p) continue;

    const id = p['@_id'] || null;
    const fullText = extractAllText(p);
    const cleanContent = cleanText(fullText);

    if (!cleanContent || cleanContent.length < 50) continue;

    // Buscar la primera referencia bíblica para contexto
    let verseStart = null;
    let verseEnd = null;
    let entryChapter = chapter;

    const scripRefs = collectScripRefs(p);
    if (scripRefs.length > 0) {
      const firstRef = scripRefs[0];
      const parsed = parseOsisRef(firstRef['@_osisRef']);
      if (parsed && parsed.bookOrder === bookOrder) {
        entryChapter = parsed.chapter;
        verseStart = parsed.verseStart;
        verseEnd = parsed.verseEnd;
      }
    }

    entries.push({
      sourceId,
      language: LANGUAGE,
      bookAbbr,
      bookOrder,
      chapter: entryChapter || 1,
      verseStart,
      verseEnd,
      content: cleanContent,
      contentHtml: fullText.trim(),
      divId: id,
      sectionType: 'commentary',
      volume: volumeNum,
    });
  }

  return entries;
}

// Recopilar todos los <p> recursivamente
function collectParagraphs(node) {
  let paragraphs = [];
  if (!node || typeof node !== 'object') return paragraphs;

  // Párrafos directos
  if (node.p) {
    const pArr = Array.isArray(node.p) ? node.p : [node.p];
    paragraphs.push(...pArr);
  }

  // Buscar en div, div2, div3, etc.
  for (const key of ['div', 'div2', 'div3']) {
    if (node[key]) {
      const divArr = Array.isArray(node[key]) ? node[key] : [node[key]];
      for (const d of divArr) {
        paragraphs.push(...collectParagraphs(d));
      }
    }
  }

  return paragraphs;
}

// Recopilar todos los scripRef recursivamente
function collectScripRefs(node) {
  let refs = [];
  if (!node || typeof node !== 'object') return refs;

  if (node.scripRef) {
    const arr = Array.isArray(node.scripRef) ? node.scripRef : [node.scripRef];
    refs.push(...arr);
  }

  for (const [key, value] of Object.entries(node)) {
    if (key.startsWith('@_') || key === '#text' || key === 'scripRef') continue;
    if (Array.isArray(value)) {
      for (const item of value) {
        if (typeof item === 'object') refs.push(...collectScripRefs(item));
      }
    } else if (typeof value === 'object' && value !== null) {
      refs.push(...collectScripRefs(value));
    }
  }

  return refs;
}

// ============================================
// Parsear un archivo XML completo
// ============================================
async function parseCommentaryXML(filepath, sourceId, volumeNum) {
  console.log(`📖 Parseando volumen ${volumeNum}...`);

  const xml = fs.readFileSync(filepath, 'utf-8');

  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    textNodeName: '#text',
    isArray: (name) => ['div1', 'div2', 'div3', 'div', 'p', 'scripRef'].includes(name),
    removeNSPrefix: true,
    trimValues: true,
  });

  const result = parser.parse(xml);
  const body = result?.ThML?.['ThML.body'];

  if (!body) {
    console.error('   ❌ No se encontró ThML.body');
    return [];
  }

  const allEntries = [];
  const div1List = body.div1 || [];

  for (const div1 of div1List) {
    const title = (div1['@_title'] || '').trim();

    // Ignorar páginas de título, prefacios e índices
    if (SKIP_TITLES.some(skip => title.startsWith(skip))) {
      console.log(`   ⏭️  Saltando: "${title}"`);
      continue;
    }

    // Resolver el libro desde el título completo
    const bookInfo = resolveBookFromTitle(title);

    if (!bookInfo) {
      console.warn(`   ⚠️  Libro no mapeado: "${title}"`);
      continue;
    }

    console.log(`   📗 Procesando: ${title} → ${bookInfo.abbr} (orden ${bookInfo.order})`);

    // Procesar div2 (capítulos/secciones dentro del libro)
    const div2List = div1.div2 || [];
    let bookEntries = 0;

    for (const div2 of div2List) {
      const entries = extractCommentaryEntries(
        div2,
        sourceId,
        bookInfo.abbr,
        bookInfo.order,
        volumeNum
      );
      allEntries.push(...entries);
      bookEntries += entries.length;
    }

    // También procesar párrafos directos en div1 (introducciones)
    const directEntries = extractCommentaryEntries(
      div1,
      sourceId,
      bookInfo.abbr,
      bookInfo.order,
      volumeNum
    );
    allEntries.push(...directEntries);
    bookEntries += directEntries.length;

    console.log(`      → ${bookEntries} entradas`);
  }

  console.log(`   ✅ Total volumen ${volumeNum}: ${allEntries.length} entradas\n`);
  return allEntries;
}

// ============================================
// Importar entradas en lotes
// ============================================
async function importEntries(entries) {
  const BATCH = 100;
  let total = 0;
  let errors = 0;

  for (let i = 0; i < entries.length; i += BATCH) {
    const batch = entries.slice(i, i + BATCH);

    try {
      await prisma.commentaryEntry.createMany({
        data: batch,
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

// ============================================
// MAIN
// ============================================
async function main() {
  console.log('🚀 Importando Comentario Matthew Henry...');
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
        fullName: 'Commentary on the Whole Bible - Matthew Henry',
        author: 'Matthew Henry',
        volumes: 6,
        description: 'Complete commentary on the whole Bible by Matthew Henry (unabridged)',
        publishedYear: '1706-1721',
        isPublicDomain: true,
      }
    });
    console.log('✅ Fuente creada:', source.name);
  } else {
    console.log('ℹ️  Fuente existente:', source.name);
  }

  // 2. Procesar cada volumen
  const volumes = [
    { file: 'mhc1.xml', num: 1 },
    { file: 'mhc2.xml', num: 2 },
    { file: 'mhc3.xml', num: 3 },
    { file: 'mhc4.xml', num: 4 },
    { file: 'mhc5.xml', num: 5 },
    { file: 'mhc6.xml', num: 6 },
  ];

  let totalEntries = 0;
  let totalErrors = 0;

  for (const vol of volumes) {
    const filepath = path.join(__dirname, 'data', vol.file);

    if (!fs.existsSync(filepath)) {
      console.warn(`⚠️  Archivo no encontrado: ${filepath}`);
      continue;
    }

    const entries = await parseCommentaryXML(filepath, source.id, vol.num);

    if (entries.length > 0) {
      console.log('💾 Importando entradas...');
      const { total, errors } = await importEntries(entries);
      totalEntries += total;
      totalErrors += errors;
    }
  }

  console.log('\n══════════════════════════════════════');
  console.log('🎉 ¡IMPORTACIÓN COMPLETADA!');
  console.log(`   Total entradas importadas: ${totalEntries}`);
  if (totalErrors > 0) {
    console.log(`   ⚠️  Errores: ${totalErrors}`);
  }
  console.log('══════════════════════════════════════\n');
}

main()
  .catch(e => {
    console.error('💥 ERROR:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
