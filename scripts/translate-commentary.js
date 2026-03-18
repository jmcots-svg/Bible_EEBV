const { createClient } = require("@supabase/supabase-js");
const { GoogleGenAI } = require("@google/genai");
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
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const MODELS = [
  { name: 'gemini-3.1-flash-lite-preview', rpm: 15, rpd: 500 },
  { name: 'gemini-2.5-flash-lite', rpm: 10, rpd: 20 },
  { name: 'gemini-2.5-flash', rpm: 5, rpd: 20 }
];

let abortProcess = false;

// ═══════════════════════════════════════════════════════════════════
// SMART RATE LIMITER (Con sistema de 3 Strikes)
// ═══════════════════════════════════════════════════════════════════
class SmartRateLimiter {
  constructor(keys, models) {
    this.slots = [];
    keys.forEach(key => {
      models.forEach(model => {
        this.slots.push({ 
          key, 
          model: model.name, 
          rpm: model.rpm, 
          rpd: model.rpd,
          history: [], 
          requestsToday: 0,
          dayStart: Date.now(),
          exhaustedUntil: 0,
          consecutive429s: 0
        });
      });
    });
  }

  getBestSlot() {
    const now = Date.now();
    let minWaitMs = Infinity;

    for (const slot of this.slots) {
      if (now - slot.dayStart > 86400000) {
        slot.requestsToday = 0;
        slot.dayStart = now;
        slot.consecutive429s = 0;
      }

      if (slot.requestsToday >= slot.rpd) continue;

      slot.history = slot.history.filter(ts => now - ts < 60000);

      if (slot.exhaustedUntil > now) {
        const wait = slot.exhaustedUntil - now;
        if (wait < minWaitMs) minWaitMs = wait;
        continue;
      }

      if (slot.history.length < slot.rpm) {
        slot.history.push(now);
        slot.requestsToday++;
        return { available: true, key: slot.key, model: slot.model, waitMs: 0 };
      } else {
        const wait = 60000 - (now - slot.history[0]);
        if (wait < minWaitMs) minWaitMs = wait;
      }
    }

    return { available: false, waitMs: minWaitMs === Infinity ? 5000 : minWaitMs };
  }

  markExhausted(key, model, isDailyQuotaMessage) {
    const slot = this.slots.find(s => s.key === key && s.model === model);
    if (slot) {
      slot.exhaustedUntil = Date.now() + 61000;
      slot.consecutive429s++;

      if (isDailyQuotaMessage || slot.consecutive429s >= 3) {
        slot.requestsToday = slot.rpd;
        console.log(`\n⚠️ Clave y Modelo (${model}) deshabilitados por hoy (Límite alcanzado).`);
      }
    }
  }

  recordSuccess(key, model) {
    const slot = this.slots.find(s => s.key === key && s.model === model);
    if (slot) slot.consecutive429s = 0;
  }
}

const rateLimiter = new SmartRateLimiter(GEMINI_KEYS, MODELS);
const stats = { 'gemini-3.1-flash-lite-preview': 0, 'gemini-2.5-flash-lite': 0, 'gemini-2.5-flash': 0 };

// ═══════════════════════════════════════════════════════════════════
// TRADUCTOR GEMINI (Motor Principal)
// ═══════════════════════════════════════════════════════════════════
async function translateBatchOptimized(entriesBatch) {
  if (abortProcess) return null;

  const payload = entriesBatch.map(entry => ({
    id: entry.id, 
    title: entry.title || "", 
    content: entry.content || "", 
    contentHtml: entry.contentHtml || ""
  }));

  const languageName = TARGET_LANG === 'es' ? 'Spanish' : TARGET_LANG === 'ca' ? 'Catalan' : TARGET_LANG;
  const systemPrompt = `Translate this JSON array from English to ${languageName}. Keep "id" unchanged. Translate "title", "content", "contentHtml". Preserve HTML tags. Return ONLY a valid JSON array.`;

  let attempts = 0;
  let lastErrorMessage = "";

  while (attempts < 8) { 
    if (abortProcess) return null;

    const slot = rateLimiter.getBestSlot();
    
    if (!slot.available) {
      if (slot.waitMs === Infinity) {
        if (!abortProcess) {
          console.log("\n\n🛑 TODAS las claves y modelos han agotado su cuota diaria.");
          console.log("🛑 Abortando el proceso limpiamente...");
          abortProcess = true;
        }
        return null;
      }
      await sleep(slot.waitMs + 100); 
      continue;
    }

    try {
      const ai = new GoogleGenAI({ apiKey: slot.key });
      const response = await ai.models.generateContent({
        model: slot.model,
        contents: JSON.stringify(payload),
        config: {
          systemInstruction: systemPrompt,
          temperature: 0.1,
          responseMimeType: "application/json"
        }
      });

      let responseText = response.text || "";
      responseText = responseText.replace(/^\x60{3}(?:json)?\n?/i, '').replace(/\n?\x60{3}$/i, '').trim();
      
      const translatedArray = JSON.parse(responseText);
      
      if (!Array.isArray(translatedArray) || translatedArray.length !== entriesBatch.length) {
        throw new Error("Estructura JSON truncada o incompleta");
      }

      rateLimiter.recordSuccess(slot.key, slot.model);
      stats[slot.model] += entriesBatch.length;
      return translatedArray;

    } catch (error) {
      attempts++;
      lastErrorMessage = error.message?.replace(/\n/g, ' ') || "Error desconocido";
      const msg = lastErrorMessage.toLowerCase();
      
      const isRateLimit = error.status === 429 || msg.includes('429') || msg.includes('exhausted');
      const isDailyQuota = msg.includes('quota');

      if (isRateLimit) {
        rateLimiter.markExhausted(slot.key, slot.model, isDailyQuota);
      } else {
        await sleep(2000); 
      }
    }
  }
  
  if (!abortProcess) {
    console.error(`\n❌ Lote de ${entriesBatch.length} fallido. Razón final: ${lastErrorMessage.substring(0, 150)}`);
  }
  return null;
}

// ═══════════════════════════════════════════════════════════════════
// BATCHING (Agrupación Inteligente)
// ═══════════════════════════════════════════════════════════════════
function createOptimizedBatches(entries) {
  const MAX_CHARS = 12000; 
  const MAX_ENTRIES = 10;  
  const batches = [];
  let currentBatch = [], currentChars = 0;

  for (const entry of entries) {
    const len = (entry.title?.length || 0) + (entry.content?.length || 0) + (entry.contentHtml?.length || 0);
    if ((currentChars + len > MAX_CHARS || currentBatch.length >= MAX_ENTRIES) && currentBatch.length > 0) {
      batches.push(currentBatch);
      currentBatch = [];
      currentChars = 0;
    }
    currentBatch.push(entry);
    currentChars += len;
  }
  if (currentBatch.length > 0) batches.push(currentBatch);
  return batches;
}

// ═══════════════════════════════════════════════════════════════════
// EXTRACCIÓN DE DATOS DE SUPABASE (ANTI-TIMEOUTS)
// ═══════════════════════════════════════════════════════════════════
async function getTargetIdentifiers(lang) {
  let allIdentifiers = [];
  let lastId = null;
  let hasMore = true;
  const pageSize = 1000; // Bloques grandes porque solo pedimos 3 columnas pequeñas

  process.stdout.write(`\n📥 Mapeando traducciones existentes en "${lang}"... `);

  while (hasMore) {
    let query = supabase
      .from("CommentaryEntry")
      .select("id, sourceId, divId") // ¡CLAVE! Sin descargar HTML pesado
      .eq("language", lang)
      .order("id", { ascending: true })
      .limit(pageSize);

    if (lastId !== null) query = query.gt("id", lastId); // Paginación por cursor (Súper rápida)

    const { data, error } = await query;
    if (error) throw error;
    
    if (data.length < pageSize) hasMore = false;
    
    if (data.length > 0) {
      lastId = data[data.length - 1].id;
      allIdentifiers = allIdentifiers.concat(data);
    }
    process.stdout.write(`\r📥 Mapeando traducciones existentes en "${lang}"... ✅ ${allIdentifiers.length} cargados.`);
  }
  console.log("");
  return new Set(allIdentifiers.map(e => `${e.sourceId}|${e.divId}`));
}

async function getPendingEnglishEntries(existingSet) {
  let pendingEntries = [];
  let lastId = null;
  let hasMore = true;
  const pageSize = 500;
  let totalChecked = 0;

  process.stdout.write(`\n📥 Buscando textos en "en" pendientes de traducir... `);

  while (hasMore) {
    let query = supabase
      .from("CommentaryEntry")
      .select("id, sourceId, language, bookAbbr, bookOrder, chapter, verseStart, verseEnd, title, content, contentHtml, divId, sectionType, volume")
      .eq("language", "en")
      .order("id", { ascending: true })
      .limit(pageSize);

    if (lastId !== null) query = query.gt("id", lastId); // Paginación por cursor

    const { data, error } = await query;
    if (error) throw error;
    
    if (data.length < pageSize) hasMore = false;
    
    if (data.length > 0) {
      lastId = data[data.length - 1].id;
      totalChecked += data.length;
      
      // Filtramos sobre la marcha para liberar RAM: Solo guardamos los que faltan
      const newPending = data.filter(e => !existingSet.has(`${e.sourceId}|${e.divId}`));
      pendingEntries = pendingEntries.concat(newPending);
    }
    
    process.stdout.write(`\r📥 Buscando textos en "en"... 🔍 Revisados: ${totalChecked} | 📝 Pendientes: ${pendingEntries.length}`);
  }
  console.log("");
  return pendingEntries;
}

// ═══════════════════════════════════════════════════════════════════
// PROCESADOR CONCURRENTE
// ═══════════════════════════════════════════════════════════════════
async function processAllBatches(batches, totalEntries) {
  const limit = pLimit(5); 
  let processed = 0;
  const startTime = Date.now();

  const processBatch = async (batchEn, index) => {
    if (abortProcess) return;
    if (index < 5) await sleep(index * 300); 

    const translatedBatch = await translateBatchOptimized(batchEn);
    
    if (translatedBatch && translatedBatch.length > 0 && !abortProcess) {
      const dbBufferLocal = []; 

      translatedBatch.forEach(transItem => {
        const orig = batchEn.find(e => e.id === transItem.id);
        if (orig) {
          dbBufferLocal.push({
            sourceId: orig.sourceId, 
            language: TARGET_LANG, 
            bookAbbr: orig.bookAbbr,
            bookOrder: orig.bookOrder, 
            chapter: orig.chapter, 
            verseStart: orig.verseStart,
            verseEnd: orig.verseEnd, 
            title: transItem.title || null,
            content: transItem.content || orig.content, 
            contentHtml: transItem.contentHtml || null,
            divId: orig.divId, 
            sectionType: orig.sectionType, 
            volume: orig.volume
          });
          processed++;
        }
      });

      if (dbBufferLocal.length > 0) {
        const { error } = await supabase.from("CommentaryEntry").insert(dbBufferLocal);
        if (error) console.error(`\n❌ Error insertando en DB: ${error.message}`);
      }
    }

    if (!abortProcess && processed % 20 < 10) { 
      const elapsed = (Date.now() - startTime) / 1000 / 60;
      const rate = processed / elapsed;
      const eta = (totalEntries - processed) / rate;
      process.stdout.write(`\r🚀 Trans: ${processed}/${totalEntries} | Vel: ${rate.toFixed(0)}/min | ETA: ${eta.toFixed(1)}m | 3.1L: ${stats['gemini-3.1-flash-lite-preview']} | 2.5L: ${stats['gemini-2.5-flash-lite']} | 2.5: ${stats['gemini-2.5-flash']}   `);
    }
  };

  await Promise.all(batches.map((b, idx) => limit(() => processBatch(b, idx))));
  console.log(""); 
  return processed;
}

// ═══════════════════════════════════════════════════════════════════
// MAIN ✨
// ═══════════════════════════════════════════════════════════════════
async function main() {
  console.log(`
╔═════════════════════════════════════════════════════════════════╗
║  ⚡ TRADUCTOR GEMINI PURO (Anti-Timeouts + 5 Hilos)             ║
║  EN → ${TARGET_LANG.toUpperCase().padEnd(60, ' ')}║
╚═════════════════════════════════════════════════════════════════╝
`);
  const startTime = Date.now();

  try {
    // 1. Obtener identificadores del idioma destino (rápido, no descarga textos)
    const existingSet = await getTargetIdentifiers(TARGET_LANG);

    // 2. Obtener textos de origen filtrando sobre la marcha (no satura RAM)
    const pendingEntries = await getPendingEnglishEntries(existingSet);

    if (pendingEntries.length === 0) { 
      console.log("✅ Todo está traducido y al día.");
      return; 
    }

    const batches = createOptimizedBatches(pendingEntries);
    console.log(`📦 Lotes generados a traducir: ${batches.length}\n`);
    
    await processAllBatches(batches, pendingEntries.length);
    
    const finalMin = ((Date.now() - startTime) / 1000 / 60).toFixed(2);
    if (abortProcess) {
      console.log(`\n⚠️ Proceso detenido por falta de cuotas. Se avanzó durante ${finalMin} minutos.`);
      process.exit(0); 
    } else {
      console.log(`\n✨ COMPLETADO en ${finalMin} minutos`);
    }
    
  } catch (error) { 
    console.error(`\n❌ Error Crítico:`, error);
    process.exit(1);
  }
}

main();
