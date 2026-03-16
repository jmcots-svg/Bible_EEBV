const axios = require("axios");
const { Client } = require("pg");
require("dotenv").config();

const DATABASE_URL = process.env.DATABASE_URL || process.env.DIRECT_URL;
const TARGET_LANG = process.env.TARGET_LANG || "ca";

if (!DATABASE_URL) {
  console.error("❌ Error: Falta DATABASE_URL o DIRECT_URL en las variables de entorno");
  process.exit(1);
}

const client = new Client({
  connectionString: DATABASE_URL,
});

const FIELDS_TO_TRANSLATE = [
  "definition",
  "exegesis",
  "explanation",
  "kjvDefinition",
  "strongsDef",
  "strongsDerivation",
];

// Función para traducir con MyMemory API (gratis, sin clave)
async function translateText(text, targetLang = "ca") {
  if (!text || text.trim() === "") return null;

  try {
    const encodedText = encodeURIComponent(text);
    const response = await axios.get(
      `https://api.mymemory.translated.net/get?q=${encodedText}&langpair=en|${targetLang}`
    );

    if (response.data.responseStatus === 200) {
      return response.data.responseData.translatedText;
    } else {
      console.warn(`⚠️ Error en traducción: ${response.data.responseDetails}`);
      return null;
    }
  } catch (error) {
    console.error(`❌ Error traduciendo: ${error.message}`);
    // Reintentar una vez
    await new Promise((resolve) => setTimeout(resolve, 2000));
    try {
      const encodedText = encodeURIComponent(text);
      const response = await axios.get(
        `https://api.mymemory.translated.net/get?q=${encodedText}&langpair=en|${targetLang}`
      );
      if (response.data.responseStatus === 200) {
        return response.data.responseData.translatedText;
      }
    } catch (retryError) {
      console.error(`❌ Error en reintento: ${retryError.message}`);
      return null;
    }
  }
}

async function translateStrongEntry(entryEn, targetLang = "ca") {
  const entryTranslated = {
    strong: entryEn.strong,
    language: entryEn.language,
    lemma: entryEn.lemma,
    translit: entryEn.translit,
    pronunciation: entryEn.pronunciation,
    morphology: entryEn.morphology,
    speechLang: entryEn.speechLang,
    definition: null,
    exegesis: null,
    explanation: null,
    kjvDefinition: null,
    strongsDef: null,
    strongsDerivation: null,
    definitionLang: targetLang,
  };

  for (const field of FIELDS_TO_TRANSLATE) {
    const originalText = entryEn[field];
    if (originalText) {
      process.stdout.write(`  Traduciendo ${field}... `);
      const translated = await translateText(originalText, targetLang);
      entryTranslated[field] = translated;
      console.log("✓");
      // Pausa para evitar rate limiting
      await new Promise((resolve) => setTimeout(resolve, 800));
    }
  }

  return entryTranslated;
}

async function main() {
  console.log(
    `\n🔄 INICIANDO TRADUCCIÓN DE STRONG: EN → ${TARGET_LANG.toUpperCase()}`
  );
  console.log("=".repeat(70));

  try {
    // Conectar a la base de datos
    console.log(`\n🔌 Conectando a la base de datos...`);
    await client.connect();
    console.log(`✓ Conectado`);

    // 1. Obtener todos los Strong en inglés
    console.log(`\n📥 Obteniendo Strong entries en inglés...`);
    const result = await client.query(
      `SELECT "strong", "language", "lemma", "translit", "pronunciation", 
              "morphology", "speechLang", "definition", "exegesis", "explanation", 
              "kjvDefinition", "strongsDef", "strongsDerivation"
       FROM "StrongEntry"
       WHERE "definitionLang" = 'en'
       ORDER BY "strong"`
    );

    const strongEntriesEn = result.rows;
    console.log(`✓ Se obtuvieron ${strongEntriesEn.length} entradas en inglés`);

    // 2. Verificar si ya existen
    console.log(
      `\n🔍 Verificando si ya existen en ${TARGET_LANG.toUpperCase()}...`
    );
    const existingResult = await client.query(
      `SELECT COUNT(*) as count FROM "StrongEntry" WHERE "definitionLang" = \$1`,
      [TARGET_LANG]
    );

    const existingCount = parseInt(existingResult.rows[0].count);
    console.log(
      `   Ya existen ${existingCount} entradas en ${TARGET_LANG.toUpperCase()}`
    );

    if (existingCount > 0) {
      console.log(
        `\n⚠️  Ya hay entradas en ${TARGET_LANG.toUpperCase()}.`
      );
      console.log(`   Se sobrescribirán automáticamente.`);

      // Eliminar entradas existentes
      await client.query(
        `DELETE FROM "StrongEntry" WHERE "definitionLang" = \$1`,
        [TARGET_LANG]
      );
      console.log(`   ✓ Eliminadas ${existingCount} entradas previas`);
    }

    // 3. Traducir
    console.log(`\n🌐 Traduciendo ${strongEntriesEn.length} entradas...`);
    console.log("=".repeat(70));

    const translatedEntries = [];
    const errors = [];

    for (let i = 0; i < strongEntriesEn.length; i++) {
      const entryEn = strongEntriesEn[i];
      try {
        console.log(
          `\n[${i + 1}/${strongEntriesEn.length}] ${entryEn.strong} (${entryEn.language})`
        );
        const entryTranslated = await translateStrongEntry(entryEn, TARGET_LANG);
        translatedEntries.push(entryTranslated);

        // Pausa cada 10 entradas
        if ((i + 1) % 10 === 0) {
          console.log("⏸️  Pausa de 2 segundos para respetar rate limit...");
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
      } catch (error) {
        console.error(`❌ Error en ${entryEn.strong}: ${error.message}`);
        errors.push([entryEn.strong, error.message]);
      }
    }

    console.log(`\n✓ Se tradujeron ${translatedEntries.length} entradas`);
    if (errors.length > 0) {
      console.log(`⚠️  ${errors.length} errores encontrados`);
    }

    // 4. Insertar en la base de datos
    console.log(`\n💾 Insertando en la base de datos...`);

    if (translatedEntries.length === 0) {
      console.error("❌ No hay entradas para insertar");
      process.exit(1);
    }

    let insertedCount = 0;

    for (const entry of translatedEntries) {
      await client.query(
        `INSERT INTO "StrongEntry" 
         ("strong", "language", "lemma", "translit", "pronunciation", "morphology", 
          "speechLang", "definition", "exegesis", "explanation", "kjvDefinition", 
          "strongsDef", "strongsDerivation", "definitionLang", "createdAt")
         VALUES (\$1, \$2, \$3, \$4, \$5, \$6, \$7, \$8, \$9, \$10, \$11, \$12, \$13, \$14, \$15)`,
        [
          entry.strong,
          entry.language,
          entry.lemma,
          entry.translit,
          entry.pronunciation,
          entry.morphology,
          entry.speechLang,
          entry.definition,
          entry.exegesis,
          entry.explanation,
          entry.kjvDefinition,
          entry.strongsDef,
          entry.strongsDerivation,
          entry.definitionLang,
          new Date(),
        ]
      );

      insertedCount++;
      if (insertedCount % 100 === 0) {
        console.log(`  ✓ Insertadas ${insertedCount}/${translatedEntries.length} entradas`);
      }
    }

    console.log(`  ✓ Insertadas ${insertedCount}/${translatedEntries.length} entradas`);

    // 5. Resumen final
    console.log("\n" + "=".repeat(70));
    console.log("✅ TRADUCCIÓN COMPLETADA");
    console.log(`   Idioma destino: ${TARGET_LANG.toUpperCase()}`);
    console.log(`   Entradas traducidas: ${translatedEntries.length}`);
    console.log(`   Errores: ${errors.length}`);
    if (errors.length > 0) {
      console.log("\n   Primeros errores encontrados:");
      errors.slice(0, 5).forEach(([strong, error]) => {
        console.log(`   - ${strong}: ${error}`);
      });
      if (errors.length > 5) {
        console.log(`   ... y ${errors.length - 5} más`);
      }
    }
    console.log("=".repeat(70) + "\n");
  } catch (error) {
    console.error(`\n❌ Error fatal: ${error.message}`);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
