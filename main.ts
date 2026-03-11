// 1. Importación directa usando npm: (Esto no falla con error 500)
import { PrismaClient } from "npm:@prisma/client@6.2.1/edge";
import { withAccelerate } from "https://esm.sh/@prisma/extension-accelerate@3.0.0";

// 2. Inicialización
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: Deno.env.get("DATABASE_URL"),
    },
  },
}).$extends(withAccelerate());

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
      const versions = await prisma.bibleVersion.findMany({
        orderBy: { id: "asc" },
        cacheStrategy: { ttl: 86400 }, 
      });
      return new Response(JSON.stringify(versions), { headers: corsHeaders });
    }

    // 2. RUTA: Libros por versión
    if (path === "/api/books") {
      const version = url.searchParams.get("version") || "RV60";
      const books = await prisma.book.findMany({
        where: { version: { name: version } },
        orderBy: { bookOrder: "asc" },
        cacheStrategy: { ttl: 86400 },
      });
      return new Response(JSON.stringify(books), { headers: corsHeaders });
    }

    // 3. RUTA: Capítulos
    if (path === "/api/chapters") {
      const bookId = Number(url.searchParams.get("bookId"));
      const chapters = await prisma.chapter.findMany({
        where: { bookId: bookId },
        orderBy: { number: "asc" },
        cacheStrategy: { ttl: 604800 }, // 1 semana
      });
      return new Response(JSON.stringify(chapters), { headers: corsHeaders });
    }

    // 4. RUTA: Versículos
    if (path === "/api/verses") {
      const chId = Number(url.searchParams.get("chapterId"));
      const vNum = url.searchParams.get("verse");
      
      const verses = await prisma.verse.findMany({
        where: {
          chapterId: chId,
          ...(vNum ? { number: Number(vNum) } : {}),
        },
        orderBy: { number: "asc" },
        cacheStrategy: { ttl: 604800 },
      });
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
        cacheStrategy: { ttl: 604800 }
      });

      // Mapeo para mantener el mismo formato JSON que tenías antes
      const formatted = results.map(v => ({
        text: v.text,
        version: v.chapter.book.version.name
      }));

      return new Response(JSON.stringify(formatted), { headers: corsHeaders });
    }

    return new Response(JSON.stringify({ error: "404" }), { status: 404, headers: corsHeaders });

  } catch (error) {
    console.error("Error en petición:", error.message);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
  }
});
