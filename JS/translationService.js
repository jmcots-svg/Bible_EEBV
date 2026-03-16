// JS/translationService.js

import { API_URL } from './config.js';

// ═══════════════════════════════════════════════════════════════════
// CONFIGURACIÓN
// ═══════════════════════════════════════════════════════════════════

// Las claves vendrán desde una variable de entorno inyectada por GitHub
// O bien como parámetro desde el backend. Lo más seguro es que el backend
// las inyecte en una variable global al cargar la página.
// Ejemplo: window.GEMINI_KEYS = [...] (desde un script en el HTML)

let currentKeyIdx = 0;
let currentProjectIdx = 0;

// Pool de proyectos (igual lógica que tu seed)
let PROJECTS = [];
let MODELS = [
  { name: 'gemini-3.1-flash-lite-preview', rpm: 15, rpd: 500 },
  { name: 'gemini-2.5-flash-lite', rpm: 10, rpd: 20 },
  { name: 'gemini-2.5-flash', rpm: 5, rpd: 20 }
];

let rateLimiter = null;

// ═══════════════════════════════════════════════════════════════════
// INICIALIZAR EL SERVICIO
// ═══════════════════════════════════════════════════════════════════

export function initTranslationService(geminiKeys) {
  if (!geminiKeys || geminiKeys.length === 0) {
    console.warn("⚠️ No hay claves de Gemini. Usaremos solo Google Translate.");
    rateLimiter = null;
    return;
  }

  // Construir pool de proyectos (igual que en el seed)
  const NUM_PROJECTS = Math.floor(geminiKeys.length / 2) || geminiKeys.length;
  PROJECTS = [];
  for (let i = 0; i < NUM_PROJECTS; i++) {
    const projectKeys = [];
    if (geminiKeys[i]) projectKeys.push(geminiKeys[i]);
    if (geminiKeys[i + NUM_PROJECTS]) projectKeys.push(geminiKeys[i + NUM_PROJECTS]);
    PROJECTS.push({ id: i + 1, keys: projectKeys, currentKeyIdx: 0 });
  }

  rateLimiter = new ProjectAwareRateLimiter(PROJECTS, MODELS);
  console.log(`✅ Translation Service inicializado con ${PROJECTS.length} proyectos`);
}

// ═══════════════════════════════════════════════════════════════════
// RATE LIMITER (Igual que en tu seed, adaptado a JS del navegador)
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
    return { key: null, model: null, projectId: null, available: false };
  }

  recordRateLimit(projectId, modelName) {
    const stats = this.projectStats.get(projectId).get(modelName);
    stats.exhaustedUntil = Date.now() + 65000;
  }
}

// ═══════════════════════════════════════════════════════════════════
// GOOGLE TRANSLATE FALLBACK (Mismo que en tu seed)
// ═══════════════════════════════════════════════════════════════════

async function translateWithGoogleTranslate(text, targetLang = "es", retries = 3) {
  if (!text || text.trim() === "") return text;
  const textToTranslate = text.substring(0, 4500);

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${targetLang}&dt=t&q=${encodeURIComponent(textToTranslate)}`;
      const response = await fetch(url, { 
        timeout: 15000,
        headers: { "User-Agent": "Mozilla/5.0" }
      });
      
      if (!response.ok) throw new Error(`GT error: ${response.status}`);
      
      const data = await response.json();
      return data[0].map(item => item[0]).filter(Boolean).join("");
    } catch (error) {
      const isRateLimit = error.message?.includes('429');
      if (isRateLimit && attempt < retries) {
        const waitTime = 15000 * attempt;
        console.log(`   ⏳ GT Rate limit, esperando ${waitTime / 1000}s...`);
        await sleep(waitTime);
      } else if (attempt === retries) {
        console.warn(`⚠️ GT falló definitivamente:`, error);
        return text;
      }
    }
  }
  return text;
}

async function translateBatchWithGoogleTranslate(entriesBatch, targetLang) {
  const results = [];
  for (const entry of entriesBatch) {
    results.push({
      ...entry,
      language: targetLang,
      title: entry.title ? await translateWithGoogleTranslate(entry.title, targetLang) : null,
      content: entry.content ? await translateWithGoogleTranslate(entry.content, targetLang) : null,
      contentHtml: entry.contentHtml ? await translateWithGoogleTranslate(entry.contentHtml, targetLang) : null
    });
    await sleep(400); // Pequeña pausa entre textos
  }
  return results;
}

// ═══════════════════════════════════════════════════════════════════
// TRADUCTOR CON GEMINI (Híbrido: 3.1 → 2.5L → 2.5 → GT)
// ═══════════════════════════════════════════════════════════════════

async function translateBatchOptimized(entriesBatch, targetLang) {
  // Si no hay claves de Gemini, saltar directamente a GT
  if (!rateLimiter || !PROJECTS || PROJECTS.length === 0) {
    console.log("🌐 Sin claves Gemini, usando Google Translate...");
    return await translateBatchWithGoogleTranslate(entriesBatch, targetLang);
  }

  const payload = entriesBatch.map(entry => ({
    id: entry.id,
    title: entry.title || "",
    content: entry.content || "",
    contentHtml: entry.contentHtml || ""
  }));

  const languageName = targetLang === 'es' ? 'Spanish' : 
                       targetLang === 'ca' ? 'Catalan' : 
                       targetLang === 'fr' ? 'French' :
                       targetLang === 'pt' ? 'Portuguese' : targetLang;
  
  const systemPrompt = `Translate this JSON array from English to ${languageName}. Keep "id" unchanged. Translate "title", "content", "contentHtml". Preserve HTML tags. Return only valid JSON array.`;

  for (let attempt = 1; attempt <= 4; attempt++) {
    let keyInfo = rateLimiter.getBestKeyAndModel();
    
    if (!keyInfo.available || !keyInfo.key) {
      console.log(`Attempt ${attempt}: Sin claves disponibles, usando GT...`);
      return await translateBatchWithGoogleTranslate(entriesBatch, targetLang);
    }

    try {
      console.log(`Intentando con ${keyInfo.model}...`);
      
      // Llamar a Gemini desde el frontend
      const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/' + keyInfo.model + ':generateContent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': keyInfo.key
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: JSON.stringify(payload) }] }],
          systemInstruction: { parts: [{ text: systemPrompt }] },
          generationConfig: {
            temperature: 0.1,
            responseMimeType: "application/json"
          }
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        const isRateLimit = response.status === 429 || errData.error?.code === 429;
        
        if (isRateLimit) {
          rateLimiter.recordRateLimit(keyInfo.projectId, keyInfo.model);
          console.warn(`⚠️ Rate limit en ${keyInfo.model}, reintentando...`);
          await sleep(2000);
          continue;
        }
        throw new Error(`Gemini error: ${response.status}`);
      }

      const data = await response.json();
      const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || "[]";
      
      // Limpiar markdown si viene envuelto
      const cleanJson = responseText.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim();
      const translatedArray = JSON.parse(cleanJson);

      if (!Array.isArray(translatedArray) || translatedArray.length !== entriesBatch.length) {
        throw new Error("Respuesta incompleta o inválida");
      }

      console.log(`✅ Traducción exitosa con ${keyInfo.model}`);
      
      return entriesBatch.map(orig => {
        const t = translatedArray.find(x => x.id === orig.id) || {};
        return {
          ...orig,
          language: targetLang,
          title: t.title || orig.title,
          content: t.content || orig.content,
          contentHtml: t.contentHtml || orig.contentHtml
        };
      });

    } catch (error) {
      console.warn(`❌ Error con ${keyInfo.model}:`, error.message);
      if (attempt === 4) {
        console.log("Todas las claves agotadas, usando GT como fallback final...");
        return await translateBatchWithGoogleTranslate(entriesBatch, targetLang);
      }
      await sleep(1000);
    }
  }

  return await translateBatchWithGoogleTranslate(entriesBatch, targetLang);
}

// ═══════════════════════════════════════════════════════════════════
// FUNCIÓN PRINCIPAL EXPORTADA
// ═══════════════════════════════════════════════════════════════════

export async function translateCommentaryBatch(entries, targetLang) {
  if (!entries || entries.length === 0) return [];
  
  // Batching: máx 8 entradas o 12000 caracteres por batch
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

  // Procesar batches secuencialmente
  const allResults = [];
  for (const batch of batches) {
    const batchResults = await translateBatchOptimized(batch, targetLang);
    allResults.push(...batchResults);
  }

  return allResults;
}

// ═══════════════════════════════════════════════════════════════════
// FUNCIONES AUXILIARES
// ═══════════════════════════════════════════════════════════════════

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
