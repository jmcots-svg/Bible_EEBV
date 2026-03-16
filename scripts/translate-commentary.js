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
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const NUM_PROJECTS = Math.floor(GEMINI_KEYS.length / 2) || GEMINI_KEYS.length;
const PROJECTS = [];

for (let i = 0; i < NUM_PROJECTS; i++) {
  const projectKeys = [];
  if (GEMINI_KEYS[i]) projectKeys.push(GEMINI_KEYS[i]);
  if (GEMINI_KEYS[i + NUM_PROJECTS]) projectKeys.push(GEMINI_KEYS[i + NUM_PROJECTS]);
  PROJECTS.push({ id: i + 1, keys: projectKeys, currentKeyIdx: 0 });
}

const MODELS = [
  { name: 'gemini-3.1-flash-lite-preview', rpm: 15, rpd: 500 },
  { name: 'gemini-2.5-flash-lite', rpm: 10, rpd: 20 },
  { name: 'gemini-2.5-flash', rpm: 5, rpd: 20 }
];

// ═══════════════════════════════════════════════════════════════════
// RATE LIMITER
// ═══════════════════════════════════════════════════════════════════
class ProjectAwareRateLimiter {
  constructor(projects, models) {
    this.projects = projects;
    this.models = models;
    this.projectStats = new Map();
    
    this.projects.forEach(p => {
      const modelMap = new Map();
      this.models.forEach(m => {
        modelMap.set(m.name, {
          requestTimestamps: [],
          requestsToday: 0,
          dayStart: Date.now(),
          exhaustedUntil: 0
        });
      });
      this.projectStats.set(p.id, modelMap);
    });
    
    this.currentProjectIdx = 0;
  }

  _isAvailable(projectId, model) {
    const stats = this.projectStats.get(projectId).get(model.name);
    const now = Date.now();
    
    if (stats.exhaustedUntil > now) return false;
    
    const oneMinAgo = now - 60000;
    stats.requestTimestamps = stats.requestTimestamps.filter(ts => ts > oneMinAgo);
    
    if (stats.requestTimestamps.length >= model.rpm - 1) return false;
    
    if (now - stats.dayStart > 86400000) {
      stats.requestsToday = 0;
      stats.dayStart = now;
    }
    if (stats.requestsToday >= model.rpd - 1) return false;
    
    return true;
  }

  _reserveFromProject(project, model) {
    const stats = this.projectStats.get(project.id).get(model.name);
    stats.requestTimestamps.push(Date.now());
    stats.requestsToday++;
    
    const key = project.keys[project.currentKeyIdx];
    project.currentKeyIdx = (project.currentKeyIdx + 1) % project.keys.length;
    return key;
  }

  getBestKeyAndModel() {
    for (const model of this.models) {
      for (let i = 0; i < this.projects.length; i++) {
        const pIdx = (this.currentProjectIdx + i) % this.projects.length;
        const project = this.projects[pIdx];
        
        if (this._isAvailable(project.id, model)) {
          this.currentProjectIdx = (pIdx + 1) % this.projects.length;
          const key = this._reserveFromProject(project, model);
          return { key, model: model.name, projectId: project.id, available: true };
        }
      }
    }

    let minWait = Infinity;
    const now = Date.now();
    for (const project of this.projects) {
      for (const model of this.models) {
        const stats = this.projectStats.get(project.id).get(model.name);
        if (stats.exhaustedUntil > now) {
          minWait = Math.min(minWait, stats.exhaustedUntil - now);
        } else if (stats.requestTimestamps.length > 0) {
          const oldest = Math.min(...stats.requestTimestamps);
          const wait = (oldest + 60000) - now;
          if (wait > 0) minWait = Math.min(minWait, wait);
        }
      }
    }

    return { key: null, model: null, projectId: null, available: false, waitMs: minWait === Infinity ? 5000 : Math.max(1000, minWait) };
  }

  recordRateLimit(projectId, modelName) {
    const stats = this.projectStats.get(projectId).get(modelName);
    stats.exhaustedUntil = Date.now() + 65000;
    const shortModel = modelName.includes('3.1') ? '3.1' : (modelName.includes('lite') ? '2.5L' : '2.5');
    console.log(`   🔴 Rate Limit | PROYECTO ${projectId} | Modelo ${shortModel} → cooldown 65s`);
  }
}

const rateLimiter = new ProjectAwareRateLimiter(PROJECTS, MODELS);

// ═══════════════════════════════════════════════════════════════════
// ESTADÍSTICAS
// ═══════════════════════════════════════════════════════════════════
const stats = {
  byModel: { 'gemini-3.1-flash-lite-preview': 0, 'gemini-2.5-flash-lite': 0, 'gemini-2.5-flash': 0 },
  google: 0,
};

// ═══════════════════════════════════════════════════════════════════
// GOOGLE TRANSLATE FALLBACK
// ═══════════════════════════════════════════════════════════════════
async function translateWithGoogleTranslate(text, targetLang = "es") {
  if (!text || text.trim() === "") return text;
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${targetLang}&dt=t&q=${encodeURIComponent(text.substring(0, 4500))}`;
    const response = await axios.get(url, { timeout: 15000, headers: { "User-Agent": "Mozilla/5.0" } });
    return response.data[0].map(item => item[0]).filter(Boolean).join("");
  } catch { return text; }
}

async function translateBatchWithGoogleTranslate(entriesBatch, targetLang) {
  const results = [];
  for (const entry of entriesBatch) {
    results.push({
      id: entry.id, title: entry.title ? await translateWithGoogleTranslate(entry.title, targetLang) : "",
      content: entry.content ? await translateWithGoogleTranslate(entry.content, targetLang) : "",
      contentHtml: entry.contentHtml ? await translateWithGoogleTranslate(entry.contentHtml, targetLang) : ""
    });
    await sleep(400);
  }
  stats.google += entriesBatch.length;
  return results;
}

// ═══════════════════════════════════════════════════════════════════
// TRADUCTOR BATCH "MODO PACIENTE"
// ═══════════════════════════════════════════════════════════════════
async function translateBatchOptimized(entriesBatch) {
  const payload = entriesBatch.map(entry => ({
    id: entry.id, title: entry.title || "", content: entry.content || "", contentHtml: entry.contentHtml || ""
  }));

  const languageName = TARGET_LANG === 'es' ? 'Spanish' : TARGET_LANG === 'ca' ? 'Catalan' : TARGET_LANG;
  const systemPrompt = `Translate this JSON array from English to ${languageName}. Keep "id" unchanged. Translate "title", "content", "contentHtml". Preserve HTML tags. Return only valid JSON array.`;

  let maxAttempts = 5;
  let currentAttempt = 0;

  while (currentAttempt < maxAttempts) {
    let keyInfo = rateLimiter.getBestKeyAndModel();
    
    // 🧘‍♂️ MODO ZEN: Si todo está ocupado, ESPERAMOS. No huimos a Google Translate.
    while (!keyInfo.available) {
      const waitTime = Math.min(keyInfo.waitMs, 20000); // Esperar en trozos de máx 20s
      console.log(`   ⏳ Modelos ocupados. Esperando ${(waitTime/1000).toFixed(0)}s...`);
      await sleep(waitTime + 500);
      keyInfo = rateLimiter.getBestKeyAndModel();
    }

    currentAttempt++;

    try {
      const ai = new GoogleGenAI({ apiKey: keyInfo.key });
      const response = await ai.models.generateContent({
        model: keyInfo.model,
        contents: JSON.stringify(payload),
        config: { systemInstruction: systemPrompt, temperature: 0.1, responseMimeType: "application/json" },
      });

      let responseText = response.text.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim();
      const translatedArray = JSON.parse(responseText);
      
      if (!Array.isArray(translatedArray) || translatedArray.length !== entriesBatch.length) throw new Error("Incompleto");

      stats.byModel[keyInfo.model] += entriesBatch.length;
      return translatedArray;

    } catch (error) {
      const isRateLimit = error.status === 429 || error.message?.includes('429') || error.message?.includes('EXHAUSTED');
      
      if (isRateLimit) {
        rateLimiter.recordRateLimit(keyInfo.projectId, keyInfo.model);
        // 🛑 FRENO DE MANO: Espera obligatoria antes de intentar otro proyecto
        await sleep(3000 + Math.random() * 2000); 
        continue;
      }
      
      if (currentAttempt >= maxAttempts) {
        console.log(`   ⚠️ Error persistente: ${error.message?.substring(0, 40)}. Pasando a Google Translate.`);
        return await translateBatchWithGoogleTranslate(entriesBatch, TARGET_LANG);
      }
    }
  }
  
  return await translateBatchWithGoogleTranslate(entriesBatch, TARGET_LANG);
}

// ═══════════════════════════════════════════════════════════════════
// BATCHING Y OBTENCIÓN DE DATOS
// ═══════════════════════════════════════════════════════════════════
function createOptimizedBatches(entries) {
  const MAX_CHARS = 12000;
  const MAX_ENTRIES = 8;
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

async function getAllEntries(lang) {
  let allEntries = [], page = 0;
  while (true) {
    const { data, error } = await supabase.from("CommentaryEntry").select("*").eq("language", lang).range(page * 1000, (page + 1) * 1000 - 1);
    if (error) throw error;
    if (data.length === 0) break;
    allEntries = allEntries.concat(data);
    page++;
  }
  return allEntries;
}

// ═══════════════════════════════════════════════════════════════════
// PROCESADOR (Concurrencia Segura 4)
// ═══════════════════════════════════════════════════════════════════
async function processAllBatches(batches, totalEntries) {
  // Concurrencia a 4. Es el punto dulce perfecto para no disparar el límite RPS de Google
  const limit = pLimit(4); 
  
  let processed = 0, dbBuffer = [];
  const startTime = Date.now();

  const processBatch = async (batchEn, index) => {
    // 💧 ARRANQUE POR GOTEO: Cada trabajador arranca con 2 segundos de diferencia.
    if (index < 4) await sleep(index * 2000); 
    else await sleep(1000 + Math.random() * 1000);

    const translatedBatch = await translateBatchOptimized(batchEn);
    
    if (translatedBatch?.length > 0) {
      translatedBatch.forEach(transItem => {
        const orig = batchEn.find(e => e.id === transItem.id);
        if (orig) {
          dbBuffer.push({
            sourceId: orig.sourceId, language: TARGET_LANG, bookAbbr: orig.bookAbbr,
            bookOrder: orig.bookOrder, chapter: orig.chapter, verseStart: orig.verseStart,
            verseEnd: orig.verseEnd, title: transItem.title || null,
            content: transItem.content || orig.content, contentHtml: transItem.contentHtml || null,
            divId: orig.divId, sectionType: orig.sectionType, volume: orig.volume
          });
          processed++;
        }
      });
    }

    if (processed % 100 < 10) {
      const elapsed = (Date.now() - startTime) / 1000 / 60;
      const rate = processed / elapsed;
      const eta = (totalEntries - processed) / rate;
      console.log(`\n📊 ${processed}/${totalEntries} | ${rate.toFixed(0)}/min | ETA: ${eta.toFixed(0)}min`);
      console.log(`   📈 3.1: ${stats.byModel['gemini-3.1-flash-lite-preview']} | 2.5L: ${stats.byModel['gemini-2.5-flash-lite']} | 2.5: ${stats.byModel['gemini-2.5-flash']} | 🌐: ${stats.google}`);
    }

    if (dbBuffer.length >= 100) {
      const toInsert = dbBuffer.splice(0, 100);
      const { error } = await supabase.from("CommentaryEntry").insert(toInsert);
      if (!error) console.log(`   💾 Guardados ${toInsert.length}`);
    }
  };

  await Promise.all(batches.map((b, idx) => limit(() => processBatch(b, idx))));

  if (dbBuffer.length > 0) await supabase.from("CommentaryEntry").insert(dbBuffer);
  return processed;
}

// ═══════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════
async function main() {
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════╗
║  🚀 TRADUCTOR v5.1 "Modo Zen" (Paciencia y Cero Spam)                     ║
║  EN → ${TARGET_LANG.toUpperCase()}                                                                ║
╚═══════════════════════════════════════════════════════════════════════════╝
`);

  const startTime = Date.now();

  try {
    const [enEntries, targetEntries] = await Promise.all([getAllEntries("en"), getAllEntries(TARGET_LANG)]);
    const existingSet = new Set(targetEntries.map(e => `${e.sourceId}-${e.divId}`));
    const pendingEntries = enEntries.filter(e => !existingSet.has(`${e.sourceId}-${e.divId}`));

    if (pendingEntries.length === 0) { console.log("✅ ¡Todo traducido!"); return; }

    const batches = createOptimizedBatches(pendingEntries);
    await processAllBatches(batches, pendingEntries.length);
    
    console.log(`\n✅ COMPLETADO en ${((Date.now() - startTime) / 1000 / 60).toFixed(1)} min`);
  } catch (error) { console.error(`\n❌ Error: ${error.message}`); }
}

main();
