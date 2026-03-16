const { createClient } = require("@supabase/supabase-js");
const axios = require("axios");
const pLimit = require("p-limit");
require("dotenv").config();

// ═══════════════════════════════════════════════════════════════════
// CONFIGURACIÓN
// ═══════════════════════════════════════════════════════════════════

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const TARGET_LANG = process.env.TARGET_LANG || "ca";
const DEEPL_API_KEY = process.env.DEEPL_API_KEY; // ← Declaramos esto para evitar el error

// Validar variables requeridas
if (!SUPABASE_URL) {
  console.error("❌ Error: Falta SUPABASE_URL");
  process.exit(1);
}

if (!SUPABASE_ANON_KEY) {
  console.error("❌ Error: Falta SUPABASE_ANON_KEY");
  process.exit(1);
}

console.log(`🔗 Conectando a: ${SUPABASE_URL}`);

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const FIELDS_TO_TRANSLATE = [
  "definition",
  "exegesis",
  "explanation",
  "kjvDefinition",
  "strongsDef",
  "strongsDerivation",
];

// ═══════════════════════════════════════════════════════════════════
// TRADUCCIÓN (Soporta DeepL si hay API, sino usa MyMemory)
// ═══════════════════════════════════════════════════════════════════

async function translateText(text, targetLang = "ca") {
  if (!text || text.trim() === "") return null;

  try {
    if (DEEPL_API_KEY) {
      // DeepL (más rápido y mejor)
      const response = await axios.post(
        "https://api-free.deepl.com/v2/translate",
        {
          text: [text],
          target_lang: targetLang === "ca" ? "ES" : targetLang.toUpperCase(),
          source_lang: "EN",
        },
        {
          headers: {
            Authorization: `DeepL-Auth-Key ${DEEPL_API_KEY}`,
            "Content-Type": "application/json"
          },
        }
      );
      return response.data.translations[0].text;
    } else {
      // MyMemory (gratis)
      const encodedText = encodeURIComponent(text.substring(0, 500));
      const response = await axios.get(
        `https://api.mymemory.translated.net/get?q=${encodedText}&langpair=en|${targetLang}`,
        { timeout: 10000 }
      );
      if (response.data.responseStatus === 200) {
        return response.data.responseData.translatedText;
      }
      return null;
    }
  } catch (error) {
    if (error.response?.status === 429) {
      console.log("⏳ Rate limit, esperando 5 segundos...");
      await new Promise(r => setTimeout(r, 5000));
      return translateText(text, targetLang); 
    }
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

  // Traducir campos en PARALELO
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

// ═══════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════

async function main() {
  console.log(`\n🔄 INICIANDO TRADUCCIÓN DE STRONG: EN → ${TARGET_LANG.toUpperCase()}`);
  console.log(`   API: ${DEEPL_API_KEY ? "DeepL" : "MyMemory (gratis)"}`);
  console.log(`   Concurrencia: 5 entradas en paralelo (para evitar rate limit)`);
  console.log("=".repeat(70));

  try {
    // 1. Test de conexión
    console.log(`\n🔌 Probando conexión a Supabase...`);
    const { count, error: countError } = await supabase
      .from("StrongEntry")
      .select("*", { count: "exact", head: true });
    
    if (countError) throw new Error(`Error de conexión: ${countError.message}`);
    console.log(`✓ Conexión OK. Total registros en StrongEntry: ${count}`);

    // 2. Obtener Strong en inglés
    console.log(`\n📥 Obteniendo Strong entries en inglés...`);
    const { data: strongEntriesEn, error: fetchError } = await supabase
      .from("StrongEntry")
      .select("strong, language, lemma, translit, pronunciation, morphology, speechLang, definition, exegesis, explanation, kjvDefinition, strongsDef, strongsDerivation")
      .eq("definitionLang", "en");

    if (fetchError) throw new Error(`Error obteniendo datos: ${fetchError.message}`);
    
    if (!strongEntriesEn || strongEntriesEn.length === 0) {
      console.log("⚠️ No se encontraron entradas en inglés (definitionLang='en')");
      process.exit(0);
    }
    
    console.log(`✓ Se obtuvieron ${strongEntriesEn.length} entradas en inglés`);

    // 3. Traducir (con límite de concurrencia de 5)
    console.log(`\n🌐 Traduciendo...`);
    const limit = pLimit(5); 
    const startTime = Date.now();
    let processed = 0;

    const translationPromises = strongEntriesEn.map((entryEn) =>
      limit(async () => {
        try {
          const result = await translateStrongEntry(entryEn, TARGET_LANG);
          processed++;
          
          if (processed % 20 === 0) {
            const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
            console.log(`⏳ ${processed}/${strongEntriesEn.length} traducidas (${elapsed} min)`);
          }
          
          return result;
        } catch (error) {
          console.error(`❌ Error en ${entryEn.strong}: ${error.message}`);
          return null;
        }
      })
    );

    const translatedEntries = (await Promise.all(translationPromises)).filter(Boolean);
    console.log(`\n✓ Se tradujeron ${translatedEntries.length} entradas`);

    // 4. Insertar/Actualizar en Supabase
    console.log(`\n💾 Guardando en Supabase...`);
    if (translatedEntries.length > 0) {
      const chunkSize = 200;
      let insertedCount = 0;

      for (let i = 0; i < translatedEntries.length; i += chunkSize) {
        const chunk = translatedEntries.slice(i, i + chunkSize);
        
        // Upsert para insertar o actualizar si ya existe la llave primaria
        const { error: insertError } = await supabase
          .from("StrongEntry")
          .upsert(chunk, { onConflict: 'strong, definitionLang' }); // Ajusta onConflict si es necesario

        if (insertError) throw new Error(`Error insertando chunk: ${insertError.message}`);

        insertedCount += chunk.length;
        console.log(`  ✓ ${insertedCount}/${translatedEntries.length} guardadas`);
      }
    }

    const totalTime = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
    console.log("\n✅ TRADUCCIÓN COMPLETADA");
    console.log(`   Tiempo total: ${totalTime} minutos`);

  } catch (error) {
    console.error(`\n❌ Error fatal: ${error.message}`);
    process.exit(1);
  }
}

main();
