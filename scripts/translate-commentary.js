const { createClient } = require("@supabase/supabase-js");
const { GoogleGenAI } = require("@google/genai"); // 👈 El SDK oficial que usas
const pLimit = require("p-limit");
require("dotenv").config();

// ═══════════════════════════════════════════════════════════════════
// CONFIGURACIÓN
// ═══════════════════════════════════════════════════════════════════
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const TARGET_LANG = process.env.TARGET_LANG || "ca";
const GEMINI_KEYS = (process.env.GEMINI_API_KEYS || "").split(",").map(k => k.trim()).filter(Boolean);

// El modelo que prefieres usar
const TARGET_MODEL = 'gemini-3.1-flash-lite-preview'; 

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || GEMINI_KEYS.length === 0) {
  console.error("❌ Error: Faltan variables de entorno (Supabase o Gemini Keys)");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ═══════════════════════════════════════════════════════════════════
// POOL DE KEYS (ROUND-ROBIN)
// ═══════════════════════════════════════════════════════════════════
let currentKeyIndex = 0;

function getNextApiKey() {
  const key = GEMINI_KEYS[currentKeyIndex];
  currentKeyIndex = (currentKeyIndex + 1) % GEMINI_KEYS.length;
  return key;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ═══════════════════════════════════════════════════════════════════
// TRADUCTOR CON SDK OFICIAL Y JSON MODE
// ═══════════════════════════════════════════════════════════════════
async function translateWithGeminiSDK(entry, retries = 3) {
  const payloadToTranslate = {
    title: entry.title || "",
    content: entry.content || "",
    contentHtml: entry.contentHtml || ""
  };

  // 👈 Añade esta línea justo antes del prompt para saber el nombre del idioma
  const languageName = TARGET_LANG === 'es' ? 'Spanish' : TARGET_LANG === 'ca' ? 'Catalan' : TARGET_LANG;

  const promptDelSistema = `
  You are an expert biblical translator. Translate the following JSON object from English to ${languageName}.
  Rules:
  1. Translate the values of "title", "content", and "contentHtml".
  2. For "contentHtml", DO NOT translate or modify any HTML tags (like <p>, <strong>, <i>, <a>). Only translate the text inside them.
  3. Maintain theological accuracy and formal biblical tone.
  4. DO NOT add any conversational text, greetings, introductions, or notes.
  5. Return ONLY a valid JSON with the exact same keys.
  `;

  for (let attempt = 1; attempt <= retries; attempt++) {
    const apiKey = getNextApiKey();
    
    try {
      const ai = new GoogleGenAI({ apiKey: apiKey });

      const response = await ai.models.generateContent({
        model: TARGET_MODEL,
        contents: JSON.stringify(payloadToTranslate),
        config: {
          systemInstruction: promptDelSistema,
          temperature: 0.2, // 👈 Baja temperatura = traducción más precisa y menos creativa
          responseMimeType: "application/json", // 👈 MAGIA: Obliga al modelo a devolver JSON puro
        },
      });

      // El SDK nuevo usa .text para obtener el contenido directamente
      const responseText = response.text;
      
      // Parseamos el JSON devuelto
      const translatedJson = JSON.parse(responseText);
      return translatedJson;

    } catch (error) {
      const isRateLimit = error.status === 429 || (error.response && error.response.status === 429);
      console.warn(`⚠️ Intento ${attempt} falló (Key ...${apiKey.slice(-4)}). Error: ${error.message}`);
      
      if (attempt < retries) {
        if (isRateLimit) {
          console.log(`   ⏳ Límite por minuto alcanzado. Pausando 60 segundos para reiniciar cuota...`);
          await sleep(61000); // 👈 MAGIA: Espera un minuto entero para que Google nos perdone
        } else {
          await sleep(2000);
        }
      } else {
        console.error(`❌ Fallo definitivo traduciendo ID ${entry.id}`);
        return null;
      }
    }
  }
}

// ═══════════════════════════════════════════════════════════════════
// OBTENER DATOS PAGINADOS
// ═══════════════════════════════════════════════════════════════════
async function getAllEntries(lang) {
  const PAGE_SIZE = 1000;
  let allEntries = [];
  let page = 0;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from("CommentaryEntry")
      .select("*")
      .eq("language", lang)
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (error) throw error;

    if (data.length > 0) {
      allEntries = allEntries.concat(data);
      page++;
    } else {
      hasMore = false;
    }
  }
  return allEntries;
}

// ═══════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════
async function main() {
  console.log(`\n🔄 INICIANDO TRADUCCIÓN DE COMENTARIOS: EN → ${TARGET_LANG.toUpperCase()}`);
  console.log(`   Modelo: ${TARGET_MODEL}`);
  console.log(`   Keys en el Pool: ${GEMINI_KEYS.length}`);
  console.log("=".repeat(70));

  try {
    console.log(`📥 Obteniendo comentarios en inglés...`);
    const enEntries = await getAllEntries("en");
    
    console.log(`🔍 Verificando existentes en ${TARGET_LANG}...`);
    const caEntries = await getAllEntries(TARGET_LANG);
    
    // Set para saber cuáles existen (combinación única sourceId + divId)
    const existingSet = new Set(caEntries.map(e => `${e.sourceId}-${e.divId}`));

    // Reemplaza esto:
    // const pendingEntries = enEntries.filter(e => !existingSet.has(`${e.sourceId}-${e.divId}`));

    // Por esto (cambia el 4 por el ID de tu comentario nuevo):
    const TEST_SOURCE_ID = 4; 
    const pendingEntries = enEntries.filter(e => 
      e.sourceId === TEST_SOURCE_ID && !existingSet.has(`${e.sourceId}-${e.divId}`)
    );
    
    console.log(`   Pendientes: ${pendingEntries.length} de ${enEntries.length}\n`);

    if (pendingEntries.length === 0) {
      console.log("✅ ¡Todo está traducido!");
      process.exit(0);
    }

    // Usamos concurrencia de 3 (para no golpear muy duro el rate limit por minuto, 
    // aunque rotemos keys, es mejor ir a paso seguro)
    const limit = pLimit(2); 
    let processed = 0;
    let buffer = [];

    const translationPromises = pendingEntries.map((entryEn) =>
      limit(async () => {
        await sleep(3500); // Pequeño respiro entre llamadas

        const translatedTexts = await translateWithGeminiSDK(entryEn);
        
        if (translatedTexts) {
          const newEntry = {
            sourceId: entryEn.sourceId,
            language: TARGET_LANG,
            bookAbbr: entryEn.bookAbbr,
            bookOrder: entryEn.bookOrder,
            chapter: entryEn.chapter,
            verseStart: entryEn.verseStart,
            verseEnd: entryEn.verseEnd,
            title: translatedTexts.title || null,
            content: translatedTexts.content || entryEn.content, 
            contentHtml: translatedTexts.contentHtml || null,
            divId: entryEn.divId,
            sectionType: entryEn.sectionType,
            volume: entryEn.volume
          };

          buffer.push(newEntry);
        }
        
        processed++;
        if (processed % 10 === 0) console.log(`⏳ Procesados: ${processed}/${pendingEntries.length}`);

        // Insertar en BD cada 20 registros
        if (buffer.length >= 20) {
          const toInsert = buffer.splice(0, 20);
          const { error } = await supabase.from("CommentaryEntry").insert(toInsert);
          if (error) console.error(`⚠️ Error guardando batch:`, error.message);
          else console.log(`   💾 Lote de 20 guardado en BD.`);
        }
      })
    );

    await Promise.all(translationPromises);

    // Guardar los restantes
    if (buffer.length > 0) {
      const { error } = await supabase.from("CommentaryEntry").insert(buffer);
      if (error) console.error(`⚠️ Error guardando último batch:`, error);
      else console.log(`   💾 Último lote guardado.`);
    }

    console.log("\n✅ TRADUCCIÓN COMPLETADA");

  } catch (error) {
    console.error(`\n❌ Error fatal: ${error.message}`);
    process.exit(1);
  }
}

main();
