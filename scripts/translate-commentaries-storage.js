// translate-commentaries-storage.js
const { createClient } = require("@supabase/supabase-js");
const { GoogleGenAI }  = require("@google/genai");
const pLimit           = require("p-limit");
require("dotenv").config();

// ═══════════════════════════════════════════════════════════════════
// CONFIGURACIÓN
// ═══════════════════════════════════════════════════════════════════
const SUPABASE_URL         = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const TARGET_LANG          = process.env.TARGET_LANG || "ca";
const SOURCE_LANG          = "en";
const BUCKET_NAME          = "Commentaries";

// Si quieres procesar solo un comentario concreto:
// TARGET_COMMENTARY=MHC  → solo traduce MHC_en.json
// Si está vacío, procesa todos los pendientes
const TARGET_COMMENTARY = process.env.TARGET_COMMENTARY || "";

const ALL_GEMINI_KEYS = (process.env.GEMINI_API_KEYS || "")
  .split(",").map(k => k.trim()).filter(Boolean);

const ACTIVE_KEYS_COUNT = 5;
const GEMINI_KEYS       = ALL_GEMINI_KEYS.slice(0, ACTIVE_KEYS_COUNT);

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || GEMINI_KEYS.length === 0) {
  console.error("❌ Error: Faltan variables de entorno");
  process.exit(1);
}

console.log(`🔑 Keys activas: ${GEMINI_KEYS.length} / ${ALL_GEMINI_KEYS.length} disponibles`);

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const sleep    = (ms) => new Promise(r => setTimeout(r, ms));

// ─── Modelos por prioridad ─────────────────────────────────────────
const MODELS = [
  { name: "gemini-2.5-flash-lite-preview-06-17", rpm: 14, rpd: 500, priority: 1 },
  { name: "gemini-2.5-flash-lite",               rpm:  9, rpd:  20, priority: 2 },
  { name: "gemini-2.5-flash",                    rpm:  4, rpd:  20, priority: 3 },
];

const TARGET_LANG_NAME =
  TARGET_LANG === "es" ? "Spanish" :
  TARGET_LANG === "ca" ? "Catalan"  :
  TARGET_LANG;

let abortProcess = false;

// ═══════════════════════════════════════════════════════════════════
// HELPERS DE FICHEROS
// Formato: {commentaryAbbr}_{lang}.json  →  ej: luther_en.json
// ═══════════════════════════════════════════════════════════════════

/**
 * "luther_en.json" → { abbr: "luther", lang: "en" }
 * Soporta abreviaturas con guiones bajos: "MHC_NT_en.json" → { abbr: "MHC_NT", lang: "en" }
 */
function parseFilename(filename) {
  const base  = filename.replace(/\.json$/i, "");
  const parts = base.split("_");
  const lang  = parts.pop();
  const abbr  = parts.join("_");
  return { abbr, lang };
}

function buildFilename(abbr, lang) {
  return `${abbr}_${lang}.json`;
}

// ═══════════════════════════════════════════════════════════════════
// STORAGE HELPERS
// ═══════════════════════════════════════════════════════════════════

async function listAllFiles() {
  const all   = [];
  let offset  = 0;
  const LIMIT = 1_000;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .list("", { limit: LIMIT, offset, sortBy: { column: "name", order: "asc" } });

    if (error) throw new Error(`Storage list error: ${error.message}`);

    for (const f of data ?? []) {
      if (!f.name.toLowerCase().endsWith(".json")) continue;
      const { abbr, lang } = parseFilename(f.name);
      if (abbr && lang) all.push({ filename: f.name, abbr, lang });
    }

    if ((data?.length ?? 0) < LIMIT) hasMore = false;
    else offset += LIMIT;

    process.stdout.write(`\r📂 Listando bucket: ${all.length} ficheros JSON...`);
  }

  console.log(`\n📂 Total ficheros JSON en bucket: ${all.length}`);
  return all;
}

async function downloadJson(filename) {
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .download(filename);

  if (error) {
    console.error(`\n⚠️  No se pudo descargar ${filename}: ${error.message}`);
    return null;
  }

  try {
    return JSON.parse(await data.text());
  } catch (e) {
    console.error(`\n⚠️  JSON inválido en ${filename}: ${e.message}`);
    return null;
  }
}

async function uploadJson(filename, payload) {
  const body = JSON.stringify(payload, null, 2);
  const blob = new Blob([body], { type: "application/json" });

  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(filename, blob, { contentType: "application/json", upsert: true });

  if (error) {
    console.error(`\n❌ Upload fallido (${filename}): ${error.message}`);
    return false;
  }
  return true;
}

// ═══════════════════════════════════════════════════════════════════
// KEY WORKER
// ═══════════════════════════════════════════════════════════════════
class KeyWorker {
  constructor(keyIndex, apiKey) {
    this.keyIndex = keyIndex;
    this.apiKey   = apiKey;
    this.ai       = new GoogleGenAI({ apiKey });
    this.modelState = {};
    for (const m of MODELS) {
      this.modelState[m.name] = {
        history: [], requestsToday: 0, dayStart: Date.now(),
        exhaustedUntil: 0, consecutive429s: 0,
        rpm: m.rpm, rpd: m.rpd, priority: m.priority,
      };
    }
    this.stats = {};
    for (const m of MODELS) this.stats[m.name] = 0;
  }

  _refreshDay(state) {
    if (Date.now() - state.dayStart > 86_400_000) {
      state.requestsToday = 0; state.dayStart = Date.now();
      state.consecutive429s = 0; state.exhaustedUntil = 0;
    }
  }

  getBestModel() {
    const now = Date.now();
    let bestWait = Infinity;
    const sorted = MODELS.slice().sort((a, b) =>
      this.modelState[a.name].priority - this.modelState[b.name].priority);

    for (const m of sorted) {
      const s = this.modelState[m.name];
      this._refreshDay(s);
      if (s.requestsToday >= s.rpd) continue;
      if (s.exhaustedUntil > now) { bestWait = Math.min(bestWait, s.exhaustedUntil - now); continue; }
      s.history = s.history.filter(ts => now - ts < 60_000);
      if (s.history.length < s.rpm) {
        s.history.push(now); s.requestsToday++;
        return { model: m.name, waitMs: 0 };
      }
      bestWait = Math.min(bestWait, 60_000 - (now - s.history[0]));
    }
    return { model: null, waitMs: bestWait === Infinity ? null : bestWait };
  }

  markExhausted(modelName, isDailyQuota) {
    const s = this.modelState[modelName];
    if (!s) return;
    s.consecutive429s++;
    if (isDailyQuota || s.consecutive429s >= 3) {
      s.requestsToday = s.rpd; s.exhaustedUntil = Date.now() + 86_400_000;
    } else {
      s.exhaustedUntil = Date.now() + s.consecutive429s * 60_000;
    }
  }

  markSuccess(modelName) {
    const s = this.modelState[modelName];
    if (s) s.consecutive429s = 0;
  }

  /**
   * Recibe un batch de entradas con _idx (índice de correlación).
   * Solo traduce "title" y "content" (no hay contentHtml en tu estructura).
   * Devuelve array con { _idx, title, content } o null.
   */
  async translateBatch(entriesBatch, maxAttempts = 6) {
    // Solo enviamos lo necesario para traducir → menos tokens
    const payload = entriesBatch.map(e => ({
      _idx:    e._idx,
      title:   e.title   ?? null,
      content: e.content ?? "",
    }));

    const systemPrompt =
      `You are a biblical commentary translator. ` +
      `Translate the following JSON array from English to ${TARGET_LANG_NAME}. ` +
      `Rules:\n` +
      `- Keep "_idx" field unchanged (it is an internal identifier).\n` +
      `- Translate "title" (keep null if it is null).\n` +
      `- Translate "content" preserving paragraph structure, verse references ` +
      `  (e.g. "Gen 1,1", "Mt 5,3") and proper nouns.\n` +
      `- Do NOT translate names of people, places or book abbreviations.\n` +
      `- Return ONLY a valid JSON array, no markdown, no explanation.`;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      if (abortProcess) return null;
      const { model, waitMs } = this.getBestModel();
      if (model === null) return null;
      if (waitMs > 0) { await sleep(waitMs + 100); continue; }

      try {
        const response = await this.ai.models.generateContent({
          model,
          contents: JSON.stringify(payload),
          config: {
            systemInstruction: systemPrompt,
            temperature:       0.1,
            responseMimeType:  "application/json",
          },
        });

        const text = (response.text || "")
          .replace(/^\x60{3}(?:json)?\n?/i, "")
          .replace(/\n?\x60{3}$/i, "")
          .trim();

        const result = JSON.parse(text);

        // Validación básica: debe ser array y tener _idx
        if (!Array.isArray(result) || result.some(r => r._idx === undefined)) {
          throw new Error("Respuesta con formato inesperado");
        }

        this.markSuccess(model);
        this.stats[model] += entriesBatch.length;
        return result;

      } catch (err) {
        const msg   = (err.message || "").toLowerCase();
        const is429 = err.status === 429 || msg.includes("429") || msg.includes("exhausted");
        if (is429) {
          this.markExhausted(model, msg.includes("quota") || msg.includes("daily"));
        } else {
          console.error(`\n⚠️  Error attempt ${attempt + 1}/${maxAttempts}: ${err.message}`);
          await sleep(2_000 * (attempt + 1));
        }
      }
    }
    return null;
  }

  get isAliveToday() {
    return MODELS.some(m => {
      const s = this.modelState[m.name];
      this._refreshDay(s);
      return s.requestsToday < s.rpd;
    });
  }
}

// ═══════════════════════════════════════════════════════════════════
// WORKER POOL
// ═══════════════════════════════════════════════════════════════════
class WorkerPool {
  constructor(keys) { this.workers = keys.map((k, i) => new KeyWorker(i, k)); }

  getWorker() {
    const alive = this.workers.filter(w => w.isAliveToday);
    if (!alive.length) return null;
    const PRIMARY = MODELS[0].name;
    alive.sort((a, b) =>
      a.modelState[PRIMARY].requestsToday - b.modelState[PRIMARY].requestsToday);
    return alive[0];
  }

  get totalStats() {
    const t = {};
    for (const m of MODELS) t[m.name] = 0;
    for (const w of this.workers) for (const m of MODELS) t[m.name] += w.stats[m.name];
    return t;
  }

  get allExhausted() { return this.workers.every(w => !w.isAliveToday); }
}

// ═══════════════════════════════════════════════════════════════════
// BATCHING
// Solo "title" + "content" cuentan para el tamaño
// ═══════════════════════════════════════════════════════════════════
function createOptimizedBatches(entries) {
  const MAX_CHARS   = 28_000;
  const MAX_ENTRIES = 10;   // comentarios bíblicos son muy largos → batches más pequeños
  const batches = []; let current = [], chars = 0;

  for (const e of entries) {
    const len = (e.title?.length || 0) + (e.content?.length || 0);
    if ((chars + len > MAX_CHARS || current.length >= MAX_ENTRIES) && current.length > 0) {
      batches.push(current); current = []; chars = 0;
    }
    current.push(e); chars += len;
  }
  if (current.length > 0) batches.push(current);
  return batches;
}

// ═══════════════════════════════════════════════════════════════════
// TRADUCIR UN COMENTARIO COMPLETO
// ═══════════════════════════════════════════════════════════════════
async function translateCommentaryFile(abbr, sourceEntries, pool) {
  // Añadir _idx para correlación (no usamos divId porque puede ser largo)
  const tagged = sourceEntries.map((e, i) => ({ ...e, _idx: i }));
  const batches = createOptimizedBatches(tagged);

  // Resultado indexado por _idx
  const resultMap  = {};
  const retryQueue = [];

  let processedCount = 0;
  let failedCount    = 0;
  const startTime    = Date.now();

  const processBatch = async (batch) => {
    if (abortProcess) return;

    const worker = pool.getWorker();
    if (!worker) {
      abortProcess = true;
      retryQueue.push(batch);
      return;
    }

    const translated = await worker.translateBatch(batch);

    if (!translated || translated.length === 0) {
      failedCount++;
      retryQueue.push(batch);
      return;
    }

    for (const item of translated) {
      const orig = tagged[item._idx];
      if (!orig) continue;

      // Construir entrada final: todos los campos del original + campos traducidos
      resultMap[item._idx] = {
        bookAbbr:    orig.bookAbbr,
        bookOrder:   orig.bookOrder,
        chapter:     orig.chapter,
        verseStart:  orig.verseStart,
        verseEnd:    orig.verseEnd,
        title:       item.title ?? null,          // traducido
        content:     item.content || orig.content, // traducido (fallback al original)
        divId:       orig.divId,
        sectionType: orig.sectionType,
        volume:      orig.volume,
      };
    }

    processedCount += translated.length;

    // Progreso inline
    const elapsed = (Date.now() - startTime) / 1000;
    const s = pool.totalStats;
    process.stdout.write(
      `\r   ⏳ ${processedCount}/${sourceEntries.length} entradas | ` +
      `${elapsed.toFixed(0)}s | ` +
      `Fails:${failedCount} | ` +
      `M1:${s[MODELS[0].name]} M2:${s[MODELS[1].name]} M3:${s[MODELS[2].name]}   `
    );
  };

  // ── Primera pasada ────────────────────────────────────────────────
  const limit = pLimit(ACTIVE_KEYS_COUNT * 2);
  await Promise.all(batches.map(b => limit(() => processBatch(b))));

  // ── Reintento ─────────────────────────────────────────────────────
  if (retryQueue.length > 0 && !pool.allExhausted) {
    console.log(`\n   ♻️  Reintentando ${retryQueue.length} batches...`);
    abortProcess = false;
    const retryLimit = pLimit(ACTIVE_KEYS_COUNT);
    await Promise.all(retryQueue.map(b => retryLimit(() => processBatch(b))));
  }

  // ── Reconstruir array en orden original ──────────────────────────
  const finalArray = tagged.map(e => resultMap[e._idx] ?? null);
  const missing    = finalArray.filter(e => e === null);

  // Loguear entradas que no se pudieron traducir
  if (missing.length > 0) {
    console.log(`\n   ⚠️  ${missing.length} entradas sin traducir (se omiten del JSON final):`);
    tagged
      .filter(e => !resultMap[e._idx])
      .slice(0, 5)  // máximo 5 en log
      .forEach(e => console.log(`      • ${e.divId}`));
    if (missing.length > 5) console.log(`      ... y ${missing.length - 5} más`);
  }

  return {
    finalArray:   finalArray.filter(Boolean),
    totalSource:  sourceEntries.length,
    translated:   processedCount,
    failed:       missing.length,
  };
}

// ═══════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════
async function main() {
  try {
    console.log(`🌐 Idioma destino  : ${TARGET_LANG_NAME} (${TARGET_LANG})`);
    console.log(`🪣  Bucket          : ${BUCKET_NAME}`);
    console.log(`⚡ Concurrencia    : ${ACTIVE_KEYS_COUNT * 2} slots`);
    console.log(`📊 Cap. teórica    : ~${ACTIVE_KEYS_COUNT * 14} RPM | ${ACTIVE_KEYS_COUNT * 500} RPD`);
    if (TARGET_COMMENTARY) console.log(`🎯 Comentario      : solo "${TARGET_COMMENTARY}"`);
    console.log();

    // 1️⃣  Listar todos los ficheros del bucket
    const allFiles = await listAllFiles();

    // 2️⃣  Ficheros EN disponibles
    let sourceFiles = allFiles.filter(f => f.lang === SOURCE_LANG);

    // Filtrar por comentario concreto si se especificó
    if (TARGET_COMMENTARY) {
      sourceFiles = sourceFiles.filter(f =>
        f.abbr.toLowerCase() === TARGET_COMMENTARY.toLowerCase()
      );
    }

    if (sourceFiles.length === 0) {
      return console.log(`⚠️  No se encontraron ficheros '${SOURCE_LANG}' en el bucket.`);
    }

    console.log(`\n📖 Comentarios EN disponibles: ${sourceFiles.length}`);
    sourceFiles.forEach(f => console.log(`   • ${f.filename}`));

    // 3️⃣  Cuáles ya están traducidos al idioma TARGET
    const existingTarget = new Set(
      allFiles.filter(f => f.lang === TARGET_LANG).map(f => f.abbr)
    );

    if (existingTarget.size > 0) {
      console.log(`\n✅ Ya traducidos a '${TARGET_LANG}': ${existingTarget.size}`);
      existingTarget.forEach(a => console.log(`   • ${buildFilename(a, TARGET_LANG)}`));
    }

    // 4️⃣  Pendientes
    const pending = sourceFiles.filter(f => !existingTarget.has(f.abbr));
    console.log(`\n📥 Pendientes de traducir: ${pending.length}\n`);

    if (pending.length === 0) {
      return console.log("✅ Todo está traducido. Nada que hacer.");
    }

    const pool = new WorkerPool(GEMINI_KEYS);
    let globalTranslated = 0;
    let globalFailed     = 0;

    // 5️⃣  Procesar cada fichero pendiente
    for (const { filename, abbr } of pending) {
      if (abortProcess || pool.allExhausted) {
        console.log("\n⚠️  Cuotas agotadas. Ejecuta de nuevo mañana.");
        break;
      }

      console.log(`\n${"━".repeat(50)}`);
      console.log(`📖 Descargando: ${filename}`);

      const sourceData = await downloadJson(filename);
      if (!sourceData) {
        console.error(`   ❌ No se pudo descargar. Saltando.`);
        continue;
      }

      // Garantizar que es un array (tu estructura es array directo)
      const sourceEntries = Array.isArray(sourceData) ? sourceData : Object.values(sourceData);
      console.log(`   📊 Entradas totales : ${sourceEntries.length}`);

      const batches = createOptimizedBatches(sourceEntries);
      console.log(`   📦 Batches          : ${batches.length}`);
      console.log(`   📝 Avg chars/entrada: ${
        Math.round(sourceEntries.reduce((a, e) => a + (e.content?.length || 0), 0) / sourceEntries.length)
      }`);
      console.log();

      const startFile = Date.now();
      const { finalArray, totalSource, translated, failed } =
        await translateCommentaryFile(abbr, sourceEntries, pool);

      const elapsed = ((Date.now() - startFile) / 1000).toFixed(1);
      console.log(
        `\n\n   📈 Resultado: ${translated}/${totalSource} traducidas | ` +
        `⚠️  ${failed} fallidas | ⏱ ${elapsed}s`
      );

      globalTranslated += translated;
      globalFailed     += failed;

      if (finalArray.length === 0) {
        console.error(`   ❌ Sin resultados. No se sube el fichero.`);
        continue;
      }

      // 6️⃣  Subir JSON traducido
      const targetFilename = buildFilename(abbr, TARGET_LANG);
      process.stdout.write(`   🚀 Subiendo ${targetFilename}...`);
      const ok = await uploadJson(targetFilename, finalArray);
      console.log(ok ? " ✅ OK" : " ❌ FALLO");

      if (ok) {
        console.log(`   🌐 URL: ${process.env.STORAGE_BASE_URL || ""}${targetFilename}`);
      }

      // Stats por modelo
      const s = pool.totalStats;
      console.log(
        `\n   📊 Stats modelos: ` +
        MODELS.map(m => `${m.name.split("-").slice(-2).join("-")}:${s[m.name]}`).join(" | ")
      );
    }

    // ── Resumen final ─────────────────────────────────────────────
    console.log(`\n${"═".repeat(50)}`);
    console.log(`🏁 PROCESO COMPLETADO`);
    console.log(`   ✅ Total traducidas : ${globalTranslated}`);
    console.log(`   ❌ Total fallidas   : ${globalFailed}`);

    if (abortProcess || pool.allExhausted) {
      console.log(`\n⚠️  Cuotas de API agotadas. Ejecuta de nuevo mañana.`);
      process.exit(0);
    }

  } catch (error) {
    console.error("\n❌ Error fatal:", error);
    process.exit(1);
  }
}

main();
