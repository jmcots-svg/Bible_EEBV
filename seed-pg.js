const { Client } = require('pg');
const xml2js = require('xml2js');

const client = new Client({ 
  // Intentamos añadir el parámetro sslmode directamente si no lo tiene la URL
  connectionString: process.env.DATABASE_URL.includes('sslmode') 
    ? process.env.DATABASE_URL 
    : `${process.env.DATABASE_URL}?sslmode=require`,
  ssl: {
    rejectUnauthorized: false
  },
  connectionTimeoutMillis: 10000, 
});

// CONFIGURACIÓN PARA LBLA
const XMLURL = 'https://jmcots-svg.github.io/Bible_EEBV/data/CatalanBECBible.xml'; 
const VERSION_SHORT = 'BEC';
const VERSION_FULL = 'Bíblia Evangèlica Catalana 2000';

// Mapeo de nombres de libros por número (Basado en el canon estándar)
const bookNames = {
  // ANTIC TESTAMENT
  1: "Gènesi", 2: "Èxode", 3: "Levític", 4: "Nombres", 5: "Deuteronomi",
  6: "Josuè", 7: "Jutges", 8: "Rut", 9: "1 Samuel", 10: "2 Samuel",
  11: "1 Reis", 12: "2 Reis", 13: "1 Cròniques", 14: "2 Cròniques", 15: "Esdres",
  16: "Nehemies", 17: "Ester", 18: "Job", 19: "Salms", 20: "Proverbis",
  21: "Eclesiastès", 22: "Càntic dels Càntics", 23: "Isaïes", 24: "Jeremies", 
  25: "Lamentacions", 26: "Ezequiel", 27: "Daniel", 28: "Osees", 29: "Joel", 
  30: "Amós", 31: "Abdies", 32: "Jonàs", 33: "Miquees", 34: "Nahum", 
  35: "Habacuc", 36: "Sofonies", 37: "Ageu", 38: "Zacaries", 39: "Malaquies",
  // NOU TESTAMENT
  40: "Mateu", 41: "Marc", 42: "Lluc", 43: "Joan", 44: "Fets dels Apòstols", 
  45: "Romans", 46: "1 Corintis", 47: "2 Corintis", 48: "Gàlates", 
  49: "Efesis", 50: "Filipencs", 51: "Colossencs", 52: "1 Tessalonicencs", 
  53: "2 Tessalonicencs", 54: "1 Timoteu", 55: "2 Timoteu", 56: "Titus", 
  57: "Filèmon", 58: "Hebreus", 59: "Jaume", 60: "1 Pere", 61: "2 Pere", 
  62: "1 Joan", 63: "2 Joan", 64: "3 Joan", 65: "Judes", 66: "Apocalipsi"
};

async function seed() {
  await client.connect();
  console.log('Conectado a la DB para cargar LBLA');

  // Verificar si la versión ya existe para no duplicar
  const checkVersion = await client.query('SELECT id FROM "BibleVersion" WHERE name = $1', [VERSION_SHORT]);
  if (checkVersion.rows.length > 0) {
    console.error(`❌ La versión ${VERSION_SHORT} ya existe. Abortando.`);
    await client.end();
    return;
  }

  // Insertar la versión
  const rv = await client.query(
    `INSERT INTO "BibleVersion" (name, "fullName") VALUES ($1, $2) RETURNING id`,
    [VERSION_SHORT, VERSION_FULL]
  );
  const versionId = rv.rows[0].id;

  console.log(`Descargando y parseando XML de LBLA...`);
  const res = await fetch(XMLURL);
  let xml = await res.text();
  xml = xml.replace(/^\uFEFF/, '').trimStart();

  const parser = new xml2js.Parser({ 
    explicitArray: false, 
    trim: true,
    mergeAttrs: true 
  });
  
  const data = await parser.parseStringPromise(xml);
  
  // Navegamos por: testament -> book -> chapter -> verse
  let testaments = data.bible.testament;
  if (!Array.isArray(testaments)) testaments = [testaments];

  let totalV = 0;

  for (const t of testaments) {
    const tName = t.name === 'Old' ? 'OT' : 'NT';
    let books = t.book || [];
    if (!Array.isArray(books)) books = [books];

    for (const b of books) {
      const bNumber = parseInt(b.number);
      const bName = bookNames[bNumber] || `Libro ${bNumber}`;
      const abbr = bName.slice(0, 3).toUpperCase();

      console.log(`Cargando: ${bName}...`);

      const rb = await client.query(
        `INSERT INTO "Book" (name, testament, abbr, "bookOrder", "versionId") VALUES ($1,$2,$3,$4,$5) RETURNING id`,
        [bName, tName, abbr, bNumber, versionId]
      );
      const bookId = rb.rows[0].id;

      let chapters = b.chapter || [];
      if (!Array.isArray(chapters)) chapters = [chapters];

      for (const ch of chapters) {
        const chNum = parseInt(ch.number);
        const rc = await client.query(
          `INSERT INTO "Chapter" (number, "bookId") VALUES ($1,$2) RETURNING id`,
          [chNum, bookId]
        );
        const chId = rc.rows[0].id;

        let verses = ch.verse || [];
        if (!Array.isArray(verses)) verses = [verses];

        for (const v of verses) {
          const vNum = parseInt(v.number);
          // En xml2js con mergeAttrs, si hay texto y atributos, el texto va a "_" o es el valor directo si es string
          const vText = (typeof v === 'string') ? v : (v._ || "");
          
          if (vText) {
            await client.query(
              `INSERT INTO "Verse" (number, text, "chapterId") VALUES ($1,$2,$3)`,
              [vNum, vText.toString().trim(), chId]
            );
            totalV++;
          }
        }
      }
    }
  }

  console.log(`\n🎉 ¡LBLA Cargada con éxito!`);
  console.log(`Total versículos insertados: ${totalV}`);
  await client.end();
}

seed().catch(e => { 
  console.error('Error durante el seed:', e); 
  process.exit(1); 
});
