// debug_parser.js - Solo para debug, no importa nada
const { XMLParser } = require('fast-xml-parser');
const fs = require('fs');
const path = require('path');

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
// DEBUG PARSER HEBREO
// ============================================

function debugHebrew(filepath, targetStrong = 'H0376') {
  console.log(`📖 Parseando Hebreo (buscando ${targetStrong})...\n`);

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
  if (!glossary) {
    console.log('❌ No se encontró glossary');
    console.log('🔍 Estructura result:', JSON.stringify(Object.keys(result), null, 2));
    return;
  }

  const glossaryDiv = Array.isArray(glossary) ? glossary[0] : glossary;
  const entryDivs = glossaryDiv?.div || [];

  console.log(`📊 Total entradas encontradas: ${entryDivs.length}\n`);

  // Buscar la entrada específica
  for (const div of entryDivs) {
    if (div['@_type'] !== 'entry') continue;

    const wList = Array.isArray(div.w) ? div.w : div.w ? [div.w] : [];
    const mainW = wList.find(w => w['@_ID']);
    if (!mainW) continue;

    const strong = normalizeStrong(mainW['@_ID']);
    
    if (strong === targetStrong) {
      console.log(`✅ Encontrado ${targetStrong}!\n`);
      
      console.log('📋 Estructura completa de div:');
      console.log(JSON.stringify(div, null, 2));
      
      console.log('\n📋 div.list:');
      console.log(JSON.stringify(div.list, null, 2));
      
      console.log('\n📋 div.list?.item:');
      console.log(JSON.stringify(div.list?.item, null, 2));
      
      // Simular lo que hace el parser actual
      const items = div?.list?.item || [];
      const itemArr = Array.isArray(items) ? items : [items];
      
      console.log('\n📋 itemArr procesado:');
      console.log(JSON.stringify(itemArr, null, 2));
      
      const definition = itemArr
        .map(i => cleanText(typeof i === 'string' ? i : i['#text'] || i))
        .filter(Boolean)
        .join(' | ') || null;
      
      console.log('\n📋 Definition final:');
      console.log(definition);
      
      return;
    }
  }

  console.log(`❌ No se encontró ${targetStrong}`);
}

// ============================================
// EJECUTAR
// ============================================

const hebrewFile = path.join(__dirname, 'data', 'StrongsHebrew_norm_ES.xml');

// Probar con H0376 (que sabemos está mal)
debugHebrew(hebrewFile, 'H0376');

console.log('\n' + '='.repeat(60) + '\n');

// Probar con H0001 (que sabemos está bien)
debugHebrew(hebrewFile, 'H0001');
