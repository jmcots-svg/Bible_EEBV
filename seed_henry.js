// seed_henry.js
// Matthew Henry's Commentary - Volume 1 (Genesis - Deuteronomy)
// Formato XML: <entrada><cita>Genesis I:1-2</cita><comentario>...</comentario></entrada>

require('dotenv').config();
const { Client } = require('pg');
const { XMLParser } = require('fast-xml-parser');
const fs = require('fs');
const path = require('path');

// ============================================
// CONEXIÓN DB
// ============================================
const client = new Client({
  connectionString: process.env.DATABASE_URL.includes('sslmode')
    ? process.env.DATABASE_URL
    : `${process.env.DATABASE_URL}?sslmode=require`,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000,
});

// ============================================
// CONFIGURACIÓN
// ============================================
const XML_PATH = path.join(__dirname, 'data', 'MHC', 'mhc1.xml');
const SOURCE_NAME = 'MHC';
const LANGUAGE = 'en';
const VOLUME = 1;

// ============================================
// NÚMEROS ROMANOS -> ARÁBIGOS
// ============================================
function romanToInt(roman) {
  const map = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
  let result = 0;
  const str = roman.toUpperCase();
  for (let i = 0; i < str.length; i++) {
    const current = map[str[i]];
    const next = map[str[i + 1]];
    if (!current) throw new Error(`Carácter romano inválido: "${str[i]}" en "${roman}"`);
    result += (next && current < next) ? -current : current;
  }
  return result;
}

// ============================================
// PARSEAR CITA BÍBLICA
// Formato: "Genesis I:1-2" | "Genesis I:9" | "Genesis L:1-6"
// ============================================
function parseCitation(citation) {
  const match = citation.trim().match(/^([A-Za-z]+)\s+([IVXLCDM]+):(\d+)(?:-(\d+))?$/);
  if (!match) throw new Error(`Formato de cita inválido: "${citation}"`);

  return {
    bookName:   match[1],
    chapter:    romanToInt(match[2]),
    verseStart: parseInt(match[3], 10),
    verseEnd:   match[4] ? parseInt(match[4], 10) : parseInt(match[3], 10),
  };
}

// ============================================
// LIMPIAR CONTENIDO HTML
// Elimina tags self-closing: <i />, <b />, <property />, <scripRef />, <pb />, etc.
// ============================================
function cleanContent(raw) {
  if (!raw) return '';
  let text = String(raw);

  // Eliminar tags self-closing vacíos (artefactos del XML origen)
  text = text.replace(/<[a-zA-Z]+\s*\/>/g, '');

  // Eliminar tags de apertura/cierre restantes
  text = text.replace(/<\/?[a-zA-Z][^>]*>/g, '');

  // Limpiar espacios múltiples y saltos de línea
  text = text.replace(/\s+/g, ' ').trim();

  return text;
}

// ============================================
// MAPA: Nombre largo del libro -> osisAbbr
// (tal como aparece en el XML del MHC)
// ============================================
const BOOK_NAME_TO_OSIS = {
  Genesis:       'Gen',
  Exodus:        'Exod',
  Leviticus:     'Lev',
  Numbers:       'Num',
  Deuteronomy:   'Deut',
  Joshua:        'Josh',
  Judges:        'Judg',
  Ruth:          'Ruth',
  Samuel:        '1Sam',
  Kings:         '1Kgs',
  Chronicles:    '1Chr',
  Ezra:          'Ezra',
  Nehemiah:      'Neh',
  Esther:        'Esth',
  Job:           'Job',
  Psalms:        'Ps',
  Psalm:         'Ps',
  Proverbs:      'Prov',
  Ecclesiastes:  'Eccl',
  Song:          'Song',
  Isaiah:        'Isa',
  Jeremiah:      'Jer',
  Lamentations:  'Lam',
  Ezekiel:       'Ezek',
  Daniel:        'Dan',
  Hosea:         'Hos',
  Joel:          'Joel',
  Amos:          'Amos',
  Obadiah:       'Obad',
  Jonah:         'Jonah',
  Micah:         'Mic',
  Nahum:         'Nah',
  Habakkuk:      'Hab',
  Zephaniah:     'Zeph',
  Haggai:        'Hag',
  Zechariah:     'Zech',
  Malachi:       'Mal',
  Matthew:       'Matt',
  Mark:          'Mark',
  Luke:          'Luke',
  John:          'John',
  Acts:          'Acts',
  Romans:        'Rom',
  Galatians:     'Gal',
  Ephesians:     'Eph',
  Philippians:   'Phil',
  Colossians:    'Col',
  Philemon:      'Phlm',
  Hebrews:       'Heb',
  James:         'Jas',
  Jude:          'Jude',
  Revelation:    'Rev',
};

// ============================================
// MAIN
// ============================================
async function seed() {
  await client.connect();
  console.log('✅ Conectado a la DB');

  // 1. Verificar XML
  console.log(`🔍 Buscando XML en: ${XML_PATH}`);
  if (!fs.existsSync(XML_PATH)) {
    console.error(`❌ XML no encontrado: ${XML_PATH}`);
    process.exit(1);
  }
  console.log('✅ XML encontrado');

  // 2. Cargar BookAbbreviation desde DB -> mapa osisAbbr -> bookOrder
  const baResult = await client.query(
    `SELECT "osisAbbr", "bookOrder" FROM "BookAbbreviation" WHERE language = \$1`,
    [LANGUAGE]
  );
  const osisToOrder = {};
  for (const row of baResult.rows) {
    osisToOrder[row.osisAbbr] = row.bookOrder;
  }
  console.log(`📚 BookAbbreviations cargadas: ${Object.keys(osisToOrder).length} entradas`);

  // 3. Asegurar CommentarySource MHC
  let sourceId;
  const sourceCheck = await client.query(
    `SELECT id FROM "CommentarySource" WHERE name = \$1`,
    [SOURCE_NAME]
  );
  if (sourceCheck.rows.length > 0) {
    sourceId = sourceCheck.rows[0].id;
    console.log(`📖 CommentarySource existente: ${SOURCE_NAME} (id=${sourceId})`);
  } else {
    const sourceInsert = await client.query(
      `INSERT INTO "CommentarySource" 
        (name, "fullName", author, description, "publishedYear", "isPublicDomain", volumes)
       VALUES (\$1, \$2, \$3, \$4, \$5, \$6, \$7)
       RETURNING id`,
      [
        SOURCE_NAME,
        "Matthew Henry's Commentary on the Whole Bible",
        'Matthew Henry',
        "Matthew Henry's classic verse-by-verse commentary on the entire Bible",
        '1706-1714',
        true,
        6,
      ]
    );
    sourceId = sourceInsert.rows[0].id;
    console.log(`📖 CommentarySource creado: ${SOURCE_NAME} (id=${sourceId})`);
  }

  // 4. Parsear XML
  const xmlContent = fs.readFileSync(XML_PATH, 'utf-8');
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '',
    parseTagValue: true,
    trimValues: true,
    htmlEntities: true,      
    processEntities: true,   
    entityExpansionLimit: 10000 
  });
  const parsed = parser.parse(xmlContent);

  // fast-xml-parser: array si hay múltiples entradas, objeto si solo hay una
  const rawEntries = parsed?.root?.entrada;
  const entries = Array.isArray(rawEntries) ? rawEntries : [rawEntries];
  console.log(`📄 Entradas en XML: ${entries.length}`);

  // 5. Procesar e insertar
  let inserted = 0;
  let updated  = 0;
  let skipped  = 0;
  let errors   = 0;

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];

    if (!entry?.cita || !entry?.comentario) {
      console.warn(`⚠️  Entrada ${i + 1}: cita o comentario vacío, saltando...`);
      skipped++;
      continue;
    }

    const citationRaw = String(entry.cita).trim();
    const commentRaw  = String(entry.comentario);

    try {
      const { bookName, chapter, verseStart, verseEnd } = parseCitation(citationRaw);

      // Resolver osisAbbr
      const osisAbbr = BOOK_NAME_TO_OSIS[bookName];
      if (!osisAbbr) {
        console.warn(`⚠️  Libro desconocido: "${bookName}" (cita: "${citationRaw}")`);
        skipped++;
        continue;
      }

      // Resolver bookOrder
      const bookOrder = osisToOrder[osisAbbr];
      if (!bookOrder) {
        console.warn(`⚠️  Sin bookOrder para "${osisAbbr}" (cita: "${citationRaw}")`);
        skipped++;
        continue;
      }

      // Limpiar contenido
      const content = cleanContent(commentRaw);
      if (!content || content.length < 10) {
        console.warn(`⚠️  Contenido muy corto en "${citationRaw}", saltando...`);
        skipped++;
        continue;
      }

      // Título: primeras 80 chars
      const title = content.length > 80
        ? content.substring(0, 80).trimEnd() + '...'
        : content;

      // divId único
      const divId = `mhc-en-${osisAbbr}-${chapter}-${verseStart}-${verseEnd}`.toLowerCase();

      // Upsert usando INSERT ... ON CONFLICT
      const result = await client.query(
        `INSERT INTO "CommentaryEntry"
          ("sourceId", language, "bookAbbr", "bookOrder", chapter, 
           "verseStart", "verseEnd", title, content, "contentHtml", 
           "divId", "sectionType", volume)
         VALUES (\$1,\$2,\$3,\$4,\$5,\$6,\$7,\$8,\$9,\$10,\$11,\$12,\$13)
         ON CONFLICT ("sourceId", language, "divId")
         DO UPDATE SET
           content     = EXCLUDED.content,
           "contentHtml" = EXCLUDED."contentHtml",
           title       = EXCLUDED.title,
           "bookAbbr"  = EXCLUDED."bookAbbr",
           "bookOrder" = EXCLUDED."bookOrder",
           chapter     = EXCLUDED.chapter,
           "verseStart"= EXCLUDED."verseStart",
           "verseEnd"  = EXCLUDED."verseEnd"
         RETURNING id, (xmax = 0) AS inserted`,
        [
          sourceId,
          LANGUAGE,
          osisAbbr,
          bookOrder,
          chapter,
          verseStart,
          verseEnd,
          title,
          content,
          content,   // contentHtml = content limpio (sin HTML de momento)
          divId,
          'commentary',
          VOLUME,
        ]
      );

      if (result.rows[0].inserted) {
        inserted++;
      } else {
        updated++;
      }

      if ((inserted + updated) % 100 === 0) {
        console.log(`   ⏳ Procesadas ${inserted + updated} entradas (${inserted} nuevas, ${updated} actualizadas)...`);
      }

    } catch (err) {
      console.error(`❌ Error en entrada ${i + 1} ("${citationRaw}"): ${err.message}`);
      errors++;
    }
  }

  // 6. Resumen
  console.log('\n========================================');
  console.log('✅ CARGA MHC COMPLETADA');
  console.log(`   Total XML:    ${entries.length}`);
  console.log(`   Insertadas:   ${inserted}`);
  console.log(`   Actualizadas: ${updated}`);
  console.log(`   Saltadas:     ${skipped}`);
  console.log(`   Errores:      ${errors}`);
  console.log('========================================\n');

  await client.end();
}

seed().catch(e => {
  console.error('💥 Error fatal:', e);
  process.exit(1);
});
