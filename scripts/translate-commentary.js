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
  console.error("❌ Error: Faltan variables de entorno");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const MODELS = [
  { name: 'gemini-3.1-flash-lite-preview', rpm: 14, rpd: 5000 }, // Aumentado RPD teórico
  { name: 'gemini-2.5-flash-lite', rpm: 9, rpd: 20 },
  { name: 'gemini-2.5-flash', rpm: 4, rpd: 20 }
];

let abortProcess = false;

// ═══════════════════════════════════════════════════════════════════
// SMART RATE LIMITER (Resiliencia Extrema)
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
      slot.consecutive429s++;
      // Si es el primer o segundo aviso, esperamos 2 minutos (enfriamiento largo)
      // Si es el tercero, lo damos por muerto por hoy.
      const coolingTime = slot.consecutive429s >= 3 ? 86400000 : 120000; 
      slot.exhaustedUntil = Date.now() + coolingTime;

      if (isDailyQuotaMessage || slot.consecutive429s >= 3) {
        slot.requestsToday = slot.rpd;
        console.log(`\n⚠️ ${model} bloqueado. Reintentos agotados o cuota excedida.`);
      } else {
        console.log(`\n⏳ ${model} en enfriamiento (Intento ${slot.consecutive429s}/3)...`);
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

async function translateBatchOptimized(entriesBatch) {
  if (abortProcess) return null;

  const payload = entriesBatch.map(entry => ({
    id: entry.id, 
    title: entry.title || "", 
    content: entry.content || "", 
    contentHtml: entry.contentHtml || ""
  }));

  const languageName = TARGET_LANG === 'es' ? 'Spanish' : TARGET_LANG === 'ca' ? 'Catalan' : TARGET_LANG;
  const systemPrompt = `Translate JSON to ${languageName}. Keep "id". Translate "title", "content", "contentHtml". Return ONLY JSON array.`;

  let attempts = 0;
  let lastErrorMessage = "";

  while (attempts < 10) { 
    if (abortProcess) return null;
    const slot = rateLimiter.getBestSlot();
    
    if (!slot.available) {
      if (slot.waitMs === Infinity) {
        abortProcess = true;
        return null;
      }
      await sleep(slot.waitMs + 200); 
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
      
      rateLimiter.recordSuccess(slot.key, slot.model);
      stats[slot.model] += entriesBatch.length;
      return translatedArray;

    } catch (error) {
      attempts++;
      lastErrorMessage = error.message || "Error";
      const msg = lastErrorMessage.toLowerCase();
      const isRateLimit = error.status === 429 || msg.includes('429') || msg.includes('exhausted');
      
      if (isRateLimit) {
        rateLimiter.markExhausted(slot.key, slot.model, msg.includes('quota'));
      } else {
        await sleep(3000); 
      }
    }
  }
  return null;
}

// ═══════════════════════════════════════════════════════════════════
// BATCHING (Maximizar el uso de cada petición)
// ═══════════════════════════════════════════════════════════════════
function createOptimizedBatches(entries) {
  const MAX_CHARS = 25000; // Aumentado para enviar más texto por petición
  const MAX_ENTRIES = 15;  // Aumentado de 10 a 15
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
// QUERIES SUPABASE (Cursor)
// ═══════════════════════════════════════════════════════════════════
async function getTargetIdentifiers(lang) {
  let allIdentifiers = [];
  let lastId = null;
  let hasMore = true;
  while (hasMore) {
    let query = supabase.from("CommentaryEntry").select("id, sourceId, divId").eq("language", lang).order("id", { ascending: true }).limit(2000);
    if (lastId !== null) query = query.gt("id", lastId);
    const { data, error } = await query;
    if (error) throw error;
    if (data.length < 2000) hasMore = false;
    if (data.length > 0) {
      lastId = data[data.length - 1].id;
      allIdentifiers = allIdentifiers.concat(data);
    }
  }
  return new Set(allIdentifiers.map(e => `${e.sourceId}|${e.divId}`));
}

async function getPendingEnglishEntries(existingSet) {
  let pendingEntries = [];
  let lastId = null;
  let hasMore = true;
  while (hasMore) {
    let query = supabase.from("CommentaryEntry").select("*").eq("language", "en").order("id", { ascending: true }).limit(1000);
    if (lastId !== null) query = query.gt("id", lastId);
    const { data, error } = await query;
    if (error) throw error;
    if (data.length < 1000) hasMore = false;
    if (data.length > 0) {
      lastId = data[data.length - 1].id;
      const newPending = data.filter(e => !existingSet.has(`${e.sourceId}|${e.divId}`));
      pendingEntries = pendingEntries.concat(newPending);
    }
    process.stdout.write(`\r📥 Escaneando pendientes: ${pendingEntries.length} encontrados...`);
  }
  console.log("");
  return pendingEntries;
}

// ═══════════════════════════════════════════════════════════════════
// PROCESADOR
// ═══════════════════════════════════════════════════════════════════
async function processAllBatches(batches, totalEntries) {
  const limit = pLimit(5); 
  let processed = 0;
  const startTime = Date.now();

  const processBatch = async (batchEn, index) => {
    if (abortProcess) return;
    const translatedBatch = await translateBatchOptimized(batchEn);
    if (translatedBatch && translatedBatch.length > 0 && !abortProcess) {
      const inserts = translatedBatch.map(transItem => {
        const orig = batchEn.find(e => e.id === transItem.id);
        if (!orig) return null;
        return {
          sourceId: orig.sourceId, language: TARGET_LANG, bookAbbr: orig.bookAbbr,
          bookOrder: orig.bookOrder, chapter: orig.chapter, verseStart: orig.verseStart,
          verseEnd: orig.verseEnd, title: transItem.title || null,
          content: transItem.content || orig.content, contentHtml: transItem.contentHtml || null,
          divId: orig.divId, sectionType: orig.sectionType, volume: orig.volume
        };
      }).filter(Boolean);

      if (inserts.length > 0) {
        const { error } = await supabase.from("CommentaryEntry").insert(inserts);
        if (!error) processed += inserts.length;
      }
    }

    const elapsed = (Date.now() - startTime) / 1000 / 60;
    const rate = processed / elapsed;
    process.stdout.write(`\r🚀 Traducido: ${processed}/${totalEntries} | Vel: ${rate.toFixed(0)}/min | 3.1L: ${stats['gemini-3.1-flash-lite-preview']} | 2.5L: ${stats['gemini-2.5-flash-lite']}   `);
  };

  await Promise.all(batches.map((b, idx) => limit(() => processBatch(b, idx))));
}

async function main() {
  try {
    const existingSet = await getTargetIdentifiers(TARGET_LANG);
    const pendingEntries = await getPendingEnglishEntries(existingSet);
    if (pendingEntries.length === 0) return console.log("✅ Todo traducido.");
    
    const batches = createOptimizedBatches(pendingEntries);
    await processAllBatches(batches, pendingEntries.length);
    
    if (abortProcess) console.log(`\n⚠️ Cuotas agotadas por hoy. Mañana continuará automáticamente.`);
  } catch (error) { 
    console.error(`\n❌ Error:`, error);
    process.exit(1);
  }
}

main();

