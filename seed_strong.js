const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const JSON_PATH = path.join(__dirname, 'data', 'rv_1909_strong.json');
const VERSION_SHORT = 'RV1909S';
const VERSION_FULL = 'Reina Valera 1909 con Strong';

function parseWords(text) {
  const words = [];
  const cleanText = text.replace(/\{H\d+\}/g, '');
  const tokens = text.split(/\s+/);

  let position = 1;

  for (let token of tokens) {
    const match = token.match(/\{(H\d+)\}/);
    const strong = match ? match[1] : null;

    const cleanWord = token
      .replace(/\{H\d+\}/g, '')
      .replace(/[.,;:!?]/g, '');

    if (cleanWord.trim()) {
      words.push({
        text: cleanWord,
        strong,
        position: position++
      });
    }
  }

  return { cleanText, words };
}

async function insertWordBatch(batch) {
  if (batch.length === 0) return;

  const values = [];
  const placeholders = [];

  batch.forEach((w, i) => {
    const base = i * 4;
    placeholders.push(
      `(
$$
{base + 1},
$$
{base + 2}, 
$$
{base + 3},
$$
{base + 4})`
    );
    values.push(w.text, w.strong, w.position, w.verseId);
  });

  await client.query(
    `INSERT INTO "Word" (text,strong,position,"verseId")
     VALUES ${placeholders.join(',')}`,
    values
  );
}

async function seed() {
  await client.connect();
  await client.query('BEGIN');

  console.log("✅ Conectado\n");

  const startTime = Date.now();

  const raw = fs.readFileSync(JSON_PATH, 'utf8');
  const data = JSON.parse(raw);

  const totalVerses = data.verses.length;
  let processedVerses = 0;
  let totalWordsInserted = 0;

  const versionRes = await client.query(
    `INSERT INTO "BibleVersion" (name,"fullName","hasStrongs")
     VALUES (\$1,\$2,true) RETURNING id`,
    [VERSION_SHORT, VERSION_FULL]
  );

  const versionId = versionRes.rows[0].id;

  const booksMap = new Map();
  let wordBatch = [];
  const BATCH_SIZE = 500;

  for (const v of data.verses) {

    if (!booksMap.has(v.book)) {
      const testament = v.book <= 39 ? 'OT' : 'NT';

      const rb = await client.query(
        `INSERT INTO "Book" (name,testament,abbr,"bookOrder","versionId")
         VALUES (\$1,\$2,\$3,\$4,\$5) RETURNING id`,
        [v.book_name, testament, v.book_name.slice(0,3).toUpperCase(), v.book, versionId]
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

    const verseRes = await client.query(
      `INSERT INTO "Verse" (number,text,"chapterId")
       VALUES (\$1,\$2,\$3) RETURNING id`,
      [v.verse, cleanText.trim(), chapterId]
    );

    const verseId = verseRes.rows[0].id;

    for (const w of words) {
      wordBatch.push({
        text: w.text,
        strong: w.strong,
        position: w.position,
        verseId
      });

      if (wordBatch.length >= BATCH_SIZE) {
        await insertWordBatch(wordBatch);
        totalWordsInserted += wordBatch.length;
        wordBatch = [];
      }
    }

    processedVerses++;

    // Mostrar progreso cada 500 versículos
    if (processedVerses % 500 === 0) {
      const percent = ((processedVerses / totalVerses) * 100).toFixed(2);
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      const speed = (processedVerses / elapsed).toFixed(1);

      console.log(
        `📖 ${processedVerses}/${totalVerses} (${percent}%) | ⏱ ${elapsed}s | ⚡ ${speed} vers/s`
      );
    }
  }

  await insertWordBatch(wordBatch);
  totalWordsInserted += wordBatch.length;

  await client.query('COMMIT');

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log("\n🎉 RV1909 Strong cargada correctamente");
  console.log(`📖 Versículos: ${processedVerses}`);
  console.log(`🔤 Palabras insertadas: ${totalWordsInserted}`);
  console.log(`⏱ Tiempo total: ${totalTime}s`);

  await client.end();
}

seed().catch(async (e) => {
  console.error(e);
  await client.query('ROLLBACK');
  process.exit(1);
});
