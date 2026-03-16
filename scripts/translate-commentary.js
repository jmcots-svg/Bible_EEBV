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
const GEMINI_KEYS = (process.env.GEMINI_API_KEYS || "").split(",").map(k => k.trim()).filter(Boolean);

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
// TRADUCTOR CON GEMINI 1.5 FLASH (JSON MODE)
// ═══════════════════════════════════════════════════════════════════
async function translateWithGemini(entry, retries = 3) {
  // Preparamos lo que queremos traducir
  const payloadToTranslate = {
    title: entry.title || "",
    content: entry.content || "",
    contentHtml: entry.contentHtml || ""
  };

  const prompt = `
  You are an expert biblical translator. Translate the following JSON object from English to Catalan (${TARGET_LANG}).
  Rules:
  1. Translate "title", "content", and "contentHtml".
  2. For "contentHtml", DO NOT translate or modify any HTML tags (like <p>, <strong>, <i>, <a>). Only translate the text inside them.
  3. Maintain theological accuracy.
  4. Return ONLY a valid JSON with the exact same keys.
  
  JSON to translate:
  ${JSON.stringify(payloadToTranslate)}
  `;

  for (let attempt = 1; attempt <= retries; attempt++) {
    const apiKey = getNextApiKey();
    try {
      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json" } // 👈 Obligamos a que devuelva JSON
        },
        { timeout: 30000 }
      );

      const responseText = response.data.candidates[0].content.parts[0].text;
      const translatedJson = JSON.parse(responseText);

      return translatedJson;

    } catch (error) {
      const isRateLimit = error.response?.status === 429;
      console.warn(`⚠️ Intento ${attempt} falló (Key terminada en ...${apiKey.slice(-4)}). Error: ${error.response?.status || error.message}`);
      
      if (attempt < retries) {
        // Si es 429, esperamos un poco más antes de usar la siguiente key
        await sleep(isRateLimit ? 5000 : 2000);
      } else {
        console.error(`❌ Fallo definitivo traduciendo ID ${entry.id}`);
        return null;
      }
    }
  }
}

// ═══════════════════════════════════════════════════════════════════
// OBTENER DATOS
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
  console.log(`   Keys en el Pool: ${GEMINI_KEYS.length}`);
  console.log("=".repeat(70));

  try {
    // 1. Obtener los de origen (inglés)
    console.log(`📥 Obteniendo comentarios en inglés...`);
    const enEntries = await getAllEntries("en");
    
    // 2. Obtener los que ya están traducidos (catalán)
    console.log(`🔍 Verificando existentes en ${TARGET_LANG}...`);
    const caEntries = await getAllEntries(TARGET_LANG);
    
    // Creamos un Set rápido para saber cuáles existen (combinación única sourceId + divId)
    const existingSet = new Set(caEntries.map(e => `${e.sourceId}-${e.divId}`));

    const pendingEntries = enEntries.filter(e => !existingSet.has(`${e.sourceId}-${e.divId}`));
    console.log(`   Pendientes: ${pendingEntries.length} de ${enEntries.length}\n`);

    if (pendingEntries.length === 0) {
      console.log("✅ ¡Todo está traducido!");
      process.exit(0);
    }

    // 3. Traducir con concurrencia calculada
    // 15 RPM * 10 keys = 150 RPM = ~2.5 peticiones por segundo.
    // Usamos una concurrencia de 4 para ir sobre seguro y no saturar las colas.
    const limit = pLimit(4); 
    let processed = 0;
    let buffer = [];

    const translationPromises = pendingEntries.map((entryEn) =>
      limit(async () => {
        // Pequeño retraso entre llamadas para distribuir la carga uniformemente
        await sleep(500); 

        const translatedTexts = await translateWithGemini(entryEn);
        
        if (translatedTexts) {
          // Construimos el nuevo objeto para insertar
          const newEntry = {
            sourceId: entryEn.sourceId,
            language: TARGET_LANG,
            bookAbbr: entryEn.bookAbbr,
            bookOrder: entryEn.bookOrder,
            chapter: entryEn.chapter,
            verseStart: entryEn.verseStart,
            verseEnd: entryEn.verseEnd,
            title: translatedTexts.title || null,
            content: translatedTexts.content || entryEn.content, // Fallback al original si viene vacío
            contentHtml: translatedTexts.contentHtml || null,
            divId: entryEn.divId,
            sectionType: entryEn.sectionType,
            volume: entryEn.volume
          };

          buffer.push(newEntry);
        }
        
        processed++;
        if (processed % 10 === 0) console.log(`⏳ Procesados: ${processed}/${pendingEntries.length}`);

        // Guardar en lotes de 20
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
