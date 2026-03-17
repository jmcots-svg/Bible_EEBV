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