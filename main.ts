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
"Access-Control-Allow-Origin": "",
"Access-Control-Allow-Methods": "GET, OPTIONS",
"Access-Control-Allow-Headers": "Content-Type",
"Access-Control-Expose-Headers": "Server-Timing, X-Cache",
"Timing-Allow-Origin": "",
"Content-Type": "application/json",
};

function makeHeaders(cacheControl?: string) {
return {
...corsHeaders,
...(cacheControl ? { "Cache-Control": cacheControl } : {}),
};
}

// (Opcional) helper para responder JSON con headers extra
function jsonResponse(
data: unknown,
cacheControl?: string,
extra?: Record<string, string>,
status = 200,
) {
const headers = makeHeaders(cacheControl);
if (extra) {
for (const [k, v] of Object.entries(extra)) headers[k] = v;
}
return new Response(JSON.stringify(data), { status, headers });
}

Deno.serve(async (req: Request) => {
if (req.method === "OPTIONS") {
return new Response(null, { headers: corsHeaders });
}

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
return new Response(JSON.stringify(cached), {
headers: makeHeaders("public, max-age=86400, stale-while-revalidate=300"),
});
}
  const versions = await prisma.bibleVersion.findMany({
    orderBy: { id: "asc" },
    cacheStrategy: { ttl: 86400, swr: 300 },
  });

  setCache("versions", versions);
  return new Response(JSON.stringify(versions), {
    headers: makeHeaders("public, max-age=86400, stale-while-revalidate=300"),
  });
}

// 2. RUTA: Libros por versión
if (path === "/api/books") {
  const version = url.searchParams.get("version") || "RV60";
  const cacheKey = `books-${version}`;

  const cached = getCached(cacheKey);
  if (cached) {
    return new Response(JSON.stringify(cached), {
      headers: makeHeaders("public, max-age=86400, stale-while-revalidate=300"),
    });
  }

  const books = await prisma.book.findMany({
    where: { version: { name: version } },
    orderBy: { bookOrder: "asc" },
    select: { id: true, name: true, testament: true, bookOrder: true },
    cacheStrategy: { ttl: 86400, swr: 300 },
  });

  setCache(cacheKey, books);
  return new Response(JSON.stringify(books), {
    headers: makeHeaders("public, max-age=86400, stale-while-revalidate=300"),
  });
}

// 3. RUTA: Capítulos

if (path === "/api/chapters") {
const t0 = performance.now();

const bookIdParam = url.searchParams.get("bookId");
const bookId = Number(bookIdParam);

// Evita 500 por parámetro inválido
if (!bookIdParam || !Number.isFinite(bookId)) {
return new Response(JSON.stringify({ error: "Parámetro bookId inválido" }), {
status: 400,
headers: makeHeaders("no-store"),
});
}

const cacheKey = chapters-${bookId};

const cached = getCached(cacheKey);
if (cached) {
const headers = makeHeaders("public, max-age=604800, stale-while-revalidate=600");
headers["X-Cache"] = "HIT(serverCache)";
headers["Server-Timing"] = total;dur=${(performance.now() - t0).toFixed(1)};
return new Response(JSON.stringify(cached), { headers });
}

const tDb0 = performance.now();
const chapters = await prisma.chapter.findMany({
where: { bookId: bookId },
orderBy: { number: "asc" },
select: { id: true, number: true },
cacheStrategy: { ttl: 604800, swr: 600 },
});
const tDb1 = performance.now();

setCache(cacheKey, chapters);

const headers = makeHeaders("public, max-age=604800, stale-while-revalidate=600");
headers["X-Cache"] = "MISS(serverCache)";
headers["Server-Timing"] =
db;dur=${(tDb1 - tDb0).toFixed(1)}, total;dur=${(performance.now() - t0).toFixed(1)};

return new Response(JSON.stringify(chapters), { headers });
}

// 4. RUTA: Versículos
if (path === "/api/verses") {
const t0 = performance.now();

const chIdParam = url.searchParams.get("chapterId");
const chId = Number(chIdParam);
const vNum = url.searchParams.get("verse");
const debug = url.searchParams.get("debug") === "1";

if (!chIdParam || !Number.isFinite(chId)) {
return new Response(JSON.stringify({ error: "Parámetro chapterId inválido" }), {
status: 400,
headers: makeHeaders("no-store"),
});
}

const cacheKey = verses-${chId}-${vNum || "all"};

const cached = getCached(cacheKey);
if (cached && !debug) {
const headers = makeHeaders("public, max-age=604800, stale-while-revalidate=600");
headers["X-Cache"] = "HIT(serverCache)";
headers["Server-Timing"] = total;dur=${(performance.now() - t0).toFixed(1)};
return new Response(JSON.stringify(cached), { headers });
}

const tDb0 = performance.now();
const verses = await prisma.verse.findMany({
where: {
chapterId: chId,
...(vNum ? { number: Number(vNum) } : {}),
},
orderBy: { number: "asc" },
select: { number: true, text: true },
cacheStrategy: debug ? undefined : { ttl: 604800, swr: 600 },
});
const tDb1 = performance.now();

if (!debug) setCache(cacheKey, verses);

const headers = makeHeaders(debug ? "no-store" : "public, max-age=604800, stale-while-revalidate=600");
headers["X-Cache"] = debug ? "BYPASS(debug=1)" : "MISS(serverCache)";
headers["Server-Timing"] =
db;dur=${(tDb1 - tDb0).toFixed(1)}, total;dur=${(performance.now() - t0).toFixed(1)};

return new Response(JSON.stringify(verses), { headers });
}

// 5. RUTA: Comparación
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
            mode: "insensitive",
          },
        },
      },
    },
    select: {
      text: true,
      chapter: {
        select: {
          book: {
            select: {
              version: { select: { name: true } },
            },
          },
        },
      },
    },
    cacheStrategy: { ttl: 86400, swr: 300 },
  });

  const formatted = results.map((v) => ({
    text: v.text,
    version: v.chapter.book.version.name,
  }));

  return new Response(JSON.stringify(formatted), {
    headers: makeHeaders("public, max-age=86400, stale-while-revalidate=300"),
  });
}

// RUTA: Precalentar caché (ligero: SOLO versions + books)
if (path === "/api/warmup") {
  try {
    // 1. Todas las versiones
    const allVersions = await prisma.bibleVersion.findMany({
      orderBy: { id: "asc" },
      cacheStrategy: { ttl: 86400, swr: 300 },
    });
    setCache("versions", allVersions);

    // 2. Libros POR versión
    for (const v of ["RV60", "LBLA"]) {
      const books = await prisma.book.findMany({
        where: { version: { name: v } },
        orderBy: { bookOrder: "asc" },
        select: { id: true, name: true, testament: true, bookOrder: true },
        cacheStrategy: { ttl: 86400, swr: 300 },
      });
      setCache(`books-${v}`, books);
    }

    return new Response(
      JSON.stringify({ status: "✅ Cache warmed up (versions + books)" }),
      { headers: corsHeaders },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: corsHeaders,
    });
  }
}

return new Response(JSON.stringify({ error: "404" }), {
  status: 404,
  headers: corsHeaders,
});

} catch (error) {
console.error("Error en petición:", error.message);
return new Response(JSON.stringify({ error: error.message }), {
status: 500,
headers: corsHeaders,
});
}
});

// Cron: Precalentar caché cada 6 horas (antes era cada 5 minutos)
Deno.cron("warmup-cache", "0 */6 * * *", async () => {
try {
const res = await fetch("https://bible-eebv.jmcots-svg.deno.net/api/warmup");
const data = await res.json();
console.log("🔥 Warmup:", data.status);
} catch (e) {
console.error("❌ Warmup failed:", e.message);
}
});

