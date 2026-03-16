import { GoogleGenAI } from "@google/genai";

// ═══════════════════════════════════════════════════════════════════
// CONFIGURACIÓN
// ═══════════════════════════════════════════════════════════════════
const GEMINI_KEYS = (Deno.env.get("GEMINI_API_KEYS") || "")
  .split(",")
  .map((k) => k.trim())
  .filter(Boolean);

const MODELS = [
  { name: 'gemini-3.1-flash-lite-preview', rpm: 15, rpd: 500 },
  { name: 'gemini-2.5-flash-lite', rpm: 10, rpd: 20 },
  { name: 'gemini-2.5-flash', rpm: 5, rpd: 20 }
];

const LANGUAGE_NAMES: Record<string, string> = {
  es: "Spanish",
  ca: "Catalan",
  pt: "Portuguese",
  fr: "French",
  de: "German",
  it: "Italian",
};

// ═══════════════════════════════════════════════════════════════════
// RATE LIMITER SIMPLIFICADO (Singleton para on-the-fly)
// ═══════════════════════════════════════════════════════════════════
class SimpleRateLimiter {
  private requestTimestamps: Map<string, number[]> = new Map();
  private currentKeyIdx = 0;
  private currentModelIdx = 0;

  getNextKeyAndModel(): { key: string; model: string } | null {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;

    // Intentar cada combinación key/model
    for (let m = 0; m < MODELS.length; m++) {
      const modelIdx = (this.currentModelIdx + m) % MODELS.length;
      const model = MODELS[modelIdx];

      for (let k = 0; k < GEMINI_KEYS.length; k++) {
        const keyIdx = (this.currentKeyIdx + k) % GEMINI_KEYS.length;
        const key = GEMINI_KEYS[keyIdx];
        const cacheKey = `${keyIdx}-${model.name}`;

        // Limpiar timestamps viejos
        const timestamps = (this.requestTimestamps.get(cacheKey) || []).filter(
          (ts) => ts > oneMinuteAgo
        );
        this.requestTimestamps.set(cacheKey, timestamps);

        if (timestamps.length < model.rpm - 1) {
          // Reservar
          timestamps.push(now);
          this.requestTimestamps.set(cacheKey, timestamps);
          this.currentKeyIdx = (keyIdx + 1) % GEMINI_KEYS.length;
          this.currentModelIdx = modelIdx;

          return { key, model: model.name };
        }
      }
    }

    return null; // Todas las keys agotadas
  }

  recordFailure(key: string, model: string) {
    const keyIdx = GEMINI_KEYS.indexOf(key);
    const cacheKey = `${keyIdx}-${model}`;
    // Llenar timestamps para bloquear temporalmente
    const fakeTimestamps = Array(20).fill(Date.now());
    this.requestTimestamps.set(cacheKey, fakeTimestamps);
  }
}

const rateLimiter = new SimpleRateLimiter();

// ═══════════════════════════════════════════════════════════════════
// GOOGLE TRANSLATE FALLBACK
// ═══════════════════════════════════════════════════════════════════
async function translateWithGoogleTranslate(
  text: string,
  targetLang: string
): Promise<string> {
  if (!text || text.trim() === "") return text;

  const textToTranslate = text.substring(0, 4500);

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${targetLang}&dt=t&q=${encodeURIComponent(textToTranslate)}`;

      const response = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0" },
      });

      if (response.status === 429) {
        if (attempt < 3) {
          await new Promise((r) => setTimeout(r, 5000 * attempt));
          continue;
        }
        throw new Error("Rate limited");
      }

      const data = await response.json();
      return data[0].map((item: any) => item[0]).filter(Boolean).join("");
    } catch (error) {
      if (attempt === 3) return text; // Devolver original
    }
  }
  return text;
}

// ═══════════════════════════════════════════════════════════════════
// TRADUCTOR PRINCIPAL CON GEMINI
// ═══════════════════════════════════════════════════════════════════
async function translateWithGemini(
  entry: { title?: string; content?: string; contentHtml?: string },
  targetLang: string
): Promise<{ title: string; content: string; contentHtml: string } | null> {
  const keyInfo = rateLimiter.getNextKeyAndModel();

  if (!keyInfo) {
    return null; // No hay keys disponibles
  }

  const languageName = LANGUAGE_NAMES[targetLang] || targetLang;

  const systemPrompt = `Translate this JSON from English to ${languageName}. 
Translate "title", "content", "contentHtml". 
Preserve all HTML tags exactly as they are.
Return only valid JSON object with the same structure.`;

  const payload = {
    title: entry.title || "",
    content: entry.content || "",
    contentHtml: entry.contentHtml || "",
  };

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

    let responseText = response.text
      .replace(/^```(?:json)?\n?/i, "")
      .replace(/\n?```$/i, "")
      .trim();

    return JSON.parse(responseText);
  } catch (error: any) {
    const isRateLimit =
      error.status === 429 ||
      error.message?.includes("429") ||
      error.message?.includes("EXHAUSTED");

    if (isRateLimit) {
      rateLimiter.recordFailure(keyInfo.key, keyInfo.model);
    }

    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════
// FUNCIÓN PRINCIPAL EXPORTADA
// ═══════════════════════════════════════════════════════════════════
export interface CommentaryEntry {
  id?: number;
  sourceId: string;
  language: string;
  bookAbbr: string;
  bookOrder: number;
  chapter: number;
  verseStart: number;
  verseEnd: number | null;
  title: string | null;
  content: string;
  contentHtml: string | null;
  divId: string;
  sectionType: string | null;
  volume: string | null;
}

export interface TranslationResult {
  success: boolean;
  entry: CommentaryEntry | null;
  method: "gemini" | "google" | "failed";
  error?: string;
}

export async function translateCommentaryOnTheFly(
  originalEntry: CommentaryEntry,
  targetLang: string
): Promise<TranslationResult> {
  // 1. Intentar con Gemini
  const geminiResult = await translateWithGemini(
    {
      title: originalEntry.title || undefined,
      content: originalEntry.content,
      contentHtml: originalEntry.contentHtml || undefined,
    },
    targetLang
  );

  if (geminiResult) {
    return {
      success: true,
      method: "gemini",
      entry: {
        ...originalEntry,
        id: undefined, // Nuevo registro
        language: targetLang,
        title: geminiResult.title || null,
        content: geminiResult.content || originalEntry.content,
        contentHtml: geminiResult.contentHtml || null,
      },
    };
  }

  // 2. Fallback a Google Translate
  try {
    const [title, content, contentHtml] = await Promise.all([
      originalEntry.title
        ? translateWithGoogleTranslate(originalEntry.title, targetLang)
        : Promise.resolve(null),
      translateWithGoogleTranslate(originalEntry.content, targetLang),
      originalEntry.contentHtml
        ? translateWithGoogleTranslate(originalEntry.contentHtml, targetLang)
        : Promise.resolve(null),
    ]);

    return {
      success: true,
      method: "google",
      entry: {
        ...originalEntry,
        id: undefined,
        language: targetLang,
        title,
        content,
        contentHtml,
      },
    };
  } catch (error: any) {
    return {
      success: false,
      method: "failed",
      entry: null,
      error: error.message,
    };
  }
}
