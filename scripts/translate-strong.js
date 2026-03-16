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
// HELPERS
// ═══════════════════════════════════════════════════════════════════

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ═══════════════════════════════════════════════════════════════════
// PAGINACIÓN - Obtener TODOS los registros de Supabase
// ═══════════════════════════════════════════════════════════════════

async function getAllEntries(lang) {
  const PAGE_SIZE = 1000;
  let allEntries = [];
  let page = 0;
  let hasMore = true;

  while (hasMore) {
    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const { data, error } = await supabase
      .from("StrongEntry")
      .select(
        "strong, language, lemma, translit, pronunciation, morphology, " +
        "speechLang, definition, exegesis, explanation, kjvDefinition, " +
        "strongsDef, strongsDerivation"
      )
      .eq("definitionLang", lang)
      .range(from, to);

    if (error) throw new Error(`Error en paginación: ${error.message}`);

    if (data && data.length > 0) {
      allEntries = allEntries.concat(data);
      console.log(`   📄 Página ${page + 1}: ${data.length} entradas (total: ${allEntries.length})`);
      page++;
      hasMore = data.length === PAGE_SIZE; // Si devuelve menos de 1000, ya no hay más
    } else {
      hasMore = false;
    }
  }

  return allEntries;
}

async function getExistingStrongs(lang) {
  const PAGE_SIZE = 1000;
  let allStrongs = [];
  let page = 0;
  let hasMore = true;

  while (hasMore) {
    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const { data, error } = await supabase
      .from("StrongEntry")
      .select("strong")
      .eq("definitionLang", lang)
      .range(from, to);

    if (error) throw new Error(`Error verificando existentes: ${error.message}`);

    if (data && data.length > 0) {
      allStrongs = allStrongs.concat(data.map(e => e.strong));
      page++;
      hasMore = data.length === PAGE_SIZE;
    } else {
      hasMore = false;
    }
  }

  return new Set(allStrongs);
}

// ═══════════════════════════════════════════════════════════════════
// TRADUCCIÓN CON GOOGLE TRANSLATE
// ═══════════════════════════════════════════════════════════════════

async function translateText(text, targetLang = "ca", retries = 3) {
  if (!text || text.trim() === "") return null;

  const textToTranslate = text.substring(0, 1000);

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const { text: translated } = await translate(textToTranslate, {
        from: "en",
        to: targetLang,
      });
      return translated;
    } catch (error) {
      const isRateLimit =
        error.message?.includes("429") ||
        error.message?.includes("TooManyRequests");

      if (isRateLimit && attempt < retries) {
        const waitTime = 15000 * attempt; // 15s, 30s, 45s
        console.log(`⏳ Rate limit, esperando ${waitTime / 1000}s (intento ${attempt}/${retries})...`);
        await sleep(waitTime);
      } else if (attempt === retries) {
        console.error(`⚠️ Fallo traduciendo después de ${retries} intentos`);
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

  // Secuencial por campo para no saturar Google
  for (const field of FIELDS_TO_TRANSLATE) {
    if (entryEn[field]) {
      entryTranslated[field] = await translateText(entryEn[field], targetLang);
      await sleep(300); // 300ms entre campos
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

    // 2. Obtener TODAS las entradas en inglés (con paginación)
    console.log(`\n📥 Obteniendo TODAS las Strong entries en inglés...`);
    const strongEntriesEn = await getAllEntries("en");
    console.log(`✓ Total obtenidas: ${strongEntriesEn.length}`);

    // 3. Verificar cuáles ya están traducidas (para reanudar si falla)
    console.log(`\n🔍 Verificando traducciones existentes en ${TARGET_LANG}...`);
    const existingSet = await getExistingStrongs(TARGET_LANG);
    console.log(`   Ya traducidas: ${existingSet.size}`);

    const pendingEntries = strongEntriesEn.filter(e => !existingSet.has(e.strong));
    console.log(`   Pendientes:    ${pendingEntries.length}`);

    if (pendingEntries.length === 0) {
      console.log("✅ ¡Todas las entradas ya están traducidas!");
      process.exit(0);
    }

    // 4. Traducir con concurrencia baja
    console.log(`\n🌐 Traduciendo ${pendingEntries.length} entradas...`);
    console.log("=".repeat(70));

    const limit = pLimit(3); // Solo 3 en paralelo
    const startTime = Date.now();
    let processed = 0;
    let buffer = [];

    const translationPromises = pendingEntries.map((entryEn) =>
      limit(async () => {
        try {
          const result = await translateStrongEntry(entryEn, TARGET_LANG);
          processed++;
          buffer.push(result);

          if (processed % 10 === 0) {
            const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
            const remaining = pendingEntries.length - processed;
            const rate = processed / ((Date.now() - startTime) / 1000 / 60);
            const eta = (remaining / rate).toFixed(0);
            console.log(
              `⏳ ${processed}/${pendingEntries.length} ` +
              `(${elapsed} min transcurridos, ~${eta} min restantes)`
            );
          }

          // Guardar cada 50 entradas (no esperar al final)
          if (buffer.length >= 50) {
            const toInsert = buffer.splice(0, 50);
            const { error } = await supabase.from("StrongEntry").insert(toInsert);
            if (error) {
              console.error(`⚠️ Error guardando batch: ${error.message}`);
            } else {
              console.log(`   💾 Batch guardado (${processed} total procesadas)`);
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

    // 5. Guardar buffer restante
    if (buffer.length > 0) {
      console.log(`\n💾 Guardando ${buffer.length} entradas restantes...`);
      const { error } = await supabase.from("StrongEntry").insert(buffer);
      if (error) throw new Error(`Error insertando: ${error.message}`);
      console.log(`✓ Guardadas`);
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
