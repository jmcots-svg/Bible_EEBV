// seed_dictionary.js - Importador Strong Hebreo + Griego
// Usa: fast-xml-parser + @prisma/client
// XML fuente: data/StrongsHebrew_norm.xml + data/StrongsGreek_norm.xml

const { PrismaClient } = require('@prisma/client');
const { XMLParser } = require('fast-xml-parser');
const fs = require('fs');
const path = require('path');

// ============================================
// CONFIGURACIÓN — cambia esto según el idioma
// ============================================
const DEFINITION_LANG = 'en'; // 'en' para inglés, 'es' para español

const prisma = new PrismaClient();

// ============================================
// UTILIDADES
// ============================================

function cleanText(text) {
  if (!text) return null;
  return String(text).replace(/\s+/g, ' ').trim() || null;
}

function normalizeStrong(value) {
  if (!value) return null;
  const str = String(value).replace(':', '').trim();
  const prefix = str[0];
  const number = str.slice(1);
  if (!['H', 'G'].includes(prefix)) return null;
  if (!/^\d+$/.test(number)) return null;
  return prefix + number.padStart(4, '0');
}

// ============================================
// PARSER HEBREO
// ============================================

function parseHebrew(filepath) {
  console.log('📖 Parseando Hebreo...');

  const xml = fs.readFileSync(filepath, 'utf-8');

  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    textNodeName: '#text',
    isArray: (name) => ['div', 'w', 'item', 'note'].includes(name),
    removeNSPrefix: true,
  });

  const result = parser.parse(xml);

  const glossary = result?.osis?.osisText?.div;
  if (!glossary) throw new Error('❌ No se encontró div en hebreo');

  const glossaryDiv = Array.isArray(glossary) ? glossary[0] : glossary;
  const entryDivs = glossaryDiv?.div || [];

  const entries = [];
  const relations = [];

  for (const div of entryDivs) {
    if (div['@_type'] !== 'entry') continue;

    const wList = Array.isArray(div.w) ? div.w : div.w ? [div.w] : [];
    const mainW = wList.find(w => w['@_ID']);
    if (!mainW) continue;

    const strong = normalizeStrong(mainW['@_ID']);
    if (!strong) continue;

    const lemma      = cleanText(mainW['@_lemma']);
    const translit   = cleanText(mainW['@_xlit']);
    const pronounc   = cleanText(mainW['@_POS']);
    const morphology = cleanText(mainW['@_morph']);
    const speechLang = cleanText(mainW['@_lang'] || mainW['@_xml:lang']);

    const items = div?.list?.item || [];
    const itemArr = Array.isArray(items) ? items : [items];
    const definition = itemArr
      .map(i => cleanText(typeof i === 'string' ? i : i['#text'] || i))
      .filter(Boolean)
      .join(' | ') || null;

    let exegesis    = null;
    let explanation = null;
    let kjvDef      = null;

    const notes = Array.isArray(div.note) ? div.note : div.note ? [div.note] : [];
    for (const note of notes) {
      const type = note['@_type'];
      const text = cleanText(
        typeof note === 'string' ? note : note['#text'] || note?.hi?.['#text'] || ''
      );
      if (type === 'exegesis')    exegesis    = text;
      if (type === 'explanation') explanation = text;
      if (type === 'translation') kjvDef      = text;
    }

    // ✅ definitionLang añadido
    entries.push({
      strong,
      language:          'H',
      definitionLang:    DEFINITION_LANG,
      lemma,
      translit,
      pronunciation:     pronounc,
      morphology,
      speechLang,
      definition,
      exegesis,
      explanation,
      kjvDefinition:     kjvDef,
      strongsDef:        null,
      strongsDerivation: null,
    });

    // ---- RELACIONES ----

    // 1. Referencias griegas
    const foreign = div.foreign;
    if (foreign) {
      const foreignW = Array.isArray(foreign.w) ? foreign.w : foreign.w ? [foreign.w] : [];
      for (const ref of foreignW) {
        const gloss = ref['@_gloss'];
        if (gloss && String(gloss).startsWith('G')) {
          const toStrong = normalizeStrong(gloss);
          if (toStrong) {
            // ✅ fromDefLang y toDefLang añadidos
            relations.push({
              fromStrong,
              fromDefLang:    DEFINITION_LANG,
              toStrong,
              toDefLang:      DEFINITION_LANG,
              relationType:   'greek_equiv',
              sourceLanguage: 'HEBREW',
            });
          }
        }
      }
    }

    // 2. Referencias internas dentro de notas
    for (const note of notes) {
      const noteW = Array.isArray(note.w) ? note.w : note.w ? [note.w] : [];
      for (const ref of noteW) {
        const src = ref['@_src'];
        if (src) {
          const toStrong = normalizeStrong('H' + src);
          if (toStrong) {
            // ✅ fromDefLang y toDefLang añadidos
            relations.push({
              fromStrong,
              fromDefLang:    DEFINITION_LANG,
              toStrong,
              toDefLang:      DEFINITION_LANG,
              relationType:   'related',
              sourceLanguage: 'HEBREW',
            });
          }
        }
      }
    }
  }

  console.log(`   ✅ ${entries.length} entradas | ${relations.length} relaciones`);
  return { entries, relations };
}

// ============================================
// PARSER GRIEGO
// ============================================

function parseGreek(filepath) {
  console.log('📖 Parseando Griego...');

  const xml = fs.readFileSync(filepath, 'utf-8');

  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    textNodeName: '#text',
    isArray: (name) => ['entry', 'strongsref', 'see'].includes(name),
  });

  const result = parser.parse(xml);

  const entryList = result?.strongsdictionary?.entries?.entry || [];

  const entries = [];
  const relations = [];

  for (const entry of entryList) {
    const strong = normalizeStrong(entry['@_strongs']);
    if (!strong) continue;

    const greek    = entry.greek;
    const lemma    = cleanText(greek?.['@_unicode']);
    const translit = cleanText(greek?.['@_translit']);
    const pronounc = cleanText(entry.pronunciation?.['@_strongs']);

    const strongsDef = cleanText(
      typeof entry.strongs_def === 'string'
        ? entry.strongs_def
        : entry.strongs_def?.['#text'] || ''
    );

    const strongsDerivation = cleanText(
      typeof entry.strongs_derivation === 'string'
        ? entry.strongs_derivation
        : entry.strongs_derivation?.['#text'] || ''
    );

    const kjvDef = cleanText(
      typeof entry.kjv_def === 'string'
        ? entry.kjv_def
        : entry.kjv_def?.['#text'] || ''
    );

    // ✅ definitionLang añadido
    entries.push({
      strong,
      language:          'G',
      definitionLang:    DEFINITION_LANG,
      lemma,
      translit,
      pronunciation:     pronounc,
      morphology:        null,
      speechLang:        'grc',
      definition:        strongsDef,
      exegesis:          null,
      explanation:       null,
      kjvDefinition:     kjvDef,
      strongsDef,
      strongsDerivation,
    });

    // ---- RELACIONES ----

    // 1. strongsref en strongs_derivation
    const derivEl = entry.strongs_derivation;
    if (derivEl && typeof derivEl === 'object') {
      const refs = Array.isArray(derivEl.strongsref)
        ? derivEl.strongsref
        : derivEl.strongsref ? [derivEl.strongsref] : [];

      for (const ref of refs) {
        const toStrong = normalizeStrong(ref['@_strongs']);
        if (toStrong) {
          // ✅ fromDefLang y toDefLang añadidos
          relations.push({
            fromStrong:    strong,
            fromDefLang:   DEFINITION_LANG,
            toStrong,
            toDefLang:     DEFINITION_LANG,
            relationType:  'derives_from',
            sourceLanguage: ref['@_language'] || 'GREEK',
          });
        }
      }
    }

    // 2. see also
    const seeList = Array.isArray(entry.see)
      ? entry.see
      : entry.see ? [entry.see] : [];

    for (const see of seeList) {
      const toStrong = normalizeStrong(see['@_strongs']);
      if (toStrong) {
        // ✅ fromDefLang y toDefLang añadidos
        relations.push({
          fromStrong:    strong,
          fromDefLang:   DEFINITION_LANG,
          toStrong,
          toDefLang:     DEFINITION_LANG,
          relationType:  'see_also',
          sourceLanguage: see['@_language'] || 'GREEK',
        });
      }
    }
  }

  console.log(`   ✅ ${entries.length} entradas | ${relations.length} relaciones`);
  return { entries, relations };
}

// ============================================
// IMPORTADOR DB
// ============================================

async function importEntries(entries) {
  const BATCH = 100;
  let total = 0;

  for (let i = 0; i < entries.length; i += BATCH) {
    const batch = entries.slice(i, i + BATCH);

    await prisma.strongEntry.createMany({
      data: batch,
      skipDuplicates: true,
    });

    total += batch.length;
    process.stdout.write(`\r   📥 Entradas: ${total}/${entries.length}`);
  }
  console.log('');
}

async function importRelations(relations, validStrongs) {
  const BATCH = 200;
  let total = 0;
  let skipped = 0;

  const seen = new Set();
  const valid = relations.filter(r => {
    // ✅ validStrongs ahora usa clave compuesta strong|definitionLang
    const fromKey = `${r.fromStrong}|${r.fromDefLang}`;
    const toKey   = `${r.toStrong}|${r.toDefLang}`;

    if (!validStrongs.has(fromKey) || !validStrongs.has(toKey)) {
      skipped++;
      return false;
    }
    const key = `${r.fromStrong}|${r.fromDefLang}|${r.toStrong}|${r.toDefLang}|${r.relationType}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  console.log(`   ⚠️  Relaciones huérfanas descartadas: ${skipped}`);
  console.log(`   ✅ Relaciones válidas: ${valid.length}`);

  for (let i = 0; i < valid.length; i += BATCH) {
    const batch = valid.slice(i, i + BATCH);

    await prisma.strongRelation.createMany({
      data: batch,
      skipDuplicates: true,
    });

    total += batch.length;
    process.stdout.write(`\r   📥 Relaciones: ${total}/${valid.length}`);
  }
  console.log('');
}

// ============================================
// MAIN
// ============================================

async function main() {
  console.log('🚀 Iniciando importación Strong Dictionary...\n');
  console.log(`🌐 Idioma de definiciones: ${DEFINITION_LANG}\n`);

  const hebrewFile = path.join(__dirname, 'data', 'StrongsHebrew_norm.es.xml');
  const greekFile  = path.join(__dirname, 'data', 'StrongsGreek_norm.es.xml');

  const { entries: hEntries, relations: hRelations } = parseHebrew(hebrewFile);
  const { entries: gEntries, relations: gRelations } = parseGreek(greekFile);

  const allEntries   = [...hEntries, ...gEntries];
  const allRelations = [...hRelations, ...gRelations];

  // ✅ Set con clave compuesta strong|definitionLang
  const validStrongs = new Set(
    allEntries.map(e => `${e.strong}|${e.definitionLang}`)
  );

  console.log(`\n📊 Total entradas:   ${allEntries.length}`);
  console.log(`📊 Total relaciones: ${allRelations.length}\n`);

  console.log('💾 Importando entradas...');
  await importEntries(allEntries);
  console.log('✅ Entradas importadas\n');

  console.log('🔗 Importando relaciones...');
  await importRelations(allRelations, validStrongs);
  console.log('✅ Relaciones importadas\n');

  const totalEntries   = await prisma.strongEntry.count();
  const totalRelations = await prisma.strongRelation.count();

  console.log('🎉 ¡IMPORTACIÓN COMPLETADA!');
  console.log(`   StrongEntry:    ${totalEntries}`);
  console.log(`   StrongRelation: ${totalRelations}`);
  console.log(`   Idioma:         ${DEFINITION_LANG}`);
}

main()
  .catch(e => {
    console.error('💥 ERROR:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
