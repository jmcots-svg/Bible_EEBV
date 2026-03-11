import { PrismaClient } from "npm:@prisma/client/edge";
import { withAccelerate } from "npm:@prisma/extension-accelerate";

const prisma = new PrismaClient().$extends(withAccelerate());

const serverCache: Record<string, { data: any; timestamp: number }> = {};
const CACHE_TTL = 3600000; // 1 hora en milisegundos

function getCached(key: string) {
  const entry = serverCache[key];
  if (entry && Date.now() - entry.timestamp < CACHE_TTL) {
    return entry.data;
  }
  return null;
}

function setCache(key: string, data: any) {
  serverCache[key] = { data, timestamp: Date.now() };
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json",
};

// ... El resto de tu código Deno.serve sigue igual

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const url = new URL(req.url);
  const path = url.pathname;

  // Ruta de salud
  if (path === "/" || path === "/health") {
    return new Response(JSON.stringify({ status: "ok" }), { headers: corsHeaders });
  }

  try {
    // 1. RUTA: Versiones (Caché de 1 día)
if (path === "/api/versions") {
  const cached = getCached("versions");
  if (cached) {
    return new Response(JSON.stringify(cached), { headers: corsHeaders });
  }
  
  const versions = await prisma.bibleVersion.findMany({
    orderBy: { id: "asc" },
    cacheStrategy: { ttl: 86400, swr: 300 },
  });
  setCache("versions", versions);
  return new Response(JSON.stringify(versions), { headers: corsHeaders });
}

    // 2. RUTA: Libros por versión
    if (path === "/api/books") {
      const version = url.searchParams.get("version") || "RV60";
      const cacheKey = `books-${version}`;
      
      const cached = getCached(cacheKey);
      if (cached) {
        return new Response(JSON.stringify(cached), { headers: corsHeaders });
      }

      const books = await prisma.book.findMany({
        where: { version: { name: version } },
        orderBy: { bookOrder: "asc" },
        cacheStrategy: { ttl: 86400, swr: 300 },
      });
      
      setCache(cacheKey, books);
      return new Response(JSON.stringify(books), { headers: corsHeaders });
    }

    // 3. RUTA: Capítulos
    if (path === "/api/chapters") {
      const bookId = Number(url.searchParams.get("bookId"));
      const cacheKey = `chapters-${bookId}`;
      
      const cached = getCached(cacheKey);
      if (cached) {
        return new Response(JSON.stringify(cached), { headers: corsHeaders });
      }

      const chapters = await prisma.chapter.findMany({
        where: { bookId: bookId },
        orderBy: { number: "asc" },
        cacheStrategy: { ttl: 604800, swr: 600 },
      });
      
      setCache(cacheKey, chapters);
      return new Response(JSON.stringify(chapters), { headers: corsHeaders });
    }

    // 4. RUTA: Versículos
    if (path === "/api/verses") {
      const chId = Number(url.searchParams.get("chapterId"));
      const vNum = url.searchParams.get("verse");
      const cacheKey = `verses-${chId}-${vNum || "all"}`;
      
      const cached = getCached(cacheKey);
      if (cached) {
        return new Response(JSON.stringify(cached), { headers: corsHeaders });
      }

      const verses = await prisma.verse.findMany({
        where: {
          chapterId: chId,
          ...(vNum ? { number: Number(vNum) } : {}),
        },
        orderBy: { number: "asc" },
        cacheStrategy: { ttl: 604800, swr: 600 },
      });
      
      setCache(cacheKey, verses);
      return new Response(JSON.stringify(verses), { headers: corsHeaders });
    }

    // 5. RUTA: Comparación (ILIKE traducido a mode: 'insensitive')
    if (path === "/api/compare") {
      const bookName = url.searchParams.get("bookName");
      const chapter = Number(url.searchParams.get("chapter"));
      const verse = Number(url.searchParams.get("verse"));

      if (!bookName || isNaN(chapter) || isNaN(verse)) {
        throw new Error("Faltan datos o formato incorrecto");
      }

      const results = await prisma.verse.findMany({
        where: {
          number: verse,
          chapter: {
            number: chapter,
            book: {
              name: {
                equals: bookName,
                mode: 'insensitive' // Esto equivale al ILIKE de tu SQL
              }
            }
          }
        },
        select: {
          text: true,
          chapter: {
            select: {
              book: {
                select: {
                  version: { select: { name: true } }
                }
              }
            }
          }
        },
        cacheStrategy: { ttl: 86400, swr: 300 }
      });

      // Mapeo para mantener el mismo formato JSON que tenías antes
      const formatted = results.map(v => ({
        text: v.text,
        version: v.chapter.book.version.name
      }));

      return new Response(JSON.stringify(formatted), { headers: corsHeaders });
    }

    // RUTA: Precalentar caché completo
    
    if (path === "/api/warmup") {
      try {
        // 1. Todas las versiones
        await prisma.bibleVersion.findMany({
          orderBy: { id: "asc" },
          cacheStrategy: { ttl: 86400, swr: 300 },
        });

        const versions = await prisma.bibleVersion.findMany({
  orderBy: { id: "asc" },
  cacheStrategy: { ttl: 86400, swr: 300 },
});
setCache("versions", versions);

                // 2. Libros POR versión (como los pide la app)
        const versions = ["RV60", "LBLA"];
for (const v of ["RV60", "LBLA"]) {
  const books = await prisma.book.findMany({
    where: { version: { name: v } },
    orderBy: { bookOrder: "asc" },
    cacheStrategy: { ttl: 86400, swr: 300 },
  });
  setCache(`books-${v}`, books);
}
        
        // 2. TODOS los libros (sin filtrar por versión)
        const allBooks = await prisma.book.findMany({
          orderBy: { bookOrder: "asc" },
          cacheStrategy: { ttl: 86400, swr: 300 },
        });

        // 3. Capítulos de CADA libro
        for (const book of allBooks) {
          const chapters = await prisma.chapter.findMany({
            where: { bookId: book.id },
            orderBy: { number: "asc" },
            cacheStrategy: { ttl: 604800, swr: 600 },
          });
          setCache(`chapters-${book.id}`, chapters);
        }

        return new Response(
          JSON.stringify({ status: "✅ Cache warmed up", books: allBooks.length }),
          { headers: corsHeaders }
        );
      } catch (e) {
        return new Response(
          JSON.stringify({ error: e.message }),
          { status: 500, headers: corsHeaders }
        );
      }
    }
    
    return new Response(JSON.stringify({ error: "404" }), { status: 404, headers: corsHeaders });

  } catch (error) {
    console.error("Error en petición:", error.message);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
  }


  // Cron: Precalentar caché cada 5 minutos
Deno.cron("warmup-cache", "*/5 * * * *", async () => {
  try {
    const res = await fetch("https://bible-eebv.jmcots-svg.deno.net/api/warmup");
    const data = await res.json();
    console.log("🔥 Warmup:", data.status);
  } catch (e) {
    console.error("❌ Warmup failed:", e.message);
  }
});
});
