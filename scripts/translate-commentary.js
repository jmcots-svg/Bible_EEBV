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

const ALL_GEMINI_KEYS = (process.env.GEMINI_API_KEYS || "")
  .split(",")
  .map(k => k.trim())
  .filter(Boolean);

// ── Cuántas keys usar simultáneamente (ajustable sin tocar el resto) ──
const ACTIVE_KEYS_COUNT = 7;

// Tomamos las primeras N keys del array
const GEMINI_KEYS = ALL_GEMINI_KEYS.slice(0, ACTIVE_KEYS_COUNT);

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || GEMINI_KEYS.length === 0) {
  console.error("❌ Error: Faltan variables de entorno");
  process.exit(1);
}

console.log(`🔑 Keys activas: ${GEMINI_KEYS.length} / ${ALL_GEMINI_KEYS.length} disponibles`);

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// ─── Modelos por prioridad ─────────────────────────────────────────
// gemini-3.1-flash-lite-preview es el caballo de batalla (500 RPD!)
// Los otros son fallback de emergencia (solo 20 RPD por key/día)
const MODELS = [
  { name: "gemini-3.1-flash-lite-preview", rpm: 14, rpd: 500,  priority: 1 },
  { name: "gemini-2.5-flash-lite",         rpm:  9, rpd:  20,  priority: 2 },
  { name: "gemini-2.5-flash",              rpm:  4, rpd:  20,  priority: 3 },
];

const TARGET_LANG_NAME =
  TARGET_LANG === "es" ? "Spanish" :
  TARGET_LANG === "ca" ? "Catalan" :
  TARGET_LANG;

let abortProcess = false;

// ═══════════════════════════════════════════════════════════════════
// KEY WORKER — Un worker por key activa
// Cada worker gestiona su propio rate-limit de forma independiente
// ═══════════════════════════════════════════════════════════════════
class KeyWorker {
  constructor(keyIndex, apiKey) {
    this.keyIndex  = keyIndex;
    this.apiKey    = apiKey;
    this.ai        = new GoogleGenAI({ apiKey });

    // Estado por modelo
    this.modelState = {};
    for (const m of MODELS) {
      this.modelState[m.name] = {
        history:           [],   // timestamps del último minuto
        requestsToday:     0,
        dayStart:          Date.now(),
        exhaustedUntil:    0,
        consecutive429s:   0,
        rpm:               m.rpm,
        rpd:               m.rpd,
        priority:          m.priority,
      };
    }

    this.stats = {};
    for (const m of MODELS) this.stats[m.name] = 0;
  }

  // ── Refresca el contador diario si ha pasado el día ──────────────
  _refreshDay(state) {
    if (Date.now() - state.dayStart > 86_400_000) {
      state.requestsToday   = 0;
      state.dayStart        = Date.now();
      state.consecutive429s = 0;
      state.exhaustedUntil  = 0;
    }
  }

  // ── Devuelve el modelo disponible con mayor prioridad ─────────────
  // Retorna { model, waitMs } donde waitMs=0 significa "disponible ya"
  getBestModel() {
    const now = Date.now();
    let bestWait = Infinity;

    // Ordenar por prioridad (1 = mejor)
    const sorted = MODELS.slice().sort((a, b) =>
      this.modelState[a.name].priority - this.modelState[b.name].priority
    );

    for (const m of sorted) {
      const state = this.modelState[m.name];
      this._refreshDay(state);

      if (state.requestsToday >= state.rpd) continue;           // Cuota diaria agotada
      if (state.exhaustedUntil > now) {
        bestWait = Math.min(bestWait, state.exhaustedUntil - now);
        continue;
      }

      // Limpiar historial del minuto
      state.history = state.history.filter(ts => now - ts < 60_000);

      if (state.history.length < state.rpm) {
        // ¡Disponible!
        state.history.push(now);
        state.requestsToday++;
        return { model: m.name, waitMs: 0 };
      } else {
        const wait = 60_000 - (now - state.history[0]);
        bestWait = Math.min(bestWait, wait);
      }
    }

    // Todos los modelos ocupados o agotados
    return { model: null, waitMs: bestWait === Infinity ? null : bestWait };
  }

  // ── Marca un modelo como exhausto tras un 429 ─────────────────────
  markExhausted(modelName, isDailyQuota) {
    const state = this.modelState[modelName];
    if (!state) return;
    state.consecutive429s++;

    if (isDailyQuota || state.consecutive429s >= 3) {
      state.requestsToday  = state.rpd;   // Cierra la cuota diaria
      state.exhaustedUntil = Date.now() + 86_400_000;
    } else {
      // Backoff progresivo: 60s, 120s
      const cooldown = state.consecutive429s * 60_000;
      state.exhaustedUntil = Date.now() + cooldown;
    }
  }

  markSuccess(modelName) {
    const state = this.modelState[modelName];
    if (state) state.consecutive429s = 0;
  }

  // ── Traduce un batch usando esta key ─────────────────────────────
  // Retorna el array traducido o null si falla
  async translateBatch(entriesBatch, maxAttempts = 6) {
    const payload = entriesBatch.map(e => ({
      id: e.id,
      title: e.title || "",
      content: e.content || "",
      contentHtml: e.contentHtml || "",
    }));

    const systemPrompt =
      `Translate JSON to ${TARGET_LANG_NAME}. ` +
      `Keep "id". Translate "title", "content", "contentHtml". ` +
      `Return ONLY a JSON array.`;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      if (abortProcess) return null;

      const { model, waitMs } = this.getBestModel();

      if (model === null) {
        // Esta key está completamente agotada por hoy
        return null;
      }

      if (waitMs > 0) {
        await sleep(waitMs + 100);
        continue; // Reintentar tras la espera
      }

      try {
        const response = await this.ai.models.generateContent({
          model,
          contents: JSON.stringify(payload),
          config: {
            systemInstruction: systemPrompt,
            temperature: 0.1,
            responseMimeType: "application/json",
          },
        });

        let text = (response.text || "")
          .replace(/^\x60{3}(?:json)?\n?/i, "")
          .replace(/\n?\x60{3}$/i, "")
          .trim();

        const result = JSON.parse(text);
        this.markSuccess(model);
        this.stats[model] += entriesBatch.length;
        return result;

      } catch (err) {
        const msg = (err.message || "").toLowerCase();
        const is429 = err.status === 429 || msg.includes("429") || msg.includes("exhausted");

        if (is429) {
          const isDaily = msg.includes("quota") || msg.includes("daily");
          this.markExhausted(model, isDaily);
          // No sumamos attempt: dejamos que el bucle reintente con otro modelo
        } else {
          // Error no relacionado con cuotas → espera corta y reintento
          await sleep(2_000 * (attempt + 1));
        }
      }
    }

    return null; // Agotados los intentos
  }

  // ── ¿Tiene al menos un modelo disponible hoy? ────────────────────
  get isAliveToday() {
    const now = Date.now();
    return MODELS.some(m => {
      const s = this.modelState[m.name];
      this._refreshDay(s);
      return s.requestsToday < s.rpd;
    });
  }
}

// ═══════════════════════════════════════════════════════════════════
// POOL DE WORKERS
// ═══════════════════════════════════════════════════════════════════
class WorkerPool {
  constructor(keys) {
    this.workers = keys.map((k, i) => new KeyWorker(i, k));
    // Round-robin pointer
    this._rr = 0;
  }

  // Devuelve el worker con menor carga (heurística: menor requestsToday en modelo principal)
  getWorker() {
    const alive = this.workers.filter(w => w.isAliveToday);
    if (alive.length === 0) return null;

    // Preferir el worker con menos peticiones hoy en el modelo principal
    const PRIMARY = MODELS[0].name;
    alive.sort((a, b) =>
      a.modelState[PRIMARY].requestsToday - b.modelState[PRIMARY].requestsToday
    );
    return alive[0];
  }

  get totalStats() {
    const totals = {};
    for (const m of MODELS) totals[m.name] = 0;
    for (const w of this.workers) {
      for (const m of MODELS) totals[m.name] += w.stats[m.name];
    }
    return totals;
  }

  get allExhausted() {
    return this.workers.every(w => !w.isAliveToday);
  }
}

// ═══════════════════════════════════════════════════════════════════
// BATCHING
// ═══════════════════════════════════════════════════════════════════
function createOptimizedBatches(entries) {
  const MAX_CHARS   = 28_000;
  const MAX_ENTRIES = 15;
  const batches = [];
  let current = [], chars = 0;

  for (const entry of entries) {
    const len =
      (entry.title?.length       || 0) +
      (entry.content?.length     || 0) +
      (entry.contentHtml?.length || 0);

    if ((chars + len > MAX_CHARS || current.length >= MAX_ENTRIES) && current.length > 0) {
      batches.push(current);
      current = [];
      chars   = 0;
    }
    current.push(entry);
    chars += len;
  }
  if (current.length > 0) batches.push(current);
  return batches;
}

// ═══════════════════════════════════════════════════════════════════
// QUERIES SUPABASE
// ═══════════════════════════════════════════════════════════════════
async function getTargetIdentifiers(lang) {
  let all = [], lastId = null, hasMore = true;
  while (hasMore) {
    let q = supabase
      .from("CommentaryEntry")
      .select("id, sourceId, divId")
      .eq("language", lang)
      .order("id", { ascending: true })
      .limit(2000);
    if (lastId !== null) q = q.gt("id", lastId);
    const { data, error } = await q;
    if (error) throw error;
    if (data.length < 2000) hasMore = false;
    if (data.length > 0) {
      lastId = data[data.length - 1].id;
      all = all.concat(data);
    }
  }
  return new Set(all.map(e => `${e.sourceId}|${e.divId}`));
}

async function getPendingEnglishEntries(existingSet) {
  let pending = [], lastId = null, hasMore = true;
  while (hasMore) {
    let q = supabase
      .from("CommentaryEntry")
      .select("*")
      .eq("language", "en")
      .order("id", { ascending: true })
      .limit(1000);
    if (lastId !== null) q = q.gt("id", lastId);
    const { data, error } = await q;
    if (error) throw error;
    if (data.length < 1000) hasMore = false;
    if (data.length > 0) {
      lastId = data[data.length - 1].id;
      pending = pending.concat(data.filter(e => !existingSet.has(`${e.sourceId}|${e.divId}`)));
    }
    process.stdout.write(`\r📥 Escaneando pendientes: ${pending.length} encontrados...`);
  }
  console.log("");
  return pending;
}

// ═══════════════════════════════════════════════════════════════════
// PROCESADOR PRINCIPAL
// Concurrencia: ACTIVE_KEYS_COUNT × rpm_principal = hasta ~140 RPM
// En la práctica usamos pLimit = ACTIVE_KEYS_COUNT × 2 para que
// siempre haya batches en vuelo mientras algún worker espera.
// ═══════════════════════════════════════════════════════════════════
async function processAllBatches(batches, totalEntries, pool) {
  // Concurrencia efectiva: 2 "slots en vuelo" por key activa
  // El rate-limit interno de cada KeyWorker evita sobrepasarse
  const CONCURRENCY = ACTIVE_KEYS_COUNT * 2;
  const limit       = pLimit(CONCURRENCY);

  let processed = 0;
  let failed    = 0;
  const startTime = Date.now();

  // Cola de batches fallidos para reintento al final
  const retryQueue = [];

  const processBatch = async (batchEn) => {
    if (abortProcess) return;

    // Seleccionar worker con menos carga
    const worker = pool.getWorker();
    if (!worker) {
      abortProcess = true;
      retryQueue.push(batchEn);
      return;
    }

    const translated = await worker.translateBatch(batchEn);

    if (!translated || translated.length === 0) {
      failed++;
      retryQueue.push(batchEn);  // Guardar para reintento con otra key
      return;
    }

    const inserts = translated.map(item => {
      const orig = batchEn.find(e => e.id === item.id);
      if (!orig) return null;
      return {
        sourceId:    orig.sourceId,
        language:    TARGET_LANG,
        bookAbbr:    orig.bookAbbr,
        bookOrder:   orig.bookOrder,
        chapter:     orig.chapter,
        verseStart:  orig.verseStart,
        verseEnd:    orig.verseEnd,
        title:       item.title       || null,
        content:     item.content     || orig.content,
        contentHtml: item.contentHtml || null,
        divId:       orig.divId,
        sectionType: orig.sectionType,
        volume:      orig.volume,
      };
    }).filter(Boolean);

    if (inserts.length > 0) {
      const { error } = await supabase.from("CommentaryEntry").insert(inserts);
      if (!error) {
        processed += inserts.length;
      } else {
        console.error("\n❌ Error al insertar:", error.message);
      }
    }

    // ── Progreso ──────────────────────────────────────────────────
    const elapsed = (Date.now() - startTime) / 1000 / 60;
    const rate    = elapsed > 0 ? (processed / elapsed).toFixed(0) : 0;
    const s       = pool.totalStats;
    process.stdout.write(
      `\r🚀 ${processed}/${totalEntries} | ${rate}/min | ` +
      `Fails:${failed} | ` +
      `3.1L:${s["gemini-3.1-flash-lite-preview"]} ` +
      `2.5L:${s["gemini-2.5-flash-lite"]} ` +
      `2.5F:${s["gemini-2.5-flash"]}   `
    );
  };

  // ── Primera pasada ────────────────────────────────────────────────
  await Promise.all(batches.map(b => limit(() => processBatch(b))));

  // ── Reintento de fallidos (si quedan workers vivos) ───────────────
  if (retryQueue.length > 0 && !pool.allExhausted) {
    console.log(`\n♻️  Reintentando ${retryQueue.length} batches fallidos...`);
    abortProcess = false;
    const retryLimit = pLimit(ACTIVE_KEYS_COUNT);
    await Promise.all(retryQueue.map(b => retryLimit(() => processBatch(b))));
  }

  console.log(`\n✅ Procesamiento finalizado. Procesados: ${processed} | Fallidos: ${failed}`);
}

// ═══════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════
async function main() {
  try {
    console.log(`🌐 Idioma destino: ${TARGET_LANG_NAME} (${TARGET_LANG})`);
    console.log(`⚡ Concurrencia máxima: ${ACTIVE_KEYS_COUNT * 2} slots`);
    console.log(`📊 Capacidad teórica: ~${ACTIVE_KEYS_COUNT * 14} RPM (${ACTIVE_KEYS_COUNT * 500} RPD)\n`);

    const existingSet    = await getTargetIdentifiers(TARGET_LANG);
    const pendingEntries = await getPendingEnglishEntries(existingSet);

    if (pendingEntries.length === 0) {
      return console.log("✅ Todo está traducido.");
    }

    console.log(`📋 Pendientes: ${pendingEntries.length} entradas`);

    const batches = createOptimizedBatches(pendingEntries);
    console.log(`📦 Batches creados: ${batches.length} (avg ${(pendingEntries.length / batches.length).toFixed(1)} entradas/batch)\n`);

    const pool = new WorkerPool(GEMINI_KEYS);
    await processAllBatches(batches, pendingEntries.length, pool);

    if (abortProcess || pool.allExhausted) {
      console.log("⚠️  Cuotas agotadas. Ejecuta de nuevo mañana.");
    }
  } catch (error) {
    console.error("\n❌ Error fatal:", error);
    process.exit(1);
  }
}

main();
