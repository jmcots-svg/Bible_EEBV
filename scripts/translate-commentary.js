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

// RESTAURADOS TUS MODELOS ORIGINALES
const MODELS = [
  { name: 'gemini-3.1-flash-lite-preview', rpm: 15, rpd: 500 },
  { name: 'gemini-2.5-flash-lite', rpm: 10, rpd: 20 },
  { name: 'gemini-2.5-flash', rpm: 5, rpd: 20 }
];

// ═══════════════════════════════════════════════════════════════════
// SMART RATE LIMITER (Control exacto de RPM y RPD)
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
          exhaustedUntil: 0 
        });
      });
    });
  }

  getBestSlot() {
    const now = Date.now();
    let minWaitMs = Infinity;

    for (const slot of this.slots) {
      // 1. Reiniciar contadores diarios si pasaron 24h
      if (now - slot.dayStart > 86400000) {
        slot.requestsToday = 0;
        slot.dayStart = now;
      }

      // 2. Si este modelo ya consumió su límite diario, lo saltamos
      if (slot.requestsToday >= slot.rpd) continue;

      // 3. Limpiar historial de peticiones del último minuto
      slot.history = slot.history.filter(ts => now - ts < 60000);

      // 4. Si está bloqueado por un error 429
      if (slot.exhaustedUntil > now) {
        const wait = slot.exhaustedUntil - now;
        if (wait < minWaitMs) minWaitMs = wait;
        continue;
      }

      // 5. Comprobar si hay hueco en el minuto actual
      if (slot.history.length < slot.rpm) {
        slot.history.push(now);
        slot.requestsToday++;
        return { available: true, key: slot.key, model: slot.model, waitMs: 0 };
      } else {
        // Calcular tiempo exacto hasta que se libere un hueco en este minuto
        const wait = 60000 - (now - slot.history[0]);
        if (wait < minWaitMs) minWaitMs = wait;
      }
    }

    // Si todo está lleno (o todos llegaron al límite diario), esperamos el mínimo posible
    return { available: false, waitMs: minWaitMs === Infinity ? 5000 : minWaitMs };
  }

  markExhausted(key, model) {
    const slot = this.slots.find(s => s.key === key && s.model === model);
    if (slot) slot.exhaustedUntil = Date.now() + 61000; // Bloqueo de 61 segundos por 429
  }
}

const rateLimiter = new SmartRateLimiter(GEMINI_KEYS, MODELS);

const stats = { 
  'gemini-3.1-flash-lite-preview': 0, 
  'gemini-2.5-flash-lite': 0, 
  'gemini-2.5-flash': 0 
};

// ═══════════════════════════════════════════════════════════════════
// TRADUCTOR GEMINI (Motor Principal)
// ═══════════════════════════════════════════════════════════════════
async function translateBatchOptimized(entriesBatch) {
  const payload = entriesBatch.map(entry => ({
    id: entry.id, 
    title: entry.title || "", 
    content: entry.content || "", 
    contentHtml: entry.contentHtml || ""
  }));

  const languageName = TARGET_LANG === 'es' ? 'Spanish' : TARGET_LANG === 'ca' ? 'Catalan' : TARGET_LANG;
  const systemPrompt = `Translate this JSON array from English to ${languageName}. Keep "id" unchanged. Translate "title", "content", "contentHtml". Preserve HTML tags. Return ONLY a valid JSON array.`;

  let attempts = 0;
  while (attempts < 8) { 
    const slot = rateLimiter.getBestSlot();
    
    if (!slot.available) {
      if (slot.waitMs === Infinity) {
        throw new Error("⚠️ Todas las cuotas diarias (RPD) de todos los modelos se han agotado.");
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
      responseText = responseText.replace(/^

      
      const translatedArray = JSON.parse(responseText);
      
      if (!Array.isArray(translatedArray) || translatedArray.length !== entriesBatch.length) {
        throw new Error("El modelo no devolvió la longitud correcta");
      }

      stats[slot.model] += entriesBatch.length;
      return translatedArray;

    } catch (error) {
      attempts++;
      const isRateLimit = error.status === 429 || error.message?.includes('429') || error.message?.toLowerCase().includes('exhausted');
      
      if (isRateLimit) {
        rateLimiter.markExhausted(slot.key, slot.model);
      } else {
        await sleep(1500); 
      }
    }
  }
  
  console.error(`❌ Lote de ${entriesBatch.length} fallido tras 8 intentos.`);
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
// EXTRACCIÓN DE DATOS DE SUPABASE
// ═══════════════════════════════════════════════════════════════════
async function getAllEntriesOptimized(lang, pageSize = 500) {
  let allEntries = [];
  let page = 0;
  let hasMore = true;

  process.stdout.write(`\n📥 Cargando datos en "${lang}"... `);

  while (hasMore) {
    const from = page * pageSize;
    const to = from + pageSize - 1;

    const { data, error } = await supabase
      .from("CommentaryEntry")
      .select("id, sourceId, language, bookAbbr, bookOrder, chapter, verseStart, verseEnd, title, content, contentHtml, divId, sectionType, volume")
      .eq("language", lang)
      .order("id", { ascending: true })
      .range(from, to);

    if (error) throw error;
    if (data.length < pageSize) hasMore = false;

    allEntries = allEntries.concat(data);
    page++;
    process.stdout.write(`\r📥 Cargando datos en "${lang}"... ✅ ${allEntries.length} cargados.`);
  }
  console.log("");
  return allEntries;
}

// ═══════════════════════════════════════════════════════════════════
// PROCESADOR CONCURRENTE
// ═══════════════════════════════════════════════════════════════════
async function processAllBatches(batches, totalEntries) {
  const limit = pLimit(5); 
  let processed = 0;
  const startTime = Date.now();

  const processBatch = async (batchEn, index) => {
    if (index < 5) await sleep(index * 300); 

    const translatedBatch = await translateBatchOptimized(batchEn);
    
    if (translatedBatch && translatedBatch.length > 0) {
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

    if (processed % 20 < 10) { 
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
║  ⚡ TRADUCTOR GEMINI PURO (Modo 5 Hilos)                        ║
║  EN → ${TARGET_LANG.toUpperCase().padEnd(60, ' ')}║
╚═════════════════════════════════════════════════════════════════╝
`);
  const startTime = Date.now();

  try {
    const [enEntries, targetEntries] = await Promise.all([
      getAllEntriesOptimized("en"),
      getAllEntriesOptimized(TARGET_LANG)
    ]);

    const existingSet = new Set(targetEntries.map(e => `${e.sourceId}|${e.divId}`));
    const pendingEntries = enEntries.filter(e => !existingSet.has(`${e.sourceId}|${e.divId}`));

    console.log(`\n⏳ Entradas pendientes: ${pendingEntries.length}`);

    if (pendingEntries.length === 0) { 
      console.log("✅ Todo está traducido.");
      return; 
    }

    const batches = createOptimizedBatches(pendingEntries);
    console.log(`📦 Lotes generados: ${batches.length}\n`);
    
    await processAllBatches(batches, pendingEntries.length);
    
    const finalMin = ((Date.now() - startTime) / 1000 / 60).toFixed(2);
    console.log(`\n✨ COMPLETADO en ${finalMin} minutos`);
  } catch (error) { 
    console.error(`\n❌ Error Crítico:`, error);
    process.exit(1);
  }
}

main();



