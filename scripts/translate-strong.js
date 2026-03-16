const { createClient } = require("@supabase/supabase-js");
const axios = require("axios");
require("dotenv").config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const TARGET_LANG = process.env.TARGET_LANG || "ca";
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY; // Opcional: para mejor rate limit

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const FIELDS_TO_TRANSLATE = [
  "definition",
  "exegesis",
  "explanation",
  "kjvDefinition",
  "strongsDef",
  "strongsDerivation",
];

// Función para traducir con Google Translate API (gratuita)
async function translateText(text, targetLang = "ca") {
  if (!text || text.trim() === "") return null;

  try {
    // Opción 1: Google Translate API (requiere clave pero mejor rate limit)
    if (GOOGLE_API_KEY) {
      const response = await axios.post(
        `https://translation.googleapis.com/language/translate/v2?key=${GOOGLE_API_KEY}`,
        {
          q: text,
          target: targetLang,
          source: "en",
        }
      );
      return response.data.data.translations[0].translatedText;
    }

    // Opción 2: MyMemory API (gratis, sin clave, pero más lento)
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
    definitionLang: targetLang,
    createdAt: new Date().toISOString(),
  };

  for (const field of FIELDS_TO_TRANSLATE) {
    const originalText = entryEn[field];
    if (originalText) {
      process.stdout.write(`  Traduciendo ${field}... `);
      const translated = await translateText(originalText, targetLang);
      entryTranslated[field] = translated;
      console.log("✓");
      // Pausa para evitar rate limiting
      await new Promise((resolve) => setTimeout(resolve, 500));
    } else {
      entryTranslated[field] = null;
    }
  }

  return entryTranslated;
}

async function main() {
  console.log(`\n🔄 INICIANDO TRADUCCIÓN DE STRONG: EN → ${TARGET_LANG.toUpperCase()}`);
  console.log("=".repeat(70));

  // 1. Obtener todos los Strong en inglés
  console.log(`\n📥 Obteniendo Strong entries en inglés...`);
  try {
    const { data: strongEntriesEn, error } = await supabase
      .from("StrongEntry")
      .select(
        "strong, language, lemma, translit, pronunciation, morphology, speechLang, definition, exegesis, explanation, kjvDefinition, strongsDef, strongsDerivation"
      )
      .eq("definitionLang", "en");

    if (error) throw error;

    console.log(`✓ Se obtuvieron ${strongEntriesEn.length} entradas en inglés`);

    // 2. Verificar si ya existen
    console.log(`\n🔍 Verificando si ya existen en ${TARGET_LANG.toUpperCase()}...`);
    const { data: existingEntries, error: checkError } = await supabase
      .from("StrongEntry")
      .select("strong", { count: "exact" })
      .eq("definitionLang", TARGET_LANG);

    if (checkError) throw checkError;

    const existingCount = existingEntries?.length || 0;
    console.log(`   Ya existen ${existingCount} entradas en ${TARGET_LANG.toUpperCase()}`);

    if (existingCount > 0) {
      console.log(
        `\n⚠️  Ya hay entradas en ${TARGET_LANG.toUpperCase()}.`
      );
      console.log(`   En CI/CD se sobrescribirán automáticamente.`);
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

    // 4. Insertar en Supabase
    console.log(`\n💾 Insertando en Supabase...`);

    if (translatedEntries.length === 0) {
      console.error("❌ No hay entradas para insertar");
      process.exit(1);
    }

    // Dividir en chunks de 1000 para evitar límites de payload
    const chunkSize = 1000;
    let insertedCount = 0;

    for (let i = 0; i < translatedEntries.length; i += chunkSize) {
      const chunk = translatedEntries.slice(i, i + chunkSize);
      const { error: upsertError } = await supabase
        .from("StrongEntry")
        .upsert(chunk, { ignoreDuplicates: false });

      if (upsertError) throw upsertError;

      insertedCount += chunk.length;
      console.log(
        `  ✓ Insertadas ${insertedCount}/${translatedEntries.length} entradas`
      );
    }

    // 5. Resumen final
    console.log("\n" + "=".repeat(70));
    console.log("✅ TRADUCCIÓN COMPLETADA");
    console.log(`   Idioma destino: ${TARGET_LANG.toUpperCase()}`);
    console.log(`   Entradas traducidas: ${translatedEntries.length}`);
    console.log(`   Errores: ${errors.length}`);
    if (errors.length > 0) {
      console.log("\n   Errores encontrados:");
      errors.slice(0, 5).forEach(([strong, error]) => {
        console.log(`   - ${strong}: ${error}`);
      });
      if (errors.length > 5) {
        console.log(`   ... y ${errors.length - 5} más`);
      }
    }
    console.log("=".repeat(70) + "\n");
  } catch (error) {
    console.error(`❌ Error fatal: ${error.message}`);
    process.exit(1);
  }
}

main();
