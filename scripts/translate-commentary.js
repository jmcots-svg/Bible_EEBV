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
  { name: 'gemini-1.5-flash', rpm: 15 },
  { name: 'gemini-1.5-flash-8b', rpm: 15 } // Usamos ambos modelos gratuitos para duplicar la velocidad
];

// ═══════════════════════════════════════════════════════════════════
// SMART RATE LIMITER (Matemáticamente exacto)
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
          history: [], 
          exhaustedUntil: 0 
        });
      });
    });
  }

  getBestSlot() {
    const now = Date.now();
    let minWaitMs = Infinity;

    for (const slot of this.slots) {
      // Limpiar historial de peticiones de hace más de 60 segundos
      slot.history = slot.history.filter(ts => now - ts < 60000);

      // Si la clave/modelo está bloqueada por un error 429
      if (slot.exhaustedUntil > now) {
        const wait = slot.exhaustedUntil - now;
        if (wait < minWaitMs) minWaitMs = wait;
        continue;
      }

      // Si hay capacidad en este minuto
      if (slot.history.length < slot.rpm) {
        slot.history.push(now);
        return { available: true, key: slot.key, model: slot.model, waitMs: 0 };
      } else {
        // Calcular cuánto falta exactamente para que la petición más antigua cumpla 60s
        const wait = 60000 - (now - slot.history[0]);
        if (wait < minWaitMs) minWaitMs = wait;
      }
    }

    // Si todo está lleno, devolvemos el tiempo de espera exacto hasta el próximo hueco
    return { available: false, waitMs: minWaitMs === Infinity ? 5000 : minWaitMs };
  }

  markExhausted(key, model) {
    const slot = this.slots.find(s => s.key === key && s.model === model);
    if (slot) slot.exhaustedUntil = Date.now() + 61000; // Bloqueo de seguridad de 61 segundos
  }
}

const rateLimiter = new SmartRateLimiter(GEMINI_KEYS, MODELS);

const stats = { 'gemini-1.5-flash': 0, 'gemini-1.5-flash-8b': 0 };

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
  while (attempts < 5) { 
    const slot = rateLimiter.getBestSlot();
    
    if (!slot.available) {
      // Espera quirúrgica: solo duerme el tiempo exacto necesario
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

      // Limpieza robusta por si Gemini añade formato Markdown
      let responseText = response.text || "";
      responseText = responseText.replace(/^
http://googleusercontent.com/immersive_entry_chip/0

Con estos cambios, el script exprime al máximo cada clave sin colisionar con Google y mantiene la base de datos limpia de errores de inserción concurrente.

¿Quieres que hagamos alguna prueba con un idioma en concreto o te preparo las instrucciones para desplegarlo?
