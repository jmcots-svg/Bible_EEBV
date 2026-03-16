const { createClient } = require("@supabase/supabase-js");
const { GoogleGenAI } = require("@google/genai");
const pLimit = require("p-limit");
require("dotenv").config();

// ═══════════════════════════════════════════════════════════════════
// CONFIGURACIÓN
// ═══════════════════════════════════════════════════════════════════
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const TARGET_LANG = process.env.TARGET_LANG || "es";
const GEMINI_KEYS = (process.env.GEMINI_API_KEYS || "").split(",").map(k => k.trim()).filter(Boolean);

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || GEMINI_KEYS.length === 0) {
  console.error("❌ Error: Faltan variables de entorno");
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
// TRADUCTOR BATCH (Lotes de 4 entradas)
// ═══════════════════════════════════════════════════════════════════

let globalCallCounter = 0;

async function translateBatchWithGemini(entriesBatch, retries = 3) {
  const payloadToTranslate = entriesBatch.map(entry => ({
    id: entry.id,
    title: entry.title || "",
    content: entry.content || "",
    contentHtml: entry.contentHtml || ""
  }));

  const languageName = TARGET_LANG === 'es' ? 'Spanish' : TARGET_LANG === 'ca' ? 'Catalan' : TARGET_LANG;

  const promptDelSistema = `
  You are an expert biblical translator. Translate the following JSON ARRAY of objects from English to ${languageName}.
  Rules:
  1. The input is a JSON array. You MUST return a JSON array of the exact same length.
  2. DO NOT translate or modify the "id" fields. Keep them exactly as they are.
  3. Translate the values of "title", "content", and "contentHtml".
  4. For "contentHtml", DO NOT translate or modify any HTML tags.
  5. Maintain theological accuracy and formal biblical tone.
  6. Return ONLY a valid JSON array. DO NOT add markdown blocks or extra text.
  `;

  for (let attempt = 1; attempt <= retries; attempt++) {
    const apiKey = getNextApiKey();
    
    // 🔄 ROTACIÓN ESPACIADA: 1 de cada 60 llamadas usa el 2.5 Flash para dar respiro
    globalCallCounter++;
    const modelToUse = (globalCallCounter % 60 === 0) ? 'gemini-2.5-flash' : 'gemini-3.1-flash-lite-preview';
    
    try {
      const ai = new GoogleGenAI({ apiKey: apiKey });

      const response = await ai.models.generateContent({
        model: modelToUse,
        contents: JSON.stringify(payloadToTranslate),
        config: {
          systemInstruction: promptDelSistema,
          temperature: 0.2, 
          responseMimeType: "application/json", 
        },
      });

      let responseText = response.text;
      
      // 🧹 Limpiador de alucinaciones JSON
      responseText = responseText.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim();
      
      const translatedArray = JSON.parse(responseText);
      
      if (!Array.isArray(translatedArray) || translatedArray.length !== entriesBatch.length) {
        throw new Error("La IA no devolvió el array completo.");
      }

      return translatedArray;

    } catch (error) {
      const isRateLimit = error.status === 429 || (error.response && error.response.status === 429);
      const isOverloaded = error.status === 503 || (error.response && error.response.status === 503);
      const isJsonError = error instanceof SyntaxError;
      
      let errorMsg = error.message;
      if (isJsonError) errorMsg = "JSON malformado";

      console.warn(`⚠️ Intento ${attempt} falló (Key: ...${apiKey.slice(-4)}). Error: ${errorMsg}`);
      
      if (attempt < retries) {
        if (isRateLimit || isOverloaded) {
          console.log(`   ⏳ Servidor/Cuota límite. Pausando 60s...`);
          await sleep(61000); 
        } else {
          await sleep(4000);
        }
      } else {
        console.error(`❌ Fallo definitivo traduciendo lote.`);
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

function chunkArray(array, size) {
  const result = [];
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
}

// ═══════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════
async function main() {
  console.log(`\n🔄 INICIANDO TRADUCCIÓN DE COMENTARIOS: EN → ${TARGET_LANG.toUpperCase()}`);
  console.log(`   Modelo: gemini-3.1-flash-lite-preview`);
  console.log(`   Keys en el Pool: ${GEMINI_KEYS.length}`);
  console.log("=".repeat(70));

  try {
    console.log(`📥 Obteniendo comentarios en inglés...`);
    const enEntries = await getAllEntries("en");
    
    console.log(`🔍 Verificando existentes en ${TARGET_LANG}...`);
    const targetEntries = await getAllEntries(TARGET_LANG);
    
    const existingSet = new Set(targetEntries.map(e => `${e.sourceId}-${e.divId}`));
    
    // 👈 FILTRO GENERAL ABIERTO: Traduce todo lo que falte
    const pendingEntries = enEntries.filter(e => !existingSet.has(`${e.sourceId}-${e.divId}`));
    
    console.log(`   Pendientes: ${pendingEntries.length} de ${enEntries.length}\n`);

    if (pendingEntries.length === 0) {
      console.log("✅ ¡Todo está traducido!");
      process.exit(0);
    }

    // Lotes de 4 en 4
    const BATCH_SIZE = 4;
    const entryBatches = chunkArray(pendingEntries, BATCH_SIZE);
    
    // Concurrencia de 2. Velocidad crucero segura.
    const limit = pLimit(2); 
    let processed = 0;
    let dbBuffer = [];

    const translationPromises = entryBatches.map((batchEn) =>
      limit(async () => {
        await sleep(4000); // 👈 Freno de seguridad: 4 segundos entre llamadas

        const translatedBatch = await translateBatchWithGemini(batchEn);
        
        if (translatedBatch && translatedBatch.length > 0) {
          translatedBatch.forEach(transItem => {
            const originalEntry = batchEn.find(e => e.id === transItem.id);
            if (originalEntry) {
              dbBuffer.push({
                sourceId: originalEntry.sourceId,
                language: TARGET_LANG,
                bookAbbr: originalEntry.bookAbbr,
                bookOrder: originalEntry.bookOrder,
                chapter: originalEntry.chapter,
                verseStart: originalEntry.verseStart,
                verseEnd: originalEntry.verseEnd,
                title: transItem.title || null,
                content: transItem.content || originalEntry.content, 
                contentHtml: transItem.contentHtml || null,
                divId: originalEntry.divId,
                sectionType: originalEntry.sectionType,
                volume: originalEntry.volume
              });
              processed++;
            }
          });
        }
        
        console.log(`⏳ Procesados: ${processed}/${pendingEntries.length}`);

        if (dbBuffer.length >= 20) {
          const toInsert = dbBuffer.splice(0, 20);
          const { error } = await supabase.from("CommentaryEntry").insert(toInsert);
          if (error) console.error(`⚠️ Error guardando batch BD:`, error.message);
          else console.log(`   💾 Lote de 20 guardado en BD.`);
        }
      })
    );

    await Promise.all(translationPromises);

    if (dbBuffer.length > 0) {
      const { error } = await supabase.from("CommentaryEntry").insert(dbBuffer);
      if (error) console.error(`⚠️ Error guardando último batch BD:`, error.message);
      else console.log(`   💾 Últimos guardados en BD.`);
    }

    console.log("\n✅ TRADUCCIÓN COMPLETADA");

  } catch (error) {
    console.error(`\n❌ Error fatal: ${error.message}`);
    process.exit(1);
  }
}

main();
