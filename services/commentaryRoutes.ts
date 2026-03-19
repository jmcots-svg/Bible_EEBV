import { Pool } from "npm:@neondatabase/serverless";

// =======================================================
// CACHÉ EN MEMORIA PARA LOS JSON DEL STORAGE
// =======================================================
const storageJsonCache: Record<string, { data: any[]; timestamp: number }> = {};
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 horas

// Función auxiliar para descargar y cachear los JSON automáticamente
async function getCommentaryJson(sourceName: string, language: string, url: string) {
  const cacheKey = `${sourceName}-${language}`;
  let jsonData = storageJsonCache[cacheKey]?.data;

  if (!jsonData || Date.now() - storageJsonCache[cacheKey].timestamp > CACHE_TTL) {
    console.log(`[Storage] Descargando JSON de ${cacheKey} desde Supabase...`);
    try {
      const res = await fetch(url);
      if (res.ok) {
        jsonData = await res.json();
        storageJsonCache[cacheKey] = { data: jsonData, timestamp: Date.now() };
      } else {
        console.error(`[Storage] Error HTTP ${res.status} al descargar ${url}`);
        return null;
      }
    } catch (err) {
      console.error(`[Storage] Error de red al descargar ${url}:`, err);
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
  // 1. RUTA: /api/commentary/sources (LA LISTA DE AUTORES)
  // =====================================================
  if (path === "/api/commentary/sources") {
    const bookOrder = Number(url.searchParams.get("bookOrder"));
    const chapter = Number(url.searchParams.get("chapter"));
    const verse = url.searchParams.get("verse");
    const language = url.searchParams.get("language") || "en";

    if (!bookOrder || !chapter) {
      return new Response(
        JSON.stringify({ error: "Parámetros requeridos: bookOrder, chapter" }),
        { status: 400, headers: makeHeaders("no-store") }
      );
    }

    // 1. Buscamos TODOS los autores en la base de datos y sus URLs de Storage
    const { rows: sources } = await pool.query(
      `SELECT id, name, "fullName", author, description, "storageUrls" 
       FROM "CommentarySource" ORDER BY name ASC`
    );

    const availableSources = [];

    // 2. Revisamos los JSON en RAM para ver si el autor comentó este capítulo exacto
    for (const source of sources) {
      const extUrl = source.storageUrls?.[language];
      
      if (extUrl) {
        const jsonData = await getCommentaryJson(source.name, language, extUrl);
        
        if (jsonData) {
          // Filtramos el JSON por libro y capítulo
          let filtered = jsonData.filter((c: any) => c.bookOrder === bookOrder && c.chapter === chapter);
          
          if (verse) {
            const vNum = Number(verse);
            filtered = filtered.filter((c: any) => 
              c.verseStart !== null && c.verseStart <= vNum && (c.verseEnd === null || c.verseEnd >= vNum)
            );
          }

          // Si el autor sí escribió sobre este capítulo, lo mostramos en el Frontend
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
              needsTranslation: false // ¡Adiós para siempre al botón de traducir!
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
  // 2. RUTA: /api/commentary (EL TEXTO PARA LEER)
  // =====================================================
  if (path === "/api/commentary") {
    const bookOrder = Number(url.searchParams.get("bookOrder"));
    const chapter = Number(url.searchParams.get("chapter"));
    const verse = url.searchParams.get("verse");
    const sourceId = url.searchParams.get("sourceId");
    const language = url.searchParams.get("language") || "en";

    if (!bookOrder || !chapter || !sourceId) {
      return new Response(
        JSON.stringify({ error: "Parámetros requeridos: bookOrder, chapter, sourceId" }),
        { status: 400, headers: makeHeaders("no-store") }
      );
    }

    // 1. Verificamos la URL en la base de datos
    const { rows: sourceCheck } = await pool.query(
      `SELECT name, "fullName", author, "storageUrls" FROM "CommentarySource" WHERE id = \$1`,
      [Number(sourceId)]
    );

    if (sourceCheck.length > 0) {
      const source = sourceCheck[0];
      const extUrl = source.storageUrls?.[language];

      if (extUrl) {
        // 2. Leemos el JSON de la RAM
        const jsonData = await getCommentaryJson(source.name, language, extUrl);

        if (jsonData) {
          let filtered = jsonData.filter((c: any) => c.bookOrder === bookOrder && c.chapter === chapter);

          if (verse) {
            const vNum = Number(verse);
            filtered = filtered.filter((c: any) => 
              c.verseStart !== null && c.verseStart <= vNum && (c.verseEnd === null || c.verseEnd >= vNum)
            );
          }

          // 3. Formateamos y enviamos al Frontend
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
            JSON.stringify({
              bookOrder, chapter, verse: verse ? Number(verse) : null, language, total: entries.length, entries
            }),
            { headers: makeHeaders("public, max-age=86400") }
          );
        }
      }
    }

    // Si llega hasta aquí, es porque la URL no existe o falló el JSON. Devolvemos vacío.
    return new Response(
      JSON.stringify({
        bookOrder, chapter, verse: verse ? Number(verse) : null, language, total: 0, entries: []
      }),
      { headers: makeHeaders("public, max-age=86400") }
    );
  }

  // La ruta /api/translate-commentary ha sido ELIMINADA.
  return null;
}
