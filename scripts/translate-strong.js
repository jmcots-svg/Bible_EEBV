const axios = require("axios");
require("dotenv").config();

const DATABASE_URL = process.env.DATABASE_URL || process.env.DIRECT_URL;
const TARGET_LANG = process.env.TARGET_LANG || "ca";

if (!DATABASE_URL) {
  console.error(
    "❌ Error: Falta DATABASE_URL o DIRECT_URL en las variables de entorno"
  );
  process.exit(1);
}

// Extraer credenciales de DATABASE_URL
// postgresql://user:password@host:port/database
const urlMatch = DATABASE_URL.match(
  /postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/
);
if (!urlMatch) {
  console.error("❌ Error: No se pudo parsear DATABASE_URL");
  process.exit(1);
}

const [, dbUser, dbPassword, dbHost, dbPort, dbName] = urlMatch;
const SUPABASE_URL = `https://${dbHost}`;
const SUPABASE_KEY = dbPassword; // Usar la contraseña como API key temporal

console.log("DEBUG - DATABASE_URL:", DATABASE_URL);
console.log("DEBUG - dbHost:", dbHost);
console.log("DEBUG - SUPABASE_URL:", SUPABASE_URL);
console.log("DEBUG - TABLE:", "StrongEntry");

const FIELDS_TO_TRANSLATE = [
  "definition",
  "exegesis",
  "explanation",
  "kjvDefinition",
  "strongsDef",
  "strongsDerivation",
];

// Función para traducir con MyMemory API
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
    // 1. Obtener todos los Strong en inglés
    console.log(`\n📥 Obteniendo Strong entries en inglés...`);
    const getResponse = await axios.get(
      `${SUPABASE_URL}/rest/v1/StrongEntry?definitionLang=eq.en&select=strong,language,lemma,translit,pronunciation,morphology,speechLang,definition,exegesis,explanation,kjvDefinition,strongsDef,strongsDerivation`,
      {
        headers: {
          apikey: process.env.SUPABASE_ANON_KEY || SUPABASE_KEY,
          Authorization: `Bearer ${process.env.SUPABASE_ANON_KEY || SUPABASE_KEY}`,
        },
      }
    );

    const strongEntriesEn = getResponse.data;
    console.log(`✓ Se obtuvieron ${strongEntriesEn.length} entradas en inglés`);

    // 2. Verificar si ya existen
    console.log(
      `\n🔍 Verificando si ya existen en ${TARGET_LANG.toUpperCase()}...`
    );
    const checkResponse = await axios.get(
      `${SUPABASE_URL}/rest/v1/StrongEntry?definitionLang=eq.${TARGET_LANG}&select=strong`,
      {
        headers: {
          apikey: process.env.SUPABASE_ANON_KEY || SUPABASE_KEY,
          Authorization: `Bearer ${process.env.SUPABASE_ANON_KEY || SUPABASE_KEY}`,
        },
      }
    );

    const existingCount = checkResponse.data.length;
    console.log(
      `   Ya existen ${existingCount} entradas en ${TARGET_LANG.toUpperCase()}`
    );

    if (existingCount > 0) {
      console.log(
        `\n⚠️  Ya hay entradas en ${TARGET_LANG.toUpperCase()}.`
      );
      console.log(`   Se sobrescribirán automáticamente.`);

      // Eliminar entradas existentes (por chunks)
      for (let i = 0; i < existingCount; i += 1000) {
        await axios.delete(
          `${SUPABASE_URL}/rest/v1/StrongEntry?definitionLang=eq.${TARGET_LANG}`,
          {
            headers: {
              apikey: process.env.SUPABASE_ANON_KEY || SUPABASE_KEY,
              Authorization: `Bearer ${process.env.SUPABASE_ANON_KEY || SUPABASE_KEY}`,
            },
          }
        );
      }
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

    // 4. Insertar en Supabase REST API
    console.log(`\n💾 Insertando en Supabase...`);

    if (translatedEntries.length === 0) {
      console.error("❌ No hay entradas para insertar");
      process.exit(1);
    }

    const chunkSize = 100;
    let insertedCount = 0;

    for (let i = 0; i < translatedEntries.length; i += chunkSize) {
      const chunk = translatedEntries.slice(i, i + chunkSize);

      try {
        await axios.post(
          `${SUPABASE_URL}/rest/v1/StrongEntry`,
          chunk,
          {
            headers: {
              apikey: process.env.SUPABASE_ANON_KEY || SUPABASE_KEY,
              Authorization: `Bearer ${process.env.SUPABASE_ANON_KEY || SUPABASE_KEY}`,
              "Content-Type": "application/json",
              Prefer: "resolution=merge-duplicates",
            },
          }
        );

        insertedCount += chunk.length;
        console.log(
          `  ✓ Insertadas ${insertedCount}/${translatedEntries.length} entradas`
        );
      } catch (insertError) {
        console.error(
          `❌ Error insertando chunk: ${insertError.response?.data?.message || insertError.message}`
        );
        throw insertError;
      }

      // Pausa entre chunks
      if (i + chunkSize < translatedEntries.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

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
    if (error.response?.data) {
      console.error("Detalles:", error.response.data);
    }
    process.exit(1);
  }
}

main();
