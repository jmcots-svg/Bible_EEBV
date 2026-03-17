// seed_henry.js
// Matthew Henry's Commentary - 6 volúmenes completos
// Formato XML nuevo:
//   <cita>Ge 1</cita>          -> capítulo completo (introducción)
//   <cita>Ge 1:1-2</cita>      -> rango de versículos
//   <cita>Ge 1:1</cita>        -> versículo único
//   <scripRef passage="Ge 1:1" />  -> referencias cruzadas inline

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
const MHC_DIR    = path.join(__dirname, 'MHC');
const MHC_FILES  = ['mhc1.xml','mhc2.xml','mhc3.xml','mhc4.xml','mhc5.xml','mhc6.xml'];
const SOURCE_NAME = 'MHC';
const LANGUAGE    = 'en';

// ============================================
// MAPA: abreviatura XML -> osisAbbr
// ============================================
const XML_ABBR_TO_OSIS = {
  // Pentateuco
  'Ge':   'Gen',
  'Ex':   'Exod',
  'Le':   'Lev',
  'Nu':   'Num',
  'De':   'Deut',
  // Históricos
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
  // Poéticos
  'Job':  'Job',
  'Ps':   'Ps',
  'Pr':   'Prov',
  'Ec':   'Eccl',
  'So':   'Song',
  // Profetas mayores
  'Isa':  'Isa',
  'Jer':  'Jer',
  'La':   'Lam',
  'Eze':  'Ezek',
  'Da':   'Dan',
  // Profetas menores
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
  // Nuevo Testamento
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
  Re:     'Rev',
};

// ============================================
// PARSEAR CITA BÍBLICA
// Formatos:
//   "Ge 1"       -> cap completo, sin versículo
//   "Ge 1:1"     -> versículo único
//   "Ge 1:1-2"   -> rango
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
// Salida: array de { xmlAbbr, chapter, verseStart, verseEnd }
//
// Lógica: si un token no tiene libro, hereda el último libro visto
// Ej: "Ps 121:2,124:8" -> Ps 121:2 y Ps 124:8
// ============================================
function parseScripRefs(passage) {
  if (!passage) return [];

  const refs = [];
  let lastAbbr = null;

  // Separar por coma
  const parts = passage.split(',').map(p => p.trim()).filter(Boolean);

  for (const part of parts) {
    // ¿Tiene libro? "Joh 1:3" o solo "10" o "3:9"
    const withBook = part.match(/^([A-Z][a-z0-9]*)\s+(\d+):(\d+)(?:-(\d+))?$/);
    const chapVerse = part.match(/^(\d+):(\d+)(?:-(\d+))?$/);
    const verseOnly = part.match(/^(\d+)$/);

    if (withBook) {
      lastAbbr = withBook[1];
      refs.push({
        xmlAbbr:    withBook[1],
        chapter:    parseInt(withBook[2], 10),
        verseStart: parseInt(withBook[3], 10),
        verseEnd:   withBook[4] ? parseInt(withBook[4], 10) : parseInt(withBook[3], 10),
      });
    } else if (chapVerse && lastAbbr) {
      // "124:8" -> mismo libro que el anterior
      refs.push({
        xmlAbbr:    lastAbbr,
        chapter:    parseInt(chapVerse[1], 10),
        verseStart: parseInt(chapVerse[2], 10),
        verseEnd:   chapVerse[3] ? parseInt(chapVerse[3], 10) : parseInt(chapVerse[2], 10),
      });
    } else if (verseOnly && lastAbbr) {
      // "10" -> mismo libro y capítulo que el anterior
      const lastRef = refs[refs.length - 1];
      if (lastRef) {
        refs.push({
          xmlAbbr:    lastAbbr,
          chapter:    lastRef.chapter,
          verseStart: parseInt(verseOnly[1], 10),
          verseEnd:   parseInt(verseOnly[1], 10),
        });
      }
    }
  }

  return refs;
}

// ============================================
// CONVERTIR CONTENIDO A HTML CON LINKS
// Transforma <scripRef passage="..." /> en
// enlaces HTML clicables
// ============================================
function contentToHtml(raw, osisToOrder) {
  if (!raw) return '';
  let html = String(raw);

  // Reemplazar <scripRef passage="..." /> por span con data attributes
  html = html.replace(
    /<scripRef passage="([^"]+)"\s*\/>/g,
    (match, passage) => {
      const refs = parseScripRefs(passage);
      if (refs.length === 0) return '';

      // Construir enlaces para cada referencia
      const links = refs.map(ref => {
        const osisAbbr = XML_ABBR_TO_OSIS[ref.xmlAbbr];
        if (!osisAbbr) return `<span class="ref-unknown">${passage}</span>`;

        const bookOrder = osisToOrder[osisAbbr];
        const label = `${ref.xmlAbbr} ${ref.chapter}:${ref.verseStart}${ref.verseEnd !== ref.verseStart ? '-' + ref.verseEnd : ''}`;

        return `<a class="scripture-ref" ` +
               `data-book="${osisAbbr}" ` +
               `data-book-order="${bookOrder}" ` +
               `data-chapter="${ref.chapter}" ` +
               `data-verse-start="${ref.verseStart}" ` +
               `data-verse-end="${ref.verseEnd}" ` +
               `href="#">${label}</a>`;
      }).join(', ');

      return `<span class="scripture-refs">${links}</span>`;
    }
  );

  // Limpiar tags restantes sin contenido: <i>, <b>, <pb />, etc.
  html = html.replace(/<(i|b|pb|span|property)\s*\/>/g, '');
  html = html.replace(/<\/?(?:i|b|pb|span|property)[^>]*>/g, '');

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

  // Eliminar scripRef dejando el passage como texto
  text = text.replace(/<scripRef passage="([^"]+)"\s*\/>/g, '(\$1)');

  // Eliminar otros tags
  text = text.replace(/<[^>]+>/g, '');

  // Limpiar espacios
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

  // Leer y preprocesar XML
  let xmlContent = fs.readFileSync(filePath, 'utf-8');

  // Preprocesar: escapar & sueltos dentro de <comentario>
  xmlContent = xmlContent.replace(
    /<comentario>([\s\S]*?)<\/comentario>/g,
    (match, content) => {
      const safe = content.replace(/&(?!(amp|lt|gt|quot|apos);)/g, '&amp;');
      return `<comentario>${safe}</comentario>`;
    }
  );

  const parser = new XMLParser({
    ignoreAttributes:    false,
    attributeNamePrefix: '',
    parseTagValue:       true,
    trimValues:          false, // mantener saltos de línea
    processEntities:     false,
  });

  const parsed = parser.parse(xmlContent);
  const rawEntries = parsed?.root?.entrada;
  const entries = Array.isArray(rawEntries) ? rawEntries : [rawEntries];

  console.log(`   📄 Entradas encontradas: ${entries.length}`);

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];

    if (!entry?.cita || !entry?.comentario) {
      stats.skipped++;
      continue;
    }

    const citationRaw = String(entry.cita).trim();
    const commentRaw  = String(entry.comentario);

    try {
      const { xmlAbbr, chapter, verseStart, verseEnd } = parseCitation(citationRaw);

      // Resolver osisAbbr
      const osisAbbr = XML_ABBR_TO_OSIS[xmlAbbr];
      if (!osisAbbr) {
        console.warn(`   ⚠️  Abreviatura desconocida: "${xmlAbbr}" en "${citationRaw}"`);
        stats.skipped++;
        continue;
      }

      // Resolver bookOrder
      const bookOrder = osisToOrder[osisAbbr];
      if (!bookOrder) {
        console.warn(`   ⚠️  Sin bookOrder para "${osisAbbr}"`);
        stats.skipped++;
        continue;
      }

      // Generar contenido
      const content     = contentToPlain(commentRaw);
      const contentHtml = contentToHtml(commentRaw, osisToOrder);

      if (!content || content.length < 10) {
        stats.skipped++;
        continue;
      }

      // Título: primeras 80 chars del texto plano
      const title = content.length > 80
        ? content.substring(0, 80).trimEnd() + '...'
        : content;

      // divId único por volumen + libro + capítulo + versos
      const verseStr = verseStart
        ? `-${verseStart}${verseEnd && verseEnd !== verseStart ? '-' + verseEnd : ''}`
        : '';
      const divId = `mhc-en-${osisAbbr}-${chapter}${verseStr}`.toLowerCase();

      // Upsert
      const result = await client.query(
        `INSERT INTO "CommentaryEntry"
          ("sourceId", language, "bookAbbr", "bookOrder", chapter,
           "verseStart", "verseEnd", title, content, "contentHtml",
           "divId", "sectionType", volume)
         VALUES (\$1,\$2,\$3,\$4,\$5,\$6,\$7,\$8,\$9,\$10,\$11,\$12,\$13)
         ON CONFLICT ("sourceId", language, "divId")
         DO UPDATE SET
           content      = EXCLUDED.content,
           "contentHtml"= EXCLUDED."contentHtml",
           title        = EXCLUDED.title,
           "verseStart" = EXCLUDED."verseStart",
           "verseEnd"   = EXCLUDED."verseEnd"
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
        console.log(`   ⏳ ${total} entradas procesadas (${stats.inserted} nuevas, ${stats.updated} actualizadas)...`);
      }

    } catch (err) {
      console.error(`   ❌ Error en "${citationRaw}": ${err.message}`);
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
