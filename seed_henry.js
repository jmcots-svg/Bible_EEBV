// seed_henry.js
// Matthew Henry's Commentary - 6 volúmenes completos
// Formato XML nuevo:
//   <cita>Ge 1</cita>          -> capítulo completo (introducción)
//   <cita>Ge 1:1-2</cita>      -> rango de versículos
//   <cita>Ge 1:1</cita>        -> versículo único
//   <scripRef passage="Ge 1:1" />  -> referencias cruzadas inline

require('dotenv').config();
const { Client } = require('pg');
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
const MHC_DIR    = path.join(__dirname, 'MHC');
const MHC_FILES  = ['mhc1.xml','mhc2.xml','mhc3.xml','mhc4.xml','mhc5.xml','mhc6.xml'];
const SOURCE_NAME = 'MHC';
const LANGUAGE    = 'en';

// ============================================
// MAPA: abreviatura XML -> osisAbbr
// ============================================
const XML_ABBR_TO_OSIS = {
  'Ge':   'Gen',
  'Ex':   'Exod',
  'Le':   'Lev',
  'Nu':   'Num',
  'De':   'Deut',
  'Jos':  'Josh',
  'Jud':  'Judg',
  'Ru':   'Ruth',
  '1Sa':  '1Sam',
  '2Sa':  '2Sam',
  '1Ki':  '1Kgs',
  '2Ki':  '2Kgs',
  '1Ch':  '1Chr',
  '2Ch':  '2Chr',
  'Ezr':  'Ezra',
  'Ne':   'Neh',
  'Es':   'Esth',
  'Job':  'Job',
  'Ps':   'Ps',
  'Pr':   'Prov',
  'Ec':   'Eccl',
  'So':   'Song',
  'Isa':  'Isa',
  'Jer':  'Jer',
  'La':   'Lam',
  'Eze':  'Ezek',
  'Da':   'Dan',
  'Ho':   'Hos',
  'Joe':  'Joel',
  'Am':   'Amos',
  'Ob':   'Obad',
  'Jon':  'Jonah',
  'Mic':  'Mic',
  'Na':   'Nah',
  'Hab':  'Hab',
  'Zep':  'Zeph',
  'Hag':  'Hag',
  'Zec':  'Zech',
  'Mal':  'Mal',
  'Mt':   'Matt',
  'Mr':   'Mark',
  'Lu':   'Luke',
  'Joh':  'John',
  'Ac':   'Acts',
  'Ro':   'Rom',
  '1Co':  '1Cor',
  '2Co':  '2Cor',
  'Ga':   'Gal',
  'Eph':  'Eph',
  'Php':  'Phil',
  'Col':  'Col',
  '1Th':  '1Thess',
  '2Th':  '2Thess',
  '1Ti':  '1Tim',
  '2Ti':  '2Tim',
  'Tit':  'Titus',
  'Phm':  'Phlm',
  'Heb':  'Heb',
  'Jas':  'Jas',
  '1Pe':  '1Pet',
  '2Pe':  '2Pet',
  '1Jo':  '1John',
  '2Jo':  '2John',
  '3Jo':  '3John',
  'Jude': 'Jude',
  'Re':   'Rev',
};

// ============================================
// EXTRAER ENTRADAS DEL XML CON REGEX
// Evita el problema de contenido mixto de fast-xml-parser
// ============================================
function extractEntries(xmlContent) {
  const entries = [];
  const entryRegex = /<entrada>([\s\S]*?)<\/entrada>/g;
  let entryMatch;

  while ((entryMatch = entryRegex.exec(xmlContent)) !== null) {
    const entryContent = entryMatch[1];

    const citaMatch = entryContent.match(/<cita>([\s\S]*?)<\/cita>/);
    if (!citaMatch) continue;
    const cita = citaMatch[1].trim();

    const comentarioMatch = entryContent.match(/<comentario>([\s\S]*?)<\/comentario>/);
    if (!comentarioMatch) continue;
    const comentario = comentarioMatch[1];

    entries.push({ cita, comentario });
  }

  return entries;
}

// ============================================
// PARSEAR CITA BÍBLICA
// ============================================
function parseCitation(citation) {
  const str = citation.trim();

  // Con versículo: "Ge 1:1" o "Ge 1:1-2"
  const matchVerse = str.match(/^(\S+)\s+(\d+):(\d+)(?:-(\d+))?$/);
  if (matchVerse) {
    return {
      xmlAbbr:    matchVerse[1],
      chapter:    parseInt(matchVerse[2], 10),
      verseStart: parseInt(matchVerse[3], 10),
      verseEnd:   matchVerse[4] ? parseInt(matchVerse[4], 10) : parseInt(matchVerse[3], 10),
    };
  }

  // Solo capítulo: "Ge 1"
  const matchChap = str.match(/^(\S+)\s+(\d+)$/);
  if (matchChap) {
    return {
      xmlAbbr:    matchChap[1],
      chapter:    parseInt(matchChap[2], 10),
      verseStart: null,
      verseEnd:   null,
    };
  }

  throw new Error(`Formato de cita inválido: "${citation}"`);
}

// ============================================
// PARSEAR REFERENCIAS CRUZADAS
// Entrada: "Joh 1:3,10,Eph 3:9,Col 1:16,Heb 1:2"
// ============================================
function parseScripRefs(passage) {
  if (!passage) return [];

  const refs = [];
  let lastAbbr = null;
  let lastChapter = null;

  const parts = passage.split(',').map(p => p.trim()).filter(Boolean);

  for (const part of parts) {
    const withBook  = part.match(/^([A-Z][a-z0-9]*)\s+(\d+):(\d+)(?:-(\d+))?$/);
    const chapVerse = part.match(/^(\d+):(\d+)(?:-(\d+))?$/);
    const verseOnly = part.match(/^(\d+)$/);

    if (withBook) {
      lastAbbr    = withBook[1];
      lastChapter = parseInt(withBook[2], 10);
      refs.push({
        xmlAbbr:    withBook[1],
        chapter:    lastChapter,
        verseStart: parseInt(withBook[3], 10),
        verseEnd:   withBook[4] ? parseInt(withBook[4], 10) : parseInt(withBook[3], 10),
      });
    } else if (chapVerse && lastAbbr) {
      lastChapter = parseInt(chapVerse[1], 10);
      refs.push({
        xmlAbbr:    lastAbbr,
        chapter:    lastChapter,
        verseStart: parseInt(chapVerse[2], 10),
        verseEnd:   chapVerse[3] ? parseInt(chapVerse[3], 10) : parseInt(chapVerse[2], 10),
      });
    } else if (verseOnly && lastAbbr && lastChapter) {
      refs.push({
        xmlAbbr:    lastAbbr,
        chapter:    lastChapter,
        verseStart: parseInt(verseOnly[1], 10),
        verseEnd:   parseInt(verseOnly[1], 10),
      });
    }
  }

  return refs;
}

// ============================================
// CONVERTIR CONTENIDO A HTML CON LINKS
// ============================================
function contentToHtml(raw, osisToOrder) {
  if (!raw) return '';
  let html = String(raw);

  // Reemplazar <scripRef passage="..." /> por enlaces clicables
  html = html.replace(
    /<scripRef passage="([^"]+)"\s*\/>/g,
    (match, passage) => {
      const refs = parseScripRefs(passage);
      if (refs.length === 0) return `<span class="ref-unknown">${passage}</span>`;

      const links = refs.map(ref => {
        const osisAbbr  = XML_ABBR_TO_OSIS[ref.xmlAbbr];
        if (!osisAbbr) return `<span class="ref-unknown">${ref.xmlAbbr} ${ref.chapter}:${ref.verseStart}</span>`;

        const bookOrder = osisToOrder[osisAbbr] || '';
        const verseLabel = ref.verseEnd !== ref.verseStart
          ? `${ref.verseStart}-${ref.verseEnd}`
          : `${ref.verseStart}`;
        const label = `${ref.xmlAbbr} ${ref.chapter}:${verseLabel}`;

        return `<a class="scripture-ref"` +
               ` data-book="${osisAbbr}"` +
               ` data-book-order="${bookOrder}"` +
               ` data-chapter="${ref.chapter}"` +
               ` data-verse-start="${ref.verseStart}"` +
               ` data-verse-end="${ref.verseEnd}"` +
               ` href="#">${label}</a>`;
      }).join(', ');

      return `<span class="scripture-refs">${links}</span>`;
    }
  );

  // Eliminar tags decorativos sin contenido
  html = html.replace(/<[a-zA-Z]+\s*\/>/g, '');

  // Eliminar <i> y </i> pero conservar el texto entre ellos
  html = html.replace(/<\/?[a-zA-Z][^>]*>/g, '');

  // Convertir saltos de línea dobles en párrafos
  html = html.split(/\n\n+/).map(p => {
    const trimmed = p.trim();
    return trimmed ? `<p>${trimmed}</p>` : '';
  }).filter(Boolean).join('\n');

  return html.trim();
}

// ============================================
// LIMPIAR CONTENIDO A TEXTO PLANO
// ============================================
function contentToPlain(raw) {
  if (!raw) return '';
  let text = String(raw);

  // Conservar el passage como referencia textual
  text = text.replace(/<scripRef passage="([^"]+)"\s*\/>/g, '(\$1)');

  // Eliminar todos los demás tags
  text = text.replace(/<[^>]+>/g, '');

  // Limpiar espacios múltiples
  text = text.replace(/\s+/g, ' ').trim();

  return text;
}

// ============================================
// PROCESAR UN ARCHIVO XML
// ============================================
async function processFile(filePath, volume, sourceId, osisToOrder, stats) {
  console.log(`\n📂 Procesando: ${path.basename(filePath)} (volumen ${volume})`);

  if (!fs.existsSync(filePath)) {
    console.error(`❌ Archivo no encontrado: ${filePath}`);
    return;
  }

  // Leer XML como texto plano
  const xmlContent = fs.readFileSync(filePath, 'utf-8');

  // Extraer entradas con regex (sin parser XML)
  const entries = extractEntries(xmlContent);
  console.log(`   📄 Entradas encontradas: ${entries.length}`);

  for (let i = 0; i < entries.length; i++) {
    const { cita, comentario } = entries[i];

    if (!cita || !comentario) {
      stats.skipped++;
      continue;
    }

    try {
      const { xmlAbbr, chapter, verseStart, verseEnd } = parseCitation(cita);

      const osisAbbr = XML_ABBR_TO_OSIS[xmlAbbr];
      if (!osisAbbr) {
        console.warn(`   ⚠️  Abreviatura desconocida: "${xmlAbbr}" en "${cita}"`);
        stats.skipped++;
        continue;
      }

      const bookOrder = osisToOrder[osisAbbr];
      if (!bookOrder) {
        console.warn(`   ⚠️  Sin bookOrder para "${osisAbbr}"`);
        stats.skipped++;
        continue;
      }

      const content     = contentToPlain(comentario);
      const contentHtml = contentToHtml(comentario, osisToOrder);

      if (!content || content.length < 10) {
        stats.skipped++;
        continue;
      }

      const title = content.length > 80
        ? content.substring(0, 80).trimEnd() + '...'
        : content;

      const verseStr = verseStart
        ? `-${verseStart}${verseEnd && verseEnd !== verseStart ? '-' + verseEnd : ''}`
        : '';
      const divId = `mhc-en-${osisAbbr}-${chapter}${verseStr}`.toLowerCase();

      const result = await client.query(
        `INSERT INTO "CommentaryEntry"
          ("sourceId", language, "bookAbbr", "bookOrder", chapter,
           "verseStart", "verseEnd", title, content, "contentHtml",
           "divId", "sectionType", volume)
         VALUES (\$1,\$2,\$3,\$4,\$5,\$6,\$7,\$8,\$9,\$10,\$11,\$12,\$13)
         ON CONFLICT ("sourceId", language, "divId")
         DO UPDATE SET
           content       = EXCLUDED.content,
           "contentHtml" = EXCLUDED."contentHtml",
           title         = EXCLUDED.title,
           "verseStart"  = EXCLUDED."verseStart",
           "verseEnd"    = EXCLUDED."verseEnd"
         RETURNING id, (xmax = 0) AS is_new`,
        [
          sourceId, LANGUAGE, osisAbbr, bookOrder, chapter,
          verseStart, verseEnd, title, content, contentHtml,
          divId, 'commentary', volume,
        ]
      );

      if (result.rows[0].is_new) {
        stats.inserted++;
      } else {
        stats.updated++;
      }

      const total = stats.inserted + stats.updated;
      if (total % 200 === 0) {
        console.log(`   ⏳ ${total} procesadas (${stats.inserted} nuevas, ${stats.updated} actualizadas)...`);
      }

    } catch (err) {
      console.error(`   ❌ Error en "${cita}": ${err.message}`);
      stats.errors++;
    }
  }
}

// ============================================
// MAIN
// ============================================
async function seed() {
  await client.connect();
  console.log('✅ Conectado a la DB');

  // 1. Cargar BookAbbreviation -> osisAbbr -> bookOrder
  const baResult = await client.query(
    `SELECT "osisAbbr", "bookOrder" FROM "BookAbbreviation" WHERE language = \$1`,
    [LANGUAGE]
  );
  const osisToOrder = {};
  for (const row of baResult.rows) {
    osisToOrder[row.osisAbbr] = row.bookOrder;
  }
  console.log(`📚 BookAbbreviations: ${Object.keys(osisToOrder).length} entradas`);

  // 2. Asegurar CommentarySource MHC
  let sourceId;
  const sourceCheck = await client.query(
    `SELECT id FROM "CommentarySource" WHERE name = \$1`, [SOURCE_NAME]
  );
  if (sourceCheck.rows.length > 0) {
    sourceId = sourceCheck.rows[0].id;
    console.log(`📖 CommentarySource existente: ${SOURCE_NAME} (id=${sourceId})`);
  } else {
    const ins = await client.query(
      `INSERT INTO "CommentarySource"
        (name, "fullName", author, description, "publishedYear", "isPublicDomain", volumes)
       VALUES (\$1,\$2,\$3,\$4,\$5,\$6,\$7) RETURNING id`,
      [
        SOURCE_NAME,
        "Matthew Henry's Commentary on the Whole Bible",
        'Matthew Henry',
        "Matthew Henry's classic verse-by-verse commentary on the entire Bible",
        '1706-1714', true, 6,
      ]
    );
    sourceId = ins.rows[0].id;
    console.log(`📖 CommentarySource creado: ${SOURCE_NAME} (id=${sourceId})`);
  }

  // 3. Procesar cada volumen
  const stats = { inserted: 0, updated: 0, skipped: 0, errors: 0 };

  for (let vol = 1; vol <= MHC_FILES.length; vol++) {
    const filePath = path.join(MHC_DIR, MHC_FILES[vol - 1]);
    await processFile(filePath, vol, sourceId, osisToOrder, stats);
  }

  // 4. Resumen final
  console.log('\n========================================');
  console.log('✅ CARGA MHC COMPLETADA');
  console.log(`   Insertadas:   ${stats.inserted}`);
  console.log(`   Actualizadas: ${stats.updated}`);
  console.log(`   Saltadas:     ${stats.skipped}`);
  console.log(`   Errores:      ${stats.errors}`);
  console.log('========================================\n');

  await client.end();
}

seed().catch(e => {
  console.error('💥 Error fatal:', e);
  process.exit(1);
});
