const { createClient } = require("@supabase/supabase-js");
const { translate } = require("@vitalets/google-translate-api");
const pLimit = require("p-limit");
require("dotenv").config();

// ═══════════════════════════════════════════════════════════════════
// CONFIGURACIÓN
// ═══════════════════════════════════════════════════════════════════

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const TARGET_LANG = process.env.TARGET_LANG || "ca";

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
// TRADUCCIÓN CON GOOGLE TRANSLATE (sin API key)
// ═══════════════════════════════════════════════════════════════════

// Esperar un tiempo entre requests para evitar bloqueos
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function translateText(text, targetLang = "ca", retries = 3) {
  if (!text || text.trim() === "") return null;

  // Truncar texto muy largo
  const textToTranslate = text.substring(0, 1000);

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const { text: translated } = await translate(textToTranslate, {
        from: "en",
        to: targetLang,
      });
      return translated;
    } catch (error) {
      const isRateLimit = error.message?.includes("429") || 
                          error.message?.includes("TooManyRequests");
      
      if (isRateLimit && attempt < retries) {
        // Espera exponencial: 10s, 20s, 40s
        const waitTime = 10000 * attempt;
        console.log(`⏳ Rate limit, esperando ${waitTime/1000}s (intento ${attempt}/${retries})...`);
        await sleep(waitTime);
      } else if (attempt === retries) {
        console.error(`⚠️ Error traduciendo después de ${retries} intentos: ${error.message}`);
        return null;
      }
    }
  }
  return null;
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

  // Traducir campos de forma SECUENCIAL para evitar rate limit
  for (const field of FIELDS_TO_TRANSLATE) {
    const originalText = entryEn[field];
    if (originalText) {
      entryTranslated[field] = await translateText(originalText, targetLang);
      // Pequeña pausa entre campos del mismo entry
      await sleep(200);
    }
  }

  return entryTranslated;
}

// ═══════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════

async function main() {
  console.log(`\n🔄 INICIANDO TRADUCCIÓN DE STRONG: EN → ${TARGET_LANG.toUpperCase()}`);
  console.log(`   API: Google Translate (sin API key)`);
  console.log(`   Concurrencia: 3 entradas en paralelo`);
  console.log("=".repeat(70));

  try {
    // 1. Test de conexión
    console.log(`\n🔌 Probando conexión a Supabase...`);
    const { count, error: countError } = await supabase
      .from("StrongEntry")
      .select("*", { count: "exact", head: true });

    if (countError) throw new Error(`Error de conexión: ${countError.message}`);
    console.log(`✓ Conexión OK. Total registros: ${count}`);

    // 2. Obtener Strong en inglés
    console.log(`\n📥 Obteniendo Strong entries en inglés...`);
    const { data: strongEntriesEn, error: fetchError } = await supabase
      .from("StrongEntry")
      .select(
        "strong, language, lemma, translit, pronunciation, morphology, speechLang, definition, exegesis, explanation, kjvDefinition, strongsDef, strongsDerivation"
      )
      .eq("definitionLang", "en");

    if (fetchError) throw new Error(`Error obteniendo datos: ${fetchError.message}`);

    if (!strongEntriesEn || strongEntriesEn.length === 0) {
      console.log("⚠️ No se encontraron entradas en inglés");
      process.exit(0);
    }

    console.log(`✓ ${strongEntriesEn.length} entradas en inglés obtenidas`);

    // 3. Verificar cuáles ya están traducidas (para reanudar si falla)
    console.log(`\n🔍 Verificando traducciones existentes en ${TARGET_LANG}...`);
    const { data: existingEntries } = await supabase
      .from("StrongEntry")
      .select("strong")
      .eq("definitionLang", TARGET_LANG);

    const existingSet = new Set((existingEntries || []).map(e => e.strong));
    console.log(`   Ya traducidas: ${existingSet.size}`);

    // Filtrar solo las que faltan
    const pendingEntries = strongEntriesEn.filter(e => !existingSet.has(e.strong));
    console.log(`   Pendientes: ${pendingEntries.length}`);

    if (pendingEntries.length === 0) {
      console.log("✅ ¡Todas las entradas ya están traducidas!");
      process.exit(0);
    }

    // 4. Traducir con concurrencia baja
    console.log(`\n🌐 Traduciendo ${pendingEntries.length} entradas...`);
    console.log("=".repeat(70));

    // Solo 3 en paralelo para no saturar Google
    const limit = pLimit(3);
    const startTime = Date.now();
    let processed = 0;
    let buffer = []; // Buffer para insertar en lotes

    const translationPromises = pendingEntries.map((entryEn) =>
      limit(async () => {
        try {
          const result = await translateStrongEntry(entryEn, TARGET_LANG);
          processed++;
          buffer.push(result);

          if (processed % 10 === 0) {
            const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
            console.log(`⏳ ${processed}/${pendingEntries.length} traducidas (${elapsed} min)`);
          }

          // Insertar cada 50 entradas (no esperar al final)
          if (buffer.length >= 50) {
            const toInsert = buffer.splice(0, 50);
            const { error: insertError } = await supabase
              .from("StrongEntry")
              .insert(toInsert);
            if (insertError) {
              console.error(`⚠️ Error guardando batch: ${insertError.message}`);
            } else {
              console.log(`   💾 Guardadas ${processed} entradas acumuladas`);
            }
          }

          return result;
        } catch (error) {
          console.error(`❌ Error en ${entryEn.strong}: ${error.message}`);
          return null;
        }
      })
    );

    await Promise.all(translationPromises);

    // 5. Insertar el buffer restante
    if (buffer.length > 0) {
      console.log(`\n💾 Guardando ${buffer.length} entradas restantes...`);
      const { error: insertError } = await supabase
        .from("StrongEntry")
        .insert(buffer);
      if (insertError) throw new Error(`Error insertando: ${insertError.message}`);
    }

    const totalTime = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
    console.log("\n" + "=".repeat(70));
    console.log("✅ TRADUCCIÓN COMPLETADA");
    console.log(`   Total procesadas: ${processed}`);
    console.log(`   Tiempo total: ${totalTime} minutos`);
    console.log("=".repeat(70));

  } catch (error) {
    console.error(`\n❌ Error fatal: ${error.message}`);
    process.exit(1);
  }
}

main();
