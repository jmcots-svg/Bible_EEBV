const { createClient } = require("@supabase/supabase-js");
const axios = require("axios");
const pLimit = require("p-limit");
require("dotenv").config();

const DATABASE_URL = process.env.DATABASE_URL || process.env.DIRECT_URL;
const TARGET_LANG = process.env.TARGET_LANG || "ca";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const DEEPL_API_KEY = process.env.DEEPL_API_KEY;

if (!DATABASE_URL || !SUPABASE_ANON_KEY) {
  console.error(
    "❌ Error: Falta DATABASE_URL y/o SUPABASE_ANON_KEY"
  );
  process.exit(1);
}

const urlMatch = DATABASE_URL.match(/postgresql:\/\/[^@]+@([^:]+)/);
const SUPABASE_URL = urlMatch ? `https://${urlMatch[1]}` : null;

if (!SUPABASE_URL) {
  console.error("❌ Error: No se pudo extraer SUPABASE_URL de DATABASE_URL");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const FIELDS_TO_TRANSLATE = [
  "definition",
  "exegesis",
  "explanation",
  "kjvDefinition",
  "strongsDef",
  "strongsDerivation",
];

// Usar DeepL si está disponible, sino MyMemory
async function translateText(text, targetLang = "ca") {
  if (!text || text.trim() === "") return null;

  try {
    if (DEEPL_API_KEY) {
      // DeepL (más rápido y mejor)
      const response = await axios.post(
        "https://api-free.deepl.com/v1/translate",
        {
          text: text,
          target_lang: targetLang === "ca" ? "ES" : targetLang.toUpperCase(), // DeepL no tiene catalán, usa español
          source_lang: "EN",
        },
        {
          headers: {
            Authorization: `DeepL-Auth-Key ${DEEPL_API_KEY}`,
          },
        }
      );
      return response.data.translations[0].text;
    } else {
      // MyMemory (gratis)
      const encodedText = encodeURIComponent(text);
      const response = await axios.get(
        `https://api.mymemory.translated.net/get?q=${encodedText}&langpair=en|${targetLang}`
      );
      if (response.data.responseStatus === 200) {
        return response.data.responseData.translatedText;
      }
    }
  } catch (error) {
    console.error(`⚠️ Error en traducción: ${error.message}`);
    return null;
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

  // Traducir campos en PARALELO (no secuencial)
  await Promise.all(
    FIELDS_TO_TRANSLATE.map(async (field) => {
      const originalText = entryEn[field];
      if (originalText) {
        const translated = await translateText(originalText, targetLang);
        entryTranslated[field] = translated;
      }
    })
  );

  return entryTranslated;
}

async function main() {
  console.log(
    `\n🔄 INICIANDO TRADUCCIÓN DE STRONG: EN → ${TARGET_LANG.toUpperCase()}`
  );
  console.log(`   API: ${DEEPL_API_KEY ? "DeepL" : "MyMemory"}`);
  console.log(`   Concurrencia: 20 entradas en paralelo`);
  console.log("=".repeat(70));

  try {
    // 1. Obtener Strong en inglés
    console.log(`\n📥 Obteniendo Strong entries en inglés...`);
    const { data: strongEntriesEn, error: fetchError } = await supabase
      .from("StrongEntry")
      .select(
        "strong, language, lemma, translit, pronunciation, morphology, speechLang, definition, exegesis, explanation, kjvDefinition, strongsDef, strongsDerivation"
      )
      .eq("definitionLang", "en");

    if (fetchError) throw new Error(`Error obteniendo datos: ${fetchError.message}`);
    console.log(`✓ Se obtuvieron ${strongEntriesEn.length} entradas en inglés`);

    // 2. Verificar si ya existen
    console.log(
      `\n🔍 Verificando si ya existen en ${TARGET_LANG.toUpperCase()}...`
    );
    const { data: existingEntries, error: checkError } = await supabase
      .from("StrongEntry")
      .select("strong")
      .eq("definitionLang", TARGET_LANG);

    if (checkError) throw new Error(`Error verificando: ${checkError.message}`);

    const existingCount = existingEntries?.length || 0;
    console.log(`   Ya existen ${existingCount} entradas`);

    if (existingCount > 0) {
      console.log(`   Eliminando entradas previas...`);
      const { error: deleteError } = await supabase
        .from("StrongEntry")
        .delete()
        .eq("definitionLang", TARGET_LANG);
      if (deleteError) throw deleteError;
      console.log(`   ✓ Eliminadas`);
    }

    // 3. Traducir EN PARALELO
    console.log(`\n🌐 Traduciendo ${strongEntriesEn.length} entradas (en paralelo)...`);
    console.log("=".repeat(70));

    const limit = pLimit(20); // Máximo 20 entradas en paralelo
    const translationPromises = strongEntriesEn.map((entryEn, index) =>
      limit(async () => {
        try {
          if ((index + 1) % 100 === 0) {
            console.log(`⏳ ${index + 1}/${strongEntriesEn.length} entradas procesadas...`);
          }
          return await translateStrongEntry(entryEn, TARGET_LANG);
        } catch (error) {
          console.error(`❌ Error en ${entryEn.strong}: ${error.message}`);
          return null;
        }
      })
    );

    const translatedEntries = (await Promise.all(translationPromises)).filter(Boolean);
    console.log(`\n✓ Se tradujeron ${translatedEntries.length} entradas`);

    // 4. Insertar EN BATCH
    console.log(`\n💾 Insertando ${translatedEntries.length} entradas en Supabase...`);

    if (translatedEntries.length === 0) {
      console.error("❌ No hay entradas para insertar");
      process.exit(1);
    }

    const chunkSize = 500; // Chunks más grandes = más rápido
    let insertedCount = 0;
    const startInsert = Date.now();

    for (let i = 0; i < translatedEntries.length; i += chunkSize) {
      const chunk = translatedEntries.slice(i, i + chunkSize);
      const { error: insertError } = await supabase
        .from("StrongEntry")
        .insert(chunk);

      if (insertError) throw new Error(`Error insertando: ${insertError.message}`);

      insertedCount += chunk.length;
      const elapsed = ((Date.now() - startInsert) / 1000 / 60).toFixed(1);
      console.log(
        `  ✓ ${insertedCount}/${translatedEntries.length} entradas (${elapsed} min)`
      );
    }

    // 5. Resumen
    const totalTime = ((Date.now() - startInsert) / 1000 / 60).toFixed(1);
    console.log("\n" + "=".repeat(70));
    console.log("✅ TRADUCCIÓN COMPLETADA");
    console.log(`   Entradas: ${translatedEntries.length}`);
    console.log(`   Tiempo total: ${totalTime} minutos`);
    console.log("=".repeat(70) + "\n");
  } catch (error) {
    console.error(`\n❌ Error fatal: ${error.message}`);
    process.exit(1);
  }
}

main();
