// translate-commentaries-storage.js
const { createClient } = require("@supabase/supabase-js");
const { GoogleGenAI }  = require("@google/genai");
const pLimit           = require("p-limit");
const fs               = require("fs");
const path             = require("path");
const { execSync }     = require("child_process");
require("dotenv").config();

// ═══════════════════════════════════════════════════════════════════
// CONFIGURACIÓN
// ═══════════════════════════════════════════════════════════════════
const SUPABASE_URL         = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const TARGET_LANG          = process.env.TARGET_LANG || "ca";
const SOURCE_LANG          = "en";
const BUCKET_NAME          = "Commentaries";
const TARGET_COMMENTARY    = process.env.TARGET_COMMENTARY || "";
const CHECKPOINT_EVERY     = 50;

// data/commentaries/{lang}/
const DATA_DIR = path.join(process.cwd(), "data", "commentaries", TARGET_LANG);

const ALL_GEMINI_KEYS = (process.env.GEMINI_API_KEYS || "")
  .split(",").map(k => k.trim()).filter(Boolean);

const ACTIVE_KEYS_COUNT = 7;
const GEMINI_KEYS       = ALL_GEMINI_KEYS.slice(0, ACTIVE_KEYS_COUNT);

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || GEMINI_KEYS.length === 0) {
  console.error("❌ Error: Faltan variables de entorno");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const sleep    = ms => new Promise(r => setTimeout(r, ms));

const MODELS = [
  { name: "gemini-3.1-flash-lite-preview", rpm: 14, rpd: 500, priority: 1 },
  { name: "gemini-2.5-flash-lite",               rpm:  9, rpd:  20, priority: 2 },
  { name: "gemini-2.5-flash",                    rpm:  4, rpd:  20, priority: 3 },
];

const TARGET_LANG_NAME =
  TARGET_LANG === "es" ? "Spanish"    :
  TARGET_LANG === "ca" ? "Catalan"    :
  TARGET_LANG === "fr" ? "French"     :
  TARGET_LANG === "de" ? "German"     :
  TARGET_LANG === "pt" ? "Portuguese" :
  TARGET_LANG === "it" ? "Italian"    :
  TARGET_LANG;

let abortProcess = false;

// ═══════════════════════════════════════════════════════════════════
// NOMBRES DE FICHERO
//
//  GitHub (en curso) : {abbr}_tmp_{lang}.json
//  Supabase (usable) : {abbr}_{lang}.json
// ═══════════════════════════════════════════════════════════════════
const buildFinalName  = (abbr, lang) => `${abbr}_${lang}.json`;
const buildTmpName    = (abbr, lang) => `${abbr}_tmp_${lang}.json`;
const localTmpPath    = (abbr, lang) => path.join(DATA_DIR, buildTmpName(abbr, lang));
const localFinalPath  = (abbr, lang) => path.join(DATA_DIR, buildFinalName(abbr, lang));

// ═══════════════════════════════════════════════════════════════════
// HELPERS LOCALES (GitHub / disco)
// ═══════════════════════════════════════════════════════════════════
function ensureDataDir() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function localFileExists(filePath) {
  return fs.existsSync(filePath);
}

function readLocalJson(filePath) {
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (e) {
    console.error(`⚠️  JSON local inválido (${filePath}): ${e.message}`);
    return null;
  }
}

function writeLocalJson(filePath, payload) {
  ensureDataDir();
  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), "utf8");
}

function deleteLocalFile(filePath) {
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
}

// ═══════════════════════════════════════════════════════════════════
// GIT HELPERS
// ═══════════════════════════════════════════════════════════════════
function gitSetup() {
  execSync('git config user.email "github-actions[bot]@users.noreply.github.com"');
  execSync('git config user.name "github-actions[bot]"');
}

function gitExec(cmd) {
  try {
    return execSync(cmd, { stdio: "pipe" }).toString().trim();
  } catch (e) {
    console.error(`\n⚠️  Git error [${cmd}]: ${e.message}`);
    return null;
  }
}

/**
 * Añade, commitea y pushea los paths indicados.
 * Acepta tanto añadir como eliminar ficheros del índice.
 */
function gitCommitAndPush(message, ...filePaths) {
  for (const fp of filePaths) {
    // "git add" funciona tanto para añadir como para stagear borrados
    gitExec(`git add "${path.relative(process.cwd(), fp)}"`);
  }

  const diff = gitExec("git diff --cached --stat");
  if (!diff) {
    // Nada que commitear
    return false;
  }

  gitExec(`git commit -m "${message}"`);
  gitExec("git push");
  return true;
}

// ═══════════════════════════════════════════════════════════════════
// SUPABASE STORAGE HELPERS
// ═══════════════════════════════════════════════════════════════════
async function listStorageFiles() {
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
      if (f.name.toLowerCase().endsWith(".json")) all.push(f.name);
    }

    if ((data?.length ?? 0) < LIMIT) hasMore = false;
    else offset += LIMIT;

    process.stdout.write(`\r📂 Listando bucket: ${all.length} ficheros...`);
  }

  console.log(`\n📂 Total en bucket: ${all.length}`);
  return new Set(all);
}

async function downloadFromStorage(filename) {
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .download(filename);

  if (error) {
    if (error.message?.includes("404") || error.message?.toLowerCase().includes("not found")) {
      return null; // No existe → normal
    }
    console.error(`\n⚠️  Error al descargar ${filename}: ${error.message}`);
    return null;
  }

  try {
    return JSON.parse(await data.text());
  } catch (e) {
    console.error(`\n⚠️  JSON inválido en ${filename}: ${e.message}`);
    return null;
  }
}

async function uploadToStorage(filename, payload) {
  const blob = new Blob(
    [JSON.stringify(payload, null, 2)],
    { type: "application/json" }
  );
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
// CHECKPOINT
// Escribe tmp en GitHub + sube versión usable a Supabase
// ═══════════════════════════════════════════════════════════════════
async function saveCheckpoint(abbr, sourceEntries, translatedMap, isGitEnabled) {
  // Reconstruir en orden original (solo las ya traducidas)
  const partial = sourceEntries
    .filter(e => translatedMap.has(e.divId))
    .map(e => translatedMap.get(e.divId));

  const tmpPath = localTmpPath(abbr, TARGET_LANG);

  // 1. Escribir tmp local
  writeLocalJson(tmpPath, partial);

  // 2. Commit + push del tmp a GitHub
  if (isGitEnabled) {
    gitCommitAndPush(
      `chore: [${abbr}→${TARGET_LANG}] checkpoint ${partial.length}/${sourceEntries.length}`,
      tmpPath
    );
  }

  // 3. Subir a Supabase con nombre FINAL (usable por la app aunque sea parcial)
  const finalName = buildFinalName(abbr, TARGET_LANG);
  await uploadToStorage(finalName, partial);

  process.stdout.write(
    `\r   💾 Checkpoint ${partial.length}/${sourceEntries.length} → GitHub(tmp) + Supabase(final)   `
  );
}

// ═══════════════════════════════════════════════════════════════════
// KEY WORKER
// ═══════════════════════════════════════════════════════════════════
class KeyWorker {
  constructor(keyIndex, apiKey) {
    this.keyIndex = keyIndex;
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

  _refreshDay(s) {
    if (Date.now() - s.dayStart > 86_400_000) {
      s.requestsToday = 0; s.dayStart = Date.now();
      s.consecutive429s = 0; s.exhaustedUntil = 0;
    }
  }

  getBestModel() {
    const now = Date.now();
    let bestWait = Infinity;
    const sorted = [...MODELS].sort((a, b) =>
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

  markExhausted(modelName, isDaily) {
    const s = this.modelState[modelName];
    if (!s) return;
    s.consecutive429s++;
    if (isDaily || s.consecutive429s >= 3) {
      s.requestsToday = s.rpd; s.exhaustedUntil = Date.now() + 86_400_000;
    } else {
      s.exhaustedUntil = Date.now() + s.consecutive429s * 60_000;
    }
  }

  markSuccess(modelName) {
    const s = this.modelState[modelName];
    if (s) s.consecutive429s = 0;
  }

  async translateBatch(batch, maxAttempts = 6) {
    const payload = batch.map(e => ({
      _idx:    e._idx,
      title:   e.title   ?? null,
      content: e.content ?? "",
    }));

    const systemPrompt =
      `You are a biblical commentary translator. ` +
      `Translate the following JSON array from English to ${TARGET_LANG_NAME}. ` +
      `Rules:\n` +
      `- Keep "_idx" unchanged (internal identifier).\n` +
      `- Translate "title" (keep null if null).\n` +
      `- Translate "content" preserving paragraph structure, verse references ` +
      `  (e.g. "Gen 1,1", "Mt 5,3") and proper nouns.\n` +
      `- Do NOT translate people names, places or book abbreviations.\n` +
      `- Return ONLY a valid JSON array, no markdown, no explanation.`;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      if (abortProcess) return null;
      const { model, waitMs } = this.getBestModel();
      if (model === null) return null;
      if (waitMs > 0) { await sleep(waitMs + 100); continue; }

      try {
        const res = await this.ai.models.generateContent({
          model,
          contents: JSON.stringify(payload),
          config: { systemInstruction: systemPrompt, temperature: 0.1, responseMimeType: "application/json" },
        });

        const text = (res.text || "")
          .replace(/^\x60{3}(?:json)?\n?/i, "").replace(/\n?\x60{3}$/i, "").trim();
        const result = JSON.parse(text);

        if (!Array.isArray(result) || result.some(r => r._idx === undefined)) {
          throw new Error("Formato de respuesta inesperado");
        }

        this.markSuccess(model);
        this.stats[model] += batch.length;
        return result;

      } catch (err) {
        const msg   = (err.message || "").toLowerCase();
        const is429 = err.status === 429 || msg.includes("429") || msg.includes("exhausted");
        if (is429) {
          this.markExhausted(model, msg.includes("quota") || msg.includes("daily"));
        } else {
          console.error(`\n⚠️  Attempt ${attempt + 1}/${maxAttempts}: ${err.message}`);
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
    const P = MODELS[0].name;
    alive.sort((a, b) => a.modelState[P].requestsToday - b.modelState[P].requestsToday);
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
// ═══════════════════════════════════════════════════════════════════
function createBatches(entries) {
  const MAX_CHARS = 28_000, MAX_ENTRIES = 10;
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
// MÁQUINA DE ESTADOS — decide qué hacer con cada comentario
// ═══════════════════════════════════════════════════════════════════
const STATE = {
  START_FRESH:  "START_FRESH",   // No existe en Supabase → empezar desde cero
  RESUME:       "RESUME",        // Existe en Supabase + tmp en GitHub → reanudar
  SKIP:         "SKIP",          // Existe en Supabase + NO tmp en GitHub → ya completo
};

function resolveState(abbr, storageFiles) {
  const finalName = buildFinalName(abbr, TARGET_LANG);
  const tmpPath   = localTmpPath(abbr, TARGET_LANG);

  const existsInSupabase = storageFiles.has(finalName);
  const tmpExistsInGit   = localFileExists(tmpPath);

  console.log(`   📡 Supabase (${finalName})         : ${existsInSupabase ? "✅ existe" : "❌ no existe"}`);
  console.log(`   📁 GitHub   (${buildTmpName(abbr, TARGET_LANG)}): ${tmpExistsInGit   ? "✅ existe" : "❌ no existe"}`);

  if (!existsInSupabase) return STATE.START_FRESH;
  if (tmpExistsInGit)    return STATE.RESUME;
  return STATE.SKIP;
}

// ═══════════════════════════════════════════════════════════════════
// TRADUCIR UN COMENTARIO
// ═══════════════════════════════════════════════════════════════════
async function translateCommentaryFile(abbr, sourceEntries, pool, state, isGitEnabled) {
  const tmpPath = localTmpPath(abbr, TARGET_LANG);

  // ── Cargar progreso previo desde tmp (si reanudamos) ─────────────
  const translatedMap = new Map();

  if (state === STATE.RESUME) {
    const tmpData = readLocalJson(tmpPath);
    if (tmpData && Array.isArray(tmpData)) {
      for (const e of tmpData) {
        if (e.divId) translatedMap.set(e.divId, e);
      }
      console.log(`   🔄 Reanudando desde tmp: ${translatedMap.size} entradas previas`);
    }
  } else {
    console.log(`   🆕 Empezando desde cero`);
  }

  // ── Filtrar pendientes ────────────────────────────────────────────
  const pending = sourceEntries.filter(e => !translatedMap.has(e.divId));
  const already = sourceEntries.length - pending.length;

  console.log(`   📊 Total     : ${sourceEntries.length}`);
  console.log(`   ✅ Ya hechas : ${already}`);
  console.log(`   ⏳ Pendientes: ${pending.length}`);

  if (pending.length === 0) {
    console.log(`   🎉 ¡Completo! Sin entradas pendientes.`);
    return { totalSource: sourceEntries.length, newlyTranslated: 0, skipped: already, failed: 0 };
  }

  // ── Preparar batches ──────────────────────────────────────────────
  const tagged  = pending.map((e, i) => ({ ...e, _idx: i }));
  const batches = createBatches(tagged);
  console.log(`   📦 Batches   : ${batches.length}\n`);

  const retryQueue   = [];
  let processedCount = 0;
  let failedCount    = 0;
  let sinceLastCkpt  = 0;
  const startTime    = Date.now();

  // ── Procesar un batch ─────────────────────────────────────────────
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
      translatedMap.set(orig.divId, {
        bookAbbr:    orig.bookAbbr,
        bookOrder:   orig.bookOrder,
        chapter:     orig.chapter,
        verseStart:  orig.verseStart,
        verseEnd:    orig.verseEnd,
        title:       item.title ?? null,
        content:     item.content || orig.content,
        divId:       orig.divId,
        sectionType: orig.sectionType,
        volume:      orig.volume,
      });
    }

    processedCount += translated.length;
    sinceLastCkpt  += translated.length;

    // Checkpoint periódico
    if (sinceLastCkpt >= CHECKPOINT_EVERY) {
      sinceLastCkpt = 0;
      await saveCheckpoint(abbr, sourceEntries, translatedMap, isGitEnabled);
    }

    // Progreso
    const elapsed = (Date.now() - startTime) / 1000;
    const total   = already + processedCount;
    const pct     = ((total / sourceEntries.length) * 100).toFixed(1);
    const s       = pool.totalStats;
    process.stdout.write(
      `\r   ⏳ ${total}/${sourceEntries.length} (${pct}%) | ` +
      `+${processedCount} nuevas | ${elapsed.toFixed(0)}s | Fails:${failedCount} | ` +
      MODELS.map(m => `${m.name.split("-").pop()}:${s[m.name]}`).join(" ") + "   "
    );
  };

  // Primera pasada
  const limit = pLimit(ACTIVE_KEYS_COUNT * 2);
  await Promise.all(batches.map(b => limit(() => processBatch(b))));

  // Reintento
  if (retryQueue.length > 0 && !pool.allExhausted) {
    console.log(`\n   ♻️  Reintentando ${retryQueue.length} batches...`);
    abortProcess = false;
    const retryLimit = pLimit(ACTIVE_KEYS_COUNT);
    await Promise.all(retryQueue.map(b => retryLimit(() => processBatch(b))));
  }

  // Entradas sin traducir
  const stillMissing = sourceEntries.filter(e => !translatedMap.has(e.divId));
  if (stillMissing.length > 0) {
    console.log(`\n   ⚠️  ${stillMissing.length} entradas sin traducir:`);
    stillMissing.slice(0, 5).forEach(e =>
      console.log(`      • ${e.divId}`)
    );
    if (stillMissing.length > 5) console.log(`      ... y ${stillMissing.length - 5} más`);
  }

  return {
    totalSource:       sourceEntries.length,
    newlyTranslated:   processedCount,
    skipped:           already,
    failed:            stillMissing.length,
    translatedMap,     // para el paso final
  };
}

// ═══════════════════════════════════════════════════════════════════
// PASO FINAL — completo o parcial interrumpido
// ═══════════════════════════════════════════════════════════════════
async function finalize(abbr, sourceEntries, translatedMap, isComplete, isGitEnabled) {
  const tmpPath   = localTmpPath(abbr, TARGET_LANG);
  const finalName = buildFinalName(abbr, TARGET_LANG);

  // Reconstruir array en orden original
  const finalArray = sourceEntries
    .filter(e => translatedMap.has(e.divId))
    .map(e => translatedMap.get(e.divId));

  if (isComplete) {
    // ── COMPLETO: subir final a Supabase + borrar tmp de GitHub ────
    process.stdout.write(`\n   🚀 Subiendo versión COMPLETA a Supabase...`);
    const ok = await uploadToStorage(finalName, finalArray);
    console.log(ok ? " ✅" : " ❌");

    if (ok && isGitEnabled) {
      // Borrar el tmp local y commitearlo
      deleteLocalFile(tmpPath);
      gitCommitAndPush(
        `feat: [${abbr}→${TARGET_LANG}] traducción completa (${finalArray.length} entradas) — elimina tmp`,
        tmpPath  // git add de un fichero borrado lo stagea como deleted
      );
      console.log(`   🗑️  tmp eliminado de GitHub`);
    }

    console.log(`   🎉 ¡${abbr} completamente traducido! (${finalArray.length} entradas)`);

  } else {
    // ── PARCIAL: guardar tmp en GitHub + subir parcial a Supabase ──
    writeLocalJson(tmpPath, finalArray);

    if (isGitEnabled) {
      gitCommitAndPush(
        `chore: [${abbr}→${TARGET_LANG}] guardado parcial ${finalArray.length}/${sourceEntries.length}`,
        tmpPath
      );
      console.log(`\n   💾 tmp guardado en GitHub (${finalArray.length}/${sourceEntries.length})`);
    }

    process.stdout.write(`   🚀 Subiendo versión parcial a Supabase (usable)...`);
    const ok = await uploadToStorage(finalName, finalArray);
    console.log(ok ? " ✅" : " ❌");

    console.log(`   💡 Próxima ejecución: detectará el tmp y reanudará desde aquí`);
  }
}

// ═══════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════
async function main() {
  try {
    const isGitEnabled = !!process.env.GITHUB_ACTIONS;

    console.log(`🌐 Idioma destino  : ${TARGET_LANG_NAME} (${TARGET_LANG})`);
    console.log(`🪣  Bucket          : ${BUCKET_NAME}`);
    console.log(`📁 Data dir        : data/commentaries/${TARGET_LANG}/`);
    console.log(`⚡ Concurrencia    : ${ACTIVE_KEYS_COUNT * 2} slots`);
    console.log(`💾 Checkpoint cada : ${CHECKPOINT_EVERY} entradas`);
    console.log(`🔀 Git commits     : ${isGitEnabled ? "✅ activados" : "⚠️  desactivados (ejecución local)"}`);
    if (TARGET_COMMENTARY) console.log(`🎯 Comentario      : "${TARGET_COMMENTARY}"`);
    console.log();

    if (isGitEnabled) gitSetup();
    ensureDataDir();

    // 1️⃣  Listar ficheros EN en Supabase
    const storageFiles = await listStorageFiles();
    const sourceFiles  = [...storageFiles]
      .filter(name => name.endsWith(`_${SOURCE_LANG}.json`))
      .map(name => {
        const base  = name.replace(/\.json$/, "");
        const parts = base.split("_");
        const lang  = parts.pop();
        const abbr  = parts.join("_");
        return { filename: name, abbr, lang };
      })
      .filter(f => !TARGET_COMMENTARY || f.abbr.toLowerCase() === TARGET_COMMENTARY.toLowerCase());

    if (sourceFiles.length === 0) {
      return console.log(`⚠️  No hay ficheros _${SOURCE_LANG}.json en el bucket.`);
    }

    console.log(`\n📖 Comentarios EN encontrados: ${sourceFiles.length}`);
    sourceFiles.forEach(f => console.log(`   • ${f.filename}`));
    console.log();

    const pool = new WorkerPool(GEMINI_KEYS);
    let globalNew = 0, globalSkipped = 0, globalFailed = 0;

    // 2️⃣  Procesar cada fichero
    for (const { filename, abbr } of sourceFiles) {
      console.log(`${"━".repeat(58)}`);
      console.log(`📖 ${filename}  →  ${buildFinalName(abbr, TARGET_LANG)}`);
      console.log();

      // ── Resolver estado ───────────────────────────────────────────
      const state = resolveState(abbr, storageFiles);
      console.log(`   🗺️  Estado: ${state}\n`);

      if (state === STATE.SKIP) {
        console.log(`   ⏭️  Ya está completo y no hay tmp. Saltando.\n`);
        continue;
      }

      if (pool.allExhausted || abortProcess) {
        console.log("   ⚠️  Cuotas agotadas. El progreso guardado se retomará mañana.");
        break;
      }

      // ── Descargar fuente EN ───────────────────────────────────────
      const sourceData = await downloadFromStorage(filename);
      if (!sourceData) {
        console.error(`   ❌ No se pudo descargar ${filename}. Saltando.`);
        continue;
      }
      const sourceEntries = Array.isArray(sourceData) ? sourceData : Object.values(sourceData);

      // Info volúmenes
      const volDist = sourceEntries.reduce((acc, e) => {
        const v = e.volume ?? 1; acc[v] = (acc[v] || 0) + 1; return acc;
      }, {});
      console.log(
        `   📚 Volúmenes: ` +
        Object.entries(volDist).map(([v, n]) => `vol.${v}→${n}`).join(" | ")
      );

      // ── Traducir ──────────────────────────────────────────────────
      const t0 = Date.now();
      const result = await translateCommentaryFile(
        abbr, sourceEntries, pool, state, isGitEnabled
      );
      const elapsed = ((Date.now() - t0) / 1000).toFixed(1);

      console.log(
        `\n\n   📈 +${result.newlyTranslated} nuevas | ` +
        `✅ ${result.skipped} ya existían | ` +
        `❌ ${result.failed} fallidas | ⏱ ${elapsed}s`
      );

      globalNew     += result.newlyTranslated;
      globalSkipped += result.skipped;
      globalFailed  += result.failed;

      // ── Finalizar (completo o parcial) ────────────────────────────
      const isComplete = result.failed === 0 && !abortProcess && !pool.allExhausted;
      await finalize(abbr, sourceEntries, result.translatedMap, isComplete, isGitEnabled);

      // Stats modelos
      const s = pool.totalStats;
      console.log(
        `   📊 Modelos: ` +
        MODELS.map(m => `${m.name.split("-").slice(-2).join("-")}:${s[m.name]}`).join(" | ")
      );
      console.log();
    }

    // ── Resumen final ─────────────────────────────────────────────
    console.log(`${"═".repeat(58)}`);
    console.log(`🏁 FINALIZADO`);
    console.log(`   ✅ Nuevas   : ${globalNew}`);
    console.log(`   ⏭️  Existían : ${globalSkipped}`);
    console.log(`   ❌ Fallidas : ${globalFailed}`);
    if (globalFailed > 0) console.log(`\n💡 Vuelve a ejecutar para reintentar las fallidas.`);
    if (abortProcess || pool.allExhausted) {
      console.log(`\n⚠️  Cuotas agotadas. Progreso guardado en GitHub + Supabase.`);
      console.log(`   La próxima ejecución detectará el tmp y continuará desde aquí.`);
    }

  } catch (err) {
    console.error("\n❌ Error fatal:", err);
    process.exit(1);
  }
}

main();
