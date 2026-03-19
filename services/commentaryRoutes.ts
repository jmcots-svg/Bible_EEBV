import { Pool } from "npm:@neondatabase/serverless";

// =======================================================
// CONFIGURACIÓN CENTRAL DE STORAGE Y CACHÉ
// =======================================================
// 👇 AHORA TOMA LA URL DE TUS VARIABLES DE ENTORNO
const STORAGE_BASE_URL = Deno.env.get("STORAGE_BASE_URL");

const storageJsonCache: Record<string, { data: any[]; timestamp: number }> = {};
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 horas

// Función maestra para descargar el JSON dinámicamente
async function getCommentaryJson(sourceName: string, language: string) {
  if (!STORAGE_BASE_URL) {
    console.error("[Storage] ERROR: Falta la variable de entorno STORAGE_BASE_URL");
    return null;
  }

  const cacheKey = `${sourceName}-${language}`;
  let jsonData = storageJsonCache[cacheKey]?.data;

  if (!jsonData || Date.now() - storageJsonCache[cacheKey].timestamp > CACHE_TTL) {
    const fileName = `${sourceName.toLowerCase()}_${language}.json`;
    
    // Aseguramos que la URL base termine con "/" antes de concatenar
    const baseUrl = STORAGE_BASE_URL.endsWith('/') ? STORAGE_BASE_URL : `${STORAGE_BASE_URL}/`;
    const url = baseUrl + fileName;
    
    console.log(`[Storage] Descargando JSON: ${fileName}`);
    try {
      const res = await fetch(url);
      if (res.ok) {
        jsonData = await res.json();
        storageJsonCache[cacheKey] = { data: jsonData, timestamp: Date.now() };
      } else {
        console.error(`[Storage] Error HTTP ${res.status} al descargar ${fileName}`);
        return null;
      }
    } catch (err) {
      console.error(`[Storage] Error de red al descargar ${fileName}:`, err);
      return null;
    }
  }
  return jsonData;
}

type MakeHeadersFn = (cacheControl?: string) => Headers;

export async function handleCommentaryRoutes(
  path: string,
  req: Request,
  url: URL,
  pool: Pool,
  makeHeaders: MakeHeadersFn
): Promise<Response | null> {

  // =====================================================
  // 1. RUTA: /api/commentary/sources (LA LISTA)
  // =====================================================
  if (path === "/api/commentary/sources") {
    const bookOrder = Number(url.searchParams.get("bookOrder"));
    const chapter = Number(url.searchParams.get("chapter"));
    const verse = url.searchParams.get("verse");
    const language = url.searchParams.get("language") || "en";

    if (!bookOrder || !chapter) {
      return new Response(JSON.stringify({ error: "Parámetros requeridos: bookOrder, chapter" }), { status: 400, headers: makeHeaders("no-store") });
    }

    const { rows: sources } = await pool.query(
      `SELECT id, name, "fullName", author, description, "availableLangs" 
       FROM "CommentarySource" ORDER BY name ASC`
    );

    const availableSources = [];

    for (const source of sources) {
      if (source.availableLangs && source.availableLangs.includes(language)) {
        
        const jsonData = await getCommentaryJson(source.name, language);
        
        if (jsonData) {
          let filtered = jsonData.filter((c: any) => c.bookOrder === bookOrder && c.chapter === chapter);
          
          if (verse) {
            const vNum = Number(verse);
            filtered = filtered.filter((c: any) => 
              c.verseStart !== null && c.verseStart <= vNum && (c.verseEnd === null || c.verseEnd >= vNum)
            );
          }

          if (filtered.length > 0) {
            availableSources.push({
              id: source.id,
              name: source.name,
              fullName: source.fullName,
              author: source.author,
              description: source.description,
              entry_count: filtered.length,
              english_count: filtered.length,
              translated_count: filtered.length,
              needsTranslation: false
            });
          }
        }
      }
    }

    return new Response(JSON.stringify(availableSources), {
      headers: makeHeaders("public, max-age=3600"),
    });
  }

  // =====================================================
  // 2. RUTA: /api/commentary (EL TEXTO)
  // =====================================================
  if (path === "/api/commentary") {
    const bookOrder = Number(url.searchParams.get("bookOrder"));
    const chapter = Number(url.searchParams.get("chapter"));
    const verse = url.searchParams.get("verse");
    const sourceId = url.searchParams.get("sourceId");
    const language = url.searchParams.get("language") || "en";

    if (!bookOrder || !chapter || !sourceId) {
      return new Response(JSON.stringify({ error: "Parámetros requeridos: bookOrder, chapter, sourceId" }), { status: 400, headers: makeHeaders("no-store") });
    }

    const { rows: sourceCheck } = await pool.query(
      `SELECT name, "fullName", author, "availableLangs" FROM "CommentarySource" WHERE id = \$1`,
      [Number(sourceId)]
    );

    if (sourceCheck.length > 0) {
      const source = sourceCheck[0];

      if (source.availableLangs && source.availableLangs.includes(language)) {
        const jsonData = await getCommentaryJson(source.name, language);

        if (jsonData) {
          let filtered = jsonData.filter((c: any) => c.bookOrder === bookOrder && c.chapter === chapter);

          if (verse) {
            const vNum = Number(verse);
            filtered = filtered.filter((c: any) => 
              c.verseStart !== null && c.verseStart <= vNum && (c.verseEnd === null || c.verseEnd >= vNum)
            );
          }

          const entries = filtered.map((c: any, index: number) => ({
            id: `storage-${source.name}-${language}-${index}`, 
            englishId: null,
            title: c.title,
            content: c.content,
            contentHtml: null,
            verseStart: c.verseStart,
            verseEnd: c.verseEnd,
            sectionType: c.sectionType || null,
            divId: c.divId || null,
            source_name: source.name,
            source_full_name: source.fullName,
            author: source.author,
            needsTranslation: false,
          }));

          return new Response(
            JSON.stringify({ bookOrder, chapter, verse: verse ? Number(verse) : null, language, total: entries.length, entries }),
            { headers: makeHeaders("public, max-age=86400") }
          );
        }
      }
    }

    return new Response(
      JSON.stringify({ bookOrder, chapter, verse: verse ? Number(verse) : null, language, total: 0, entries: [] }),
      { headers: makeHeaders("public, max-age=86400") }
    );
  }

  return null;
}
