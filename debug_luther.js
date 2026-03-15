// debug_luther.js
const fs = require('fs');
const path = require('path');

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

const filepath = path.join(__dirname, 'data', 'Luther.xml');
const xmlContent = fs.readFileSync(filepath, 'utf-8');

const entryRegex = /<entry\s+ref="([^"]*)">/g;
const unmappedBooks = new Set();
const allRefs = [];

let match;
while ((match = entryRegex.exec(xmlContent)) !== null) {
  const ref = match[1];
  allRefs.push(ref);
  
  // Ignorar entradas especiales
  if (ref.includes('Heading') || ref.includes('0:0')) continue;
  
  // Intentar parsear
  const refMatch = ref.match(/^(.+?)\s+(\d+):(\d+)/);
  if (refMatch) {
    const bookName = refMatch[1].trim();
    if (!BOOK_MAP[bookName]) {
      unmappedBooks.add(bookName);
    }
  } else {
    // Referencia con formato inesperado
    unmappedBooks.add(`[FORMATO RARO] ${ref}`);
  }
}

console.log('════════════════════════════════════════');
console.log('📊 DIAGNÓSTICO LUTHER.XML');
console.log('════════════════════════════════════════\n');

console.log(`Total de entradas en XML: ${allRefs.length}\n`);

console.log('❌ Libros/Referencias NO mapeados:');
console.log('─────────────────────────────────────');
for (const book of [...unmappedBooks].sort()) {
  // Contar cuántas veces aparece
  const count = allRefs.filter(r => r.startsWith(book)).length;
  console.log(`   "${book}" (${count} entradas)`);
}

console.log('\n📝 Primeras 20 referencias del XML:');
console.log('─────────────────────────────────────');
allRefs.slice(0, 20).forEach(r => console.log(`   ${r}`));

console.log('\n📝 Referencias únicas (muestra):');
console.log('─────────────────────────────────────');
const uniqueBookNames = new Set();
allRefs.forEach(ref => {
  const m = ref.match(/^(.+?)\s+\d+:/);
  if (m) uniqueBookNames.add(m[1]);
});
[...uniqueBookNames].sort().forEach(b => console.log(`   ${b}`));
