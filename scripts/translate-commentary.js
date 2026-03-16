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

// ═══════════════════════════════════════════════════════════════════
// DIVIDIR KEYS EN DOS GRUPOS DE 10
// ═══════════════════════════════════════════════════════════════════
const KEYS_GROUP_A = GEMINI_KEYS.slice(0, 10);  // Primeras 10
const KEYS_GROUP_B = GEMINI_KEYS.slice(10, 20); // Segundas 10

console.log(`🔑 Grupo A: ${KEYS_GROUP_A.length} keys`);
console.log(`🔑 Grupo B: ${KEYS_GROUP_B.length} keys`);

// ═══════════════════════════════════════════════════════════════════
// MODELOS EN ORDEN DE PRIORIDAD
// ═══════════════════════════════════════════════════════════════════
const MODELS = [
  { name: 'gemini-3.1-flash-lite-preview', rpm: 15, rpd: 500 },
  { name: 'gemini-2.5-flash-lite', rpm: 10, rpd: 20 },
  { name: 'gemini-2.5-flash', rpm: 5, rpd: 20 }
];

// ═══════════════════════════════════════════════════════════════════
// RATE LIMITER v4 - Por grupo de keys + modelo
// ═══════════════════════════════════════════════════════════════════
class GroupedRateLimiter {
  constructor(keysGroupA, keysGroupB, models) {
    this.groups = {
      A: { keys: keysGroupA, name: 'A (1-10)' },
      B: { keys: keysGroupB, name: 'B (11-20)' }
    };
    this.models = models;
    
    // Tracking por key individual
    this.keyStats = new Map();
    [...keysGroupA, ...keysGroupB].forEach(key => {
      this.keyStats.set(key, {
        requestTimestamps: [],
        requestsToday: 0,
        dayStart: Date.now(),
        exhaustedUntil: 0
      });
    });
    
    // Estado actual de la cascada
    this.currentModelIndex = 0;
    this.currentGroup = 'A';
    this.currentKeyIndex = { A: 0, B: 0 };
  }

  _cleanOldTimestamps(stats) {
    const oneMinuteAgo = Date.now() - 60000;
    stats.requestTimestamps = stats.requestTimestamps.filter(ts => ts > oneMinuteAgo);
  }

  _checkDayReset(stats) {
    if (Date.now() - stats.dayStart > 86400000) {
      stats.requestsToday = 0;
      stats.dayStart = Date.now();
    }
  }

  _isKeyAvailable(key, model) {
    const stats = this.keyStats.get(key);
    if (!stats) return false;
    
    const now = Date.now();
    if (stats.exhaustedUntil > now) return false;
    
    this._cleanOldTimestamps(stats);
    if (stats.requestTimestamps.length >= model.rpm - 1) return false;
    
    this._checkDayReset(stats);
    if (stats.requestsToday >= model.rpd - 5) return false;
    
    return true;
  }

  // Contar keys disponibles en un grupo para un modelo
  _countAvailableInGroup(groupId, model) {
    const group = this.groups[groupId];
    return group.keys.filter(key => this._isKeyAvailable(key, model)).length;
  }

  // Obtener una key disponible de un grupo específico
  _getKeyFromGroup(groupId, model) {
    const group = this.groups[groupId];
    
    for (let i = 0; i < group.keys.length; i++) {
      const keyIndex = (this.currentKeyIndex[groupId] + i) % group.keys.length;
      const key = group.keys[keyIndex];
      
      if (this._isKeyAvailable(key, model)) {
        this.currentKeyIndex[groupId] = (keyIndex + 1) % group.keys.length;
        return key;
      }
    }
    return null;
  }

  // MÉTODO PRINCIPAL: Obtener key+modelo siguiendo la cascada
  getBestKeyAndModel() {
    // Cascada de 6 niveles:
    // 1. Grupo A + Modelo 0 (3.1)
    // 2. Grupo B + Modelo 0 (3.1)
    // 3. Grupo A + Modelo 1 (2.5-lite)
    // 4. Grupo B + Modelo 1 (2.5-lite)
    // 5. Grupo A + Modelo 2 (2.5)
    // 6. Grupo B + Modelo 2 (2.5)
    
    const cascade = [
      { group: 'A', modelIndex: 0 },
      { group: 'B', modelIndex: 0 },
      { group: 'A', modelIndex: 1 },
      { group: 'B', modelIndex: 1 },
      { group: 'A', modelIndex: 2 },
      { group: 'B', modelIndex: 2 },
    ];

    for (const level of cascade) {
      const model = this.models[level.modelIndex];
      const key = this._getKeyFromGroup(level.group, model);
      
      if (key) {
        return {
          key,
          model: model.name,
          group: level.group,
          available: true,
          level: `${level.group}+${model.name.split('-').slice(-2, -1)[0]}`
        };
      }
    }

    // Ninguna combinación disponible - calcular tiempo de espera
    let minWait = Infinity;
    
    for (const key of [...this.groups.A.keys, ...this.groups.B.keys]) {
      const stats = this.keyStats.get(key);
      const now = Date.now();
      
      if (stats.exhaustedUntil > now) {
        minWait = Math.min(minWait, stats.exhaustedUntil - now);
      } else {
        this._cleanOldTimestamps(stats);
        if (stats.requestTimestamps.length > 0) {
          const oldest = Math.min(...stats.requestTimestamps);
          const wait = (oldest + 60000) - now;
          if (wait > 0) minWait = Math.min(minWait, wait);
        }
      }
    }

    return {
      key: null,
      model: null,
      available: false,
      waitMs: minWait === Infinity ? 10000 : Math.max(1000, minWait)
    };
  }

  recordSuccess(key, modelName) {
    const stats = this.keyStats.get(key);
    stats.requestTimestamps.push(Date.now());
    stats.requestsToday++;
  }

  recordRateLimit(key, modelName) {
    const stats = this.keyStats.get(key);
    stats.exhaustedUntil = Date.now() + 65000;
    
    const keyNum = [...this.groups.A.keys, ...this.groups.B.keys].indexOf(key) + 1;
    const group = this.groups.A.keys.includes(key) ? 'A' : 'B';
    console.log(`   🔴 Key #${keyNum} (Grupo ${group}) rate limited → cooldown 65s`);
  }

  getStatus() {
    const status = { A: {}, B: {} };
    
    for (const model of this.models) {
      const shortName = model.name.includes('3.1') ? '3.1' : 
                        model.name.includes('2.5-flash-lite') ? '2.5L' : '2.5';
      status.A[shortName] = this._countAvailableInGroup('A', model);
      status.B[shortName] = this._countAvailableInGroup('B', model);
    }
    
    return status;
  }
}

const rateLimiter = new GroupedRateLimiter(KEYS_GROUP_A, KEYS_GROUP_B, MODELS);

// ═══════════════════════════════════════════════════════════════════
// ESTADÍSTICAS
// ═══════════════════════════════════════════════════════════════════
const stats = {
  byModel: {
    'gemini-3.1-flash-lite-preview': 0,
    'gemini-2.5-flash-lite': 0,
    'gemini-2.5-flash': 0,
  },
  byGroup: { A: 0, B: 0 },
  google: 0,
  waits: 0
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
  } catch {
    return text;
  }
}

async function translateBatchWithGoogleTranslate(entriesBatch, targetLang) {
  console.log(`   🌐 GOOGLE TRANSLATE (${entriesBatch.length} entries) - Último recurso`);
  const results = [];
  for (const entry of entriesBatch) {
    results.push({
      id: entry.id,
      title: entry.title ? await translateWithGoogleTranslate(entry.title, targetLang) : "",
      content: entry.content ? await translateWithGoogleTranslate(entry.content, targetLang) : "",
      contentHtml: entry.contentHtml ? await translateWithGoogleTranslate(entry.contentHtml, targetLang) : ""
    });
    await sleep(400);
  }
  stats.google += entriesBatch.length;
  return results;
}

// ═══════════════════════════════════════════════════════════════════
// TRADUCTOR BATCH CON CASCADA
// ═══════════════════════════════════════════════════════════════════
async function translateBatchOptimized(entriesBatch) {
  const payload = entriesBatch.map(entry => ({
    id: entry.id,
    title: entry.title || "",
    content: entry.content || "",
    contentHtml: entry.contentHtml || ""
  }));

  const languageName = TARGET_LANG === 'es' ? 'Spanish' : TARGET_LANG === 'ca' ? 'Catalan' : TARGET_LANG;
  const systemPrompt = `Translate this JSON array from English to ${languageName}. Keep "id" unchanged. Translate "title", "content", "contentHtml". Preserve HTML tags. Return only valid JSON array.`;

  // Intentar hasta 6 veces (6 niveles de cascada)
  for (let attempt = 1; attempt <= 6; attempt++) {
    let keyInfo = rateLimiter.getBestKeyAndModel();
    
    // Si no hay disponible, esperar
    if (!keyInfo.available) {
      const waitTime = Math.min(keyInfo.waitMs, 30000);
      stats.waits++;
      
      if (stats.waits % 10 === 0) {
        console.log(`   ⏳ Esperando ${(waitTime/1000).toFixed(1)}s (intento ${attempt}/6)...`);
      }
      
      await sleep(waitTime);
      keyInfo = rateLimiter.getBestKeyAndModel();
    }
    
    // Si después de esperar sigue sin haber, Google Translate
    if (!keyInfo.available || !keyInfo.key) {
      return await translateBatchWithGoogleTranslate(entriesBatch, TARGET_LANG);
    }

    try {
      const ai = new GoogleGenAI({ apiKey: keyInfo.key });

      const response = await ai.models.generateContent({
        model: keyInfo.model,
        contents: JSON.stringify(payload),
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

      // Éxito
      rateLimiter.recordSuccess(keyInfo.key, keyInfo.model);
      stats.byModel[keyInfo.model] += entriesBatch.length;
      stats.byGroup[keyInfo.group] += entriesBatch.length;
      
      return translatedArray;

    } catch (error) {
      const isRateLimit = error.status === 429 || 
                          error.message?.includes('429') || 
                          error.message?.includes('RESOURCE_EXHAUSTED');
      
      if (isRateLimit) {
        rateLimiter.recordRateLimit(keyInfo.key, keyInfo.model);
        continue;
      }
      
      if (attempt === 6) {
        console.log(`   ⚠️ Error final: ${error.message?.substring(0, 50)}`);
        return await translateBatchWithGoogleTranslate(entriesBatch, TARGET_LANG);
      }
    }
  }
  
  return await translateBatchWithGoogleTranslate(entriesBatch, TARGET_LANG);
}

// ═══════════════════════════════════════════════════════════════════
// BATCHING
// ═══════════════════════════════════════════════════════════════════
function createOptimizedBatches(entries) {
  const MAX_CHARS = 12000;
  const MAX_ENTRIES = 8;
  
  const batches = [];
  let currentBatch = [];
  let currentChars = 0;

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
// OBTENER DATOS
// ═══════════════════════════════════════════════════════════════════
async function getAllEntries(lang) {
  let allEntries = [];
  let page = 0;
  while (true) {
    const { data, error } = await supabase
      .from("CommentaryEntry")
      .select("*")
      .eq("language", lang)
      .range(page * 1000, (page + 1) * 1000 - 1);
    if (error) throw error;
    if (data.length === 0) break;
    allEntries = allEntries.concat(data);
    page++;
  }
  return allEntries;
}

// ═══════════════════════════════════════════════════════════════════
// PROCESADOR
// ═══════════════════════════════════════════════════════════════════
async function processAllBatches(batches, totalEntries) {
  const limit = pLimit(5);
  let processed = 0;
  let dbBuffer = [];
  const startTime = Date.now();

  const processBatch = async (batchEn) => {
    await sleep(300 + Math.random() * 200);
    const translatedBatch = await translateBatchOptimized(batchEn);
    
    if (translatedBatch?.length > 0) {
      translatedBatch.forEach(transItem => {
        const orig = batchEn.find(e => e.id === transItem.id);
        if (orig) {
          dbBuffer.push({
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
    }

    if (processed % 100 < 10) {
      const elapsed = (Date.now() - startTime) / 1000 / 60;
      const rate = processed / elapsed;
      const eta = (totalEntries - processed) / rate;
      const st = rateLimiter.getStatus();
      
      console.log(`\n📊 ${processed}/${totalEntries} | ${rate.toFixed(0)}/min | ETA: ${eta.toFixed(0)}min`);
      console.log(`   Grupo A: 3.1=${st.A['3.1']}/10  2.5L=${st.A['2.5L']}/10  2.5=${st.A['2.5']}/10`);
      console.log(`   Grupo B: 3.1=${st.B['3.1']}/10  2.5L=${st.B['2.5L']}/10  2.5=${st.B['2.5']}/10`);
      console.log(`   📈 3.1:${stats.byModel['gemini-3.1-flash-lite-preview']} | 2.5L:${stats.byModel['gemini-2.5-flash-lite']} | 2.5:${stats.byModel['gemini-2.5-flash']} | 🌐:${stats.google}`);
    }

    if (dbBuffer.length >= 100) {
      const toInsert = dbBuffer.splice(0, 100);
      const { error } = await supabase.from("CommentaryEntry").insert(toInsert);
      if (!error) console.log(`   💾 Guardados ${toInsert.length}`);
    }
  };

  await Promise.all(batches.map(batch => limit(() => processBatch(batch))));

  if (dbBuffer.length > 0) {
    await supabase.from("CommentaryEntry").insert(dbBuffer);
    console.log(`   💾 Guardados últimos ${dbBuffer.length}`);
  }

  return processed;
}

// ═══════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════
async function main() {
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════╗
║  🚀 TRADUCTOR CON CASCADA DE GRUPOS v4                                    ║
║  EN → ${TARGET_LANG.toUpperCase()}                                                                ║
╠═══════════════════════════════════════════════════════════════════════════╣
║                                                                           ║
║  🔑 GRUPO A (Keys 1-10):  Principal                                       ║
║  🔑 GRUPO B (Keys 11-20): Backup                                          ║
║                                                                           ║
║  📊 CASCADA:                                                              ║
║  ┌─────────────────────────────────────────────────────────────────────┐  ║
║  │ 1. Grupo A + gemini-3.1-flash-lite-preview (15 RPM)                 │  ║
║  │    ↓ si las 10 keys fallan                                          │  ║
║  │ 2. Grupo B + gemini-3.1-flash-lite-preview (15 RPM)                 │  ║
║  │    ↓ si las 10 keys fallan                                          │  ║
║  │ 3. Grupo A + gemini-2.5-flash-lite (10 RPM)                         │  ║
║  │    ↓ si las 10 keys fallan                                          │  ║
║  │ 4. Grupo B + gemini-2.5-flash-lite (10 RPM)                         │  ║
║  │    ↓ si las 10 keys fallan                                          │  ║
║  │ 5. Grupo A + gemini-2.5-flash (5 RPM)                               │  ║
║  │    ↓ si las 10 keys fallan                                          │  ║
║  │ 6. Grupo B + gemini-2.5-flash (5 RPM)                               │  ║
║  │    ↓ si todas fallan                                                │  ║
║  │ 7. Google Translate (último recurso)                                │  ║
║  └─────────────────────────────────────────────────────────────────────┘  ║
║                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════╝
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

    console.log(`   📚 Total EN: ${enEntries.length}`);
    console.log(`   ✅ Ya traducidos: ${targetEntries.length}`);
    console.log(`   ⏳ Pendientes: ${pendingEntries.length}\n`);

    if (pendingEntries.length === 0) {
      console.log("✅ ¡Todo traducido!");
      return;
    }

    const batches = createOptimizedBatches(pendingEntries);
    console.log(`📦 ${batches.length} lotes\n`);

    const processed = await processAllBatches(batches, pendingEntries.length);

    const totalTime = (Date.now() - startTime) / 1000 / 60;

    console.log(`
╔═══════════════════════════════════════════════════════════════════════════╗
║  ✅ COMPLETADO                                                            ║
╠═══════════════════════════════════════════════════════════════════════════╣
║  Total:          ${processed.toString().padEnd(57)}║
║                                                                           ║
║  Por modelo:                                                              ║
║    3.1-flash:    ${stats.byModel['gemini-3.1-flash-lite-preview'].toString().padEnd(57)}║
║    2.5-flash-L:  ${stats.byModel['gemini-2.5-flash-lite'].toString().padEnd(57)}║
║    2.5-flash:    ${stats.byModel['gemini-2.5-flash'].toString().padEnd(57)}║
║    Google:       ${stats.google.toString().padEnd(57)}║
║                                                                           ║
║  Por grupo:                                                               ║
║    Grupo A:      ${stats.byGroup.A.toString().padEnd(57)}║
║    Grupo B:      ${stats.byGroup.B.toString().padEnd(57)}║
║                                                                           ║
║  Tiempo:         ${totalTime.toFixed(1)} min                                                  ║
║  Velocidad:      ${(processed/totalTime).toFixed(0)}/min                                                 ║
╚═══════════════════════════════════════════════════════════════════════════╝
`);

  } catch (error) {
    console.error(`\n❌ Error: ${error.message}`);
    process.exit(1);
  }
}

main();
