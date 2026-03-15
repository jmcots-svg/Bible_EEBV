const { Client } = require('pg');
const xml2js = require('xml2js');
const fs = require('fs');
const path = require('path');

const client = new Client({ 
  connectionString: process.env.DATABASE_URL.includes('sslmode') 
    ? process.env.DATABASE_URL 
    : `${process.env.DATABASE_URL}?sslmode=require`,
  ssl: {
    rejectUnauthorized: false
  },
  connectionTimeoutMillis: 10000, 
});

const XML_PATH = path.join(__dirname, 'data', 'KJV.xml');
const VERSION_SHORT = 'KJV';
const VERSION_FULL = 'King James Version';
const LANGUAGE = 'en'; // ✅ AÑADIDO

// NOMBRES DE LIBROS EN INGLÉS
const bookNames = {
  // OLD TESTAMENT
  1: "Genesis", 2: "Exodus", 3: "Leviticus", 4: "Numbers", 5: "Deuteronomy",
  6: "Joshua", 7: "Judges", 8: "Ruth", 9: "1 Samuel", 10: "2 Samuel",
  11: "1 Kings", 12: "2 Kings", 13: "1 Chronicles", 14: "2 Chronicles", 15: "Ezra",
  16: "Nehemiah", 17: "Esther", 18: "Job", 19: "Psalms", 20: "Proverbs",
  21: "Ecclesiastes", 22: "Song of Solomon", 23: "Isaiah", 24: "Jeremiah",
  25: "Lamentations", 26: "Ezekiel", 27: "Daniel", 28: "Hosea", 29: "Joel",
  30: "Amos", 31: "Obadiah", 32: "Jonah", 33: "Micah", 34: "Nahum",
  35: "Habakkuk", 36: "Zephaniah", 37: "Haggai", 38: "Zechariah", 39: "Malachi",
  // NEW TESTAMENT
  40: "Matthew", 41: "Mark", 42: "Luke", 43: "John", 44: "Acts",
  45: "Romans", 46: "1 Corinthians", 47: "2 Corinthians", 48: "Galatians",
  49: "Ephesians", 50: "Philippians", 51: "Colossians", 52: "1 Thessalonians",
  53: "2 Thessalonians", 54: "1 Timothy", 55: "2 Timothy", 56: "Titus",
  57: "Philemon", 58: "Hebrews", 59: "James", 60: "1 Peter", 61: "2 Peter",
  62: "1 John", 63: "2 John", 64: "3 John", 65: "Jude", 66: "Revelation"
};

async function seed() {
  await client.connect();
  console.log('Conectado a la DB para cargar Biblia KJV');

  // Verificar si la versión ya existe
  const checkVersion = await client.query('SELECT id FROM "BibleVersion" WHERE name = \$1', [VERSION_SHORT]);
  if (checkVersion.rows.length > 0) {
    console.error(`❌ La versión ${VERSION_SHORT} ya existe. Abortando.`);
    await client.end();
    return;
  }

  // ✅ INSERTAR CON LANGUAGE
  const rv = await client.query(
    `INSERT INTO "BibleVersion" (name, "fullName", language) VALUES (\$1, \$2, \$3) RETURNING id`,
    [VERSION_SHORT, VERSION_FULL, LANGUAGE]
  );
  const versionId = rv.rows[0].id;
  console.log(`✅ Versión ${VERSION_SHORT} creada con ID: ${versionId}`);

  console.log('📥 Leyendo XML local...');
  console.log('🔍 Path:', XML_PATH);
  console.log('🔍 Existe:', fs.existsSync(XML_PATH));
  
  if (!fs.existsSync(XML_PATH)) {
    console.error('❌ El archivo XML no existe en la ruta especificada');
    await client.end();
    return;
  }

  let xml = fs.readFileSync(XML_PATH, 'utf-8').replace(/^\uFEFF/, '').trimStart();
  
  const parser = new xml2js.Parser({ 
    explicitArray: false, 
    trim: true,
    mergeAttrs: true 
  });
  
  const data = await parser.parseStringPromise(xml);
  
  let testaments = data.bible.testament;
  if (!Array.isArray(testaments)) testaments = [testaments];

  let totalV = 0;
  let totalBooks = 0;
  let totalChapters = 0;

  for (const t of testaments) {
    const tName = t.name === 'Old' ? 'OT' : 'NT';
    console.log(`\n📖 Procesando ${tName === 'OT' ? 'Antiguo' : 'Nuevo'} Testamento...`);
    
    let books = t.book || [];
    if (!Array.isArray(books)) books = [books];

    for (const b of books) {
      const bNumber = parseInt(b.number);
      const bName = bookNames[bNumber] || `Book ${bNumber}`;
      const abbr = bName.slice(0, 3).toUpperCase();

      console.log(`  📚 Cargando: ${bName}...`);

      const rb = await client.query(
        `INSERT INTO "Book" (name, testament, abbr, "bookOrder", "versionId") VALUES (\$1,\$2,\$3,\$4,\$5) RETURNING id`,
        [bName, tName, abbr, bNumber, versionId]
      );
      const bookId = rb.rows[0].id;
      totalBooks++;

      let chapters = b.chapter || [];
      if (!Array.isArray(chapters)) chapters = [chapters];

      for (const ch of chapters) {
        const chNum = parseInt(ch.number);
        const rc = await client.query(
          `INSERT INTO "Chapter" (number, "bookId") VALUES (\$1,\$2) RETURNING id`,
          [chNum, bookId]
        );
        const chId = rc.rows[0].id;
        totalChapters++;

        let verses = ch.verse || [];
        if (!Array.isArray(verses)) verses = [verses];

        for (const v of verses) {
          const vNum = parseInt(v.number);
          const vText = (typeof v === 'string') ? v : (v._ || "");
          
          if (vText) {
            await client.query(
              `INSERT INTO "Verse" (number, text, "chapterId") VALUES (\$1,\$2,\$3)`,
              [vNum, vText.toString().trim(), chId]
            );
            totalV++;
          }
        }
      }
    }
  }

  console.log(`\n${'='.repeat(50)}`);
  console.log(`🎉 ¡KJV Cargada con éxito!`);
  console.log(`${'='.repeat(50)}`);
  console.log(`📊 Estadísticas:`);
  console.log(`   • Libros insertados: ${totalBooks}`);
  console.log(`   • Capítulos insertados: ${totalChapters}`);
  console.log(`   • Versículos insertados: ${totalV}`);
  console.log(`   • Idioma: ${LANGUAGE}`);
  console.log(`${'='.repeat(50)}`);
  
  await client.end();
}

seed().catch(e => { 
  console.error('❌ Error durante el seed:', e); 
  process.exit(1); 
});
