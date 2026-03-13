const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const JSON_PATH = path.join(__dirname, 'data', 'rv1909_strong.json');
const VERSION_SHORT = 'RV1909S';
const VERSION_FULL = 'Reina Valera 1909 con Strong';

const bookNames = {
  1: "Génesis", 2: "Éxodo", 3: "Levítico", 4: "Números", 5: "Deuteronomio",
  6: "Josué", 7: "Jueces", 8: "Rut", 9: "1 Samuel", 10: "2 Samuel",
  11: "1 Reyes", 12: "2 Reyes", 13: "1 Crónicas", 14: "2 Crónicas",
  15: "Esdras", 16: "Nehemías", 17: "Ester", 18: "Job", 19: "Salmos",
  20: "Proverbios", 21: "Eclesiastés", 22: "Cantares", 23: "Isaías",
  24: "Jeremías", 25: "Lamentaciones", 26: "Ezequiel", 27: "Daniel",
  28: "Oseas", 29: "Joel", 30: "Amós", 31: "Abdías", 32: "Jonás",
  33: "Miqueas", 34: "Nahúm", 35: "Habacuc", 36: "Sofonías",
  37: "Hageo", 38: "Zacarías", 39: "Malaquías",
  40: "Mateo", 41: "Marcos", 42: "Lucas", 43: "Juan", 44: "Hechos",
  45: "Romanos", 46: "1 Corintios", 47: "2 Corintios", 48: "Gálatas",
  49: "Efesios", 50: "Filipenses", 51: "Colosenses",
  52: "1 Tesalonicenses", 53: "2 Tesalonicenses",
  54: "1 Timoteo", 55: "2 Timoteo", 56: "Tito",
  57: "Filemón", 58: "Hebreos", 59: "Santiago",
  60: "1 Pedro", 61: "2 Pedro",
  62: "1 Juan", 63: "2 Juan", 64: "3 Juan",
  65: "Judas", 66: "Apocalipsis"
};

function parseWords(text) {
  const words = [];
  const cleanText = text.replace(/\{H\d+\}/g, '');
  const tokens = text.split(/\s+/);

  let position = 1;

  for (let token of tokens) {
    const match = token.match(/\{(H\d+)\}/);
    const strong = match ? match[1] : null;
    const cleanWord = token.replace(/\{H\d+\}/g, '').replace(/[.,;:!?]/g, '');

    if (cleanWord.trim() !== '') {
      words.push({
        text: cleanWord,
        strong,
        position: position++
      });
    }
  }

  return { cleanText, words };
}

async function seed() {
  await client.connect();
  console.log("✅ Conectado");

  const raw = fs.readFileSync(JSON_PATH, 'utf8');
  const data = JSON.parse(raw);

  const checkVersion = await client.query(
    `SELECT id FROM "BibleVersion" WHERE name=\$1`,
    [VERSION_SHORT]
  );

  if (checkVersion.rows.length > 0) {
    console.log("❌ Ya existe esta versión");
    return;
  }

  const rv = await client.query(
    `INSERT INTO "BibleVersion" (name,"fullName","hasStrongs")
     VALUES (\$1,\$2,true) RETURNING id`,
    [VERSION_SHORT, VERSION_FULL]
  );

  const versionId = rv.rows[0].id;

  const booksMap = new Map();

  for (const v of data.verses) {
    if (!booksMap.has(v.book)) {
      const testament = v.book <= 39 ? 'OT' : 'NT';
      const rb = await client.query(
        `INSERT INTO "Book" (name,testament,abbr,"bookOrder","versionId")
         VALUES (\$1,\$2,\$3,\$4,\$5) RETURNING id`,
        [bookNames[v.book], testament, bookNames[v.book].slice(0,3).toUpperCase(), v.book, versionId]
      );
      booksMap.set(v.book, { id: rb.rows[0].id, chapters: new Map() });
    }

    const bookData = booksMap.get(v.book);

    if (!bookData.chapters.has(v.chapter)) {
      const rc = await client.query(
        `INSERT INTO "Chapter" (number,"bookId")
         VALUES (\$1,\$2) RETURNING id`,
        [v.chapter, bookData.id]
      );
      bookData.chapters.set(v.chapter, rc.rows[0].id);
    }

    const chapterId = bookData.chapters.get(v.chapter);

    const { cleanText, words } = parseWords(v.text);

    const rvv = await client.query(
      `INSERT INTO "Verse" (number,text,"chapterId")
       VALUES (\$1,\$2,\$3) RETURNING id`,
      [v.verse, cleanText.trim(), chapterId]
    );

    const verseId = rvv.rows[0].id;

    for (const w of words) {
      await client.query(
        `INSERT INTO "Word" (text,strong,position,"verseId")
         VALUES (\$1,\$2,\$3,\$4)`,
        [w.text, w.strong, w.position, verseId]
      );
    }
  }

  console.log("🎉 RV1909 Strong cargada correctamente");
  await client.end();
}

seed().catch(console.error);
