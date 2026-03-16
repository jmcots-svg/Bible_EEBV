const { createClient } = require("@supabase/supabase-js");
const { GoogleGenAI } = require("@google/genai");
const axios = require("axios");
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
// CONFIGURACIÓN DE LÍMITES POR MODELO
// ═══════════════════════════════════════════════════════════════════
const MODEL_CONFIG = {
  'gemini-2.0-flash-lite': {
    rpm: 15,          // Requests per minute per key
    tpm: 250000,      // Tokens per minute per key
    rpd: 500,         // Requests per day per key
    priority: 1       // Usar primero (más rápido)
  },
  'gemini-2.5-flash': {
    rpm: 5,
    tpm: 250000,
    rpd: 20,
    priority: 2       // Usar como backup
  }
};

// ═══════════════════════════════════════════════════════════════════
// RATE LIMITER INTELIGENTE POR KEY Y MODELO
// ═══════════════════════════════════════════════════════════════════
class SmartRateLimiter {
  constructor(keys, modelConfig) {
    this.keys = keys;
    this.modelConfig = modelConfig;
    
    // Tracking por key
    this.keyStats = new Map();
    keys.forEach(key => {
      this.keyStats.set(key, {
        requestsThisMinute: 0,
        requestsToday: 0,
        lastMinuteReset: Date.now(),
        lastDayReset: Date.now(),
        exhaustedUntil: 0,
        consecutiveErrors: 0
      });
    });
    
    this.currentKeyIndex = 0;
    this.totalRequests = 0;
  }

  // Resetear contadores cada minuto/día
  _updateCounters(keyStats) {
    const now = Date.now();
    
    // Reset cada minuto
    if (now - keyStats.lastMinuteReset > 60000) {
      keyStats.requestsThisMinute = 0;
      keyStats.lastMinuteReset = now;
    }
    
    // Reset cada día
    if (now - keyStats.lastDayReset > 86400000) {
      keyStats.requestsToday = 0;
      keyStats.lastDayReset = now;
    }
  }

  // Obtener la mejor key disponible para un modelo
  getBestKey(model) {
    const config = this.modelConfig[model];
    const now = Date.now();
    
    // Intentar todas las keys en orden
    for (let i = 0; i < this.keys.length; i++) {
      const keyIndex = (this.currentKeyIndex + i) % this.keys.length;
      const key = this.keys[keyIndex];
      const stats = this.keyStats.get(key);
      
      this._updateCounters(stats);
      
      // Verificar si la key está disponible
      if (stats.exhaustedUntil > now) continue;
      if (stats.requestsThisMinute >= config.rpm) continue;
      if (stats.requestsToday >= config.rpd) continue;
      
      // Key disponible
      this.currentKeyIndex = (keyIndex + 1) % this.keys.length;
      return { key, keyIndex };
    }
    
    return null; // Ninguna key disponible
  }

  // Registrar uso exitoso
  recordSuccess(key) {
    const stats = this.keyStats.get(key);
    stats.requestsThisMinute++;
    stats.requestsToday++;
    stats.consecutiveErrors = 0;
    this.totalRequests++;
  }

  // Registrar rate limit
  recordRateLimit(key, model) {
    const stats = this.keyStats.get(key);
    stats.consecutiveErrors++;
    
    // Cooldown progresivo
    const cooldown = Math.min(5000 * stats.consecutiveErrors, 30000);
    stats.exhaustedUntil = Date.now() + cooldown;
    
    console.log(`   🔴 Key ...${key.slice(-4)} rate limited. Cooldown: ${cooldown/1000}s`);
  }

  // Calcular tiempo de espera óptimo
  getOptimalDelay(model) {
    const config = this.modelConfig[model];
    const availableKeys = this.keys.filter(key => {
      const stats = this.keyStats.get(key);
      this._updateCounters(stats);
      return stats.requestsThisMinute < config.rpm && Date.now() > stats.exhaustedUntil;
    }).length;

    if (availableKeys === 0) return 5000; // Esperar si no hay keys
    
    // Distribuir requests equitativamente: 60s / (RPM * keys disponibles)
    const totalRPM = config.rpm * availableKeys;
    const delayMs = Math.ceil(60000 / totalRPM);
    
    return Math.max(delayMs, 400); // Mínimo 400ms para no saturar
  }

  // Estado actual
  getStatus() {
    let available = 0;
    let exhausted = 0;
    const now = Date.now();
    
    this.keys.forEach(key => {
      const stats = this.keyStats.get(key);
      this._updateCounters(stats);
      if (stats.exhaustedUntil > now || stats.requestsThisMinute >= 15) {
        exhausted++;
      } else {
        available++;
      }
    });
    
    return { available, exhausted, total: this.keys.length };
  }
}

const rateLimiter = new SmartRateLimiter(GEMINI_KEYS, MODEL_CONFIG);

// ═══════════════════════════════════════════════════════════════════
// GOOGLE TRANSLATE FALLBACK
// ═══════════════════════════════════════════════════════════════════
const GOOGLE_TRANSLATE_CHAR_LIMIT = 4500;

async function translateWithGoogleTranslate(text, targetLang = "es", retries = 3) {
  if (!text || text.trim() === "") return text;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${targetLang}&dt=t&q=${encodeURIComponent(text.substring(0, GOOGLE_TRANSLATE_CHAR_LIMIT))}`;
      
      const response = await axios.get(url, {
        timeout: 15000,
        headers: { "User-Agent": "Mozilla/5.0" },
      });

      return response.data[0].map(item => item[0]).filter(Boolean).join("");
    } catch (error) {
      if (error.response?.status === 429 && attempt < retries) {
        await sleep(15000 * attempt);
      } else if (attempt === retries) {
        return text;
      }
    }
  }
  return text;
}

async function translateBatchWithGoogleTranslate(entriesBatch, targetLang) {
  console.log(`\n🌐 FALLBACK: Traduciendo ${entriesBatch.length} entries con Google Translate...`);
  
  const results = [];
  for (const entry of entriesBatch) {
    const translated = {
      id: entry.id,
      title: entry.title ? await translateWithGoogleTranslate(entry.title, targetLang) : "",
      content: entry.content ? await translateWithGoogleTranslate(entry.content, targetLang) : "",
      contentHtml: entry.contentHtml ? await translateWithGoogleTranslate(entry.contentHtml, targetLang) : ""
    };
    results.push(translated);
    await sleep(400);
  }
  
  return results;
}

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// ═══════════════════════════════════════════════════════════════════
// TRADUCTOR BATCH OPTIMIZADO
// ═══════════════════════════════════════════════════════════════════
async function translateBatchOptimized(entriesBatch, retries = 2) {
  const payloadToTranslate = entriesBatch.map(entry => ({
    id: entry.id,
    title: entry.title || "",
    content: entry.content || "",
    contentHtml: entry.contentHtml || ""
  }));

  const languageName = TARGET_LANG === 'es' ? 'Spanish' : TARGET_LANG === 'ca' ? 'Catalan' : TARGET_LANG;

  const systemPrompt = `You are an expert biblical translator. Translate this JSON array from English to ${languageName}.
Rules: Keep "id" unchanged. Translate "title", "content", "contentHtml". Preserve HTML tags. Return only valid JSON array.`;

  // Preferir Flash Lite (más RPM)
  const model = 'gemini-2.0-flash-lite';
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    const keyInfo = rateLimiter.getBestKey(model);
    
    if (!keyInfo) {
      // No hay keys disponibles, usar fallback
      console.log(`   ⚠️ Sin keys Gemini disponibles, usando Google Translate...`);
      return await translateBatchWithGoogleTranslate(entriesBatch, TARGET_LANG);
    }

    try {
      const ai = new GoogleGenAI({ apiKey: keyInfo.key });

      const response = await ai.models.generateContent({
        model: model,
        contents: JSON.stringify(payloadToTranslate),
        config: {
          systemInstruction: systemPrompt,
          temperature: 0.1,
          responseMimeType: "application/json",
        },
      });

      let responseText = response.text.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim();
      const translatedArray = JSON.parse(responseText);
      
      if (!Array.isArray(translatedArray) || translatedArray.length !== entriesBatch.length) {
        throw new Error("Array incompleto");
      }

      rateLimiter.recordSuccess(keyInfo.key);
      return translatedArray;

    } catch (error) {
      const isRateLimit = error.status === 429 || error.response?.status === 429;
      
      if (isRateLimit) {
        rateLimiter.recordRateLimit(keyInfo.key, model);
        // Reintentar inmediatamente con otra key
        continue;
      }
      
      console.warn(`   ⚠️ Error: ${error.message?.substring(0, 100)}`);
      
      if (attempt === retries) {
        return await translateBatchWithGoogleTranslate(entriesBatch, TARGET_LANG);
      }
    }
  }
  
  return await translateBatchWithGoogleTranslate(entriesBatch, TARGET_LANG);
}

// ═══════════════════════════════════════════════════════════════════
// BATCH DINÁMICO OPTIMIZADO PARA TOKENS
// ═══════════════════════════════════════════════════════════════════
function createOptimizedBatches(entries) {
  // Con 250K TPM, podemos enviar lotes más grandes
  // Estimación: ~4 tokens por palabra, ~5 caracteres por palabra
  // Objetivo: ~15,000 caracteres por batch (seguro bajo 250K TPM)
  const MAX_CHARS = 15000;
  const MAX_ENTRIES = 10; // Máximo 10 entries por batch para evitar errores de parsing
  
  const batches = [];
  let currentBatch = [];
  let currentChars = 0;

  for (const entry of entries) {
    const entryLength = (entry.title?.length || 0) + (entry.content?.length || 0) + (entry.contentHtml?.length || 0);

    if ((currentChars + entryLength > MAX_CHARS || currentBatch.length >= MAX_ENTRIES) && currentBatch.length > 0) {
      batches.push(currentBatch);
      currentBatch = [];
      currentChars = 0;
    }

    currentBatch.push(entry);
    currentChars += entryLength;
  }

  if (currentBatch.length > 0) batches.push(currentBatch);

  return batches;
}

// ═══════════════════════════════════════════════════════════════════
// OBTENER DATOS
// ═══════════════════════════════════════════════════════════════════
async function getAllEntries(lang) {
  const PAGE_SIZE = 1000;
  let allEntries = [];
  let page = 0;

  while (true) {
    const { data, error } = await supabase
      .from("CommentaryEntry")
      .select("*")
      .eq("language", lang)
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (error) throw error;
    if (data.length === 0) break;
    
    allEntries = allEntries.concat(data);
    page++;
  }
  return allEntries;
}

// ═══════════════════════════════════════════════════════════════════
// PROCESADOR PARALELO CON RATE LIMITING INTELIGENTE
// ═══════════════════════════════════════════════════════════════════
async function processInParallel(batches, pendingCount) {
  // Con 10 keys × 15 RPM = 150 RPM teórico
  // Usamos concurrencia de 10 (1 por key) para máxima velocidad
  const CONCURRENCY = Math.min(10, GEMINI_KEYS.length);
  const limit = pLimit(CONCURRENCY);
  
  let processed = 0;
  let dbBuffer = [];
  let geminiCount = 0;
  let googleCount = 0;
  const startTime = Date.now();

  const processBatch = async (batchEn, batchIndex) => {
    // Delay dinámico basado en disponibilidad de keys
    const delay = rateLimiter.getOptimalDelay('gemini-2.0-flash-lite');
    await sleep(delay);

    const translatedBatch = await translateBatchOptimized(batchEn);
    
    if (translatedBatch && translatedBatch.length > 0) {
      const wasGemini = rateLimiter.getStatus().available > 0;
      
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

      if (wasGemini) geminiCount += translatedBatch.length;
      else googleCount += translatedBatch.length;
    }

    // Logging cada 50 entries
    if (processed % 50 < batchEn.length) {
      const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
      const rate = (processed / ((Date.now() - startTime) / 1000) * 60).toFixed(0);
      const eta = ((pendingCount - processed) / (rate || 1)).toFixed(0);
      const status = rateLimiter.getStatus();
      
      console.log(`⏳ ${processed}/${pendingCount} | ${rate}/min | ETA: ${eta}min | Keys: ${status.available}/${status.total} | 🤖${geminiCount} 🌐${googleCount}`);
    }

    // Guardar en DB cada 50 entries
    if (dbBuffer.length >= 50) {
      const toInsert = dbBuffer.splice(0, 50);
      const { error } = await supabase.from("CommentaryEntry").insert(toInsert);
      if (error) console.error(`⚠️ Error BD: ${error.message}`);
    }
  };

  // Procesar todos los batches en paralelo con límite de concurrencia
  await Promise.all(batches.map((batch, index) => limit(() => processBatch(batch, index))));

  // Guardar resto del buffer
  if (dbBuffer.length > 0) {
    const { error } = await supabase.from("CommentaryEntry").insert(dbBuffer);
    if (error) console.error(`⚠️ Error BD final: ${error.message}`);
  }

  return { processed, geminiCount, googleCount };
}

// ═══════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════
async function main() {
  console.log(`
╔══════════════════════════════════════════════════════════════════════╗
║  🚀 TRADUCTOR HÍBRIDO ULTRA-OPTIMIZADO                               ║
║  EN → ${TARGET_LANG.toUpperCase()}                                                           ║
╠══════════════════════════════════════════════════════════════════════╣
║  Keys Gemini: ${GEMINI_KEYS.length.toString().padEnd(54)}║
║  Capacidad teórica: ${(GEMINI_KEYS.length * 15).toString().padEnd(48)} RPM ║
║  Modelo principal: gemini-2.0-flash-lite                             ║
║  Fallback: Google Translate                                          ║
╚══════════════════════════════════════════════════════════════════════╝
`);

  const startTime = Date.now();

  try {
    console.log(`📥 Cargando datos...`);
    const [enEntries, targetEntries] = await Promise.all([
      getAllEntries("en"),
      getAllEntries(TARGET_LANG)
    ]);

    const existingSet = new Set(targetEntries.map(e => `${e.sourceId}-${e.divId}`));
    const pendingEntries = enEntries.filter(e => !existingSet.has(`${e.sourceId}-${e.divId}`));

    console.log(`   Total EN: ${enEntries.length}`);
    console.log(`   Ya traducidos: ${targetEntries.length}`);
    console.log(`   Pendientes: ${pendingEntries.length}\n`);

    if (pendingEntries.length === 0) {
      console.log("✅ ¡Todo traducido!");
      return;
    }

    const batches = createOptimizedBatches(pendingEntries);
    console.log(`📦 ${batches.length} lotes creados (avg: ${Math.round(pendingEntries.length/batches.length)} entries/lote)\n`);

    const { processed, geminiCount, googleCount } = await processInParallel(batches, pendingEntries.length);

    const totalTime = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
    const avgRate = (processed / ((Date.now() - startTime) / 1000) * 60).toFixed(0);

    console.log(`
╔══════════════════════════════════════════════════════════════════════╗
║  ✅ TRADUCCIÓN COMPLETADA                                            ║
╠══════════════════════════════════════════════════════════════════════╣
║  Procesados: ${processed.toString().padEnd(55)}║
║  Gemini:     ${geminiCount.toString().padEnd(55)}║
║  Google:     ${googleCount.toString().padEnd(55)}║
║  Tiempo:     ${totalTime.toString().padEnd(51)} min ║
║  Velocidad:  ${avgRate.toString().padEnd(51)}/min ║
╚══════════════════════════════════════════════════════════════════════╝
`);

  } catch (error) {
    console.error(`\n❌ Error fatal: ${error.message}`);
    process.exit(1);
  }
}

main();
