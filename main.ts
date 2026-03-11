import { PrismaClient } from "npm:@prisma/client/edge";
import { withAccelerate } from "npm:@prisma/extension-accelerate";

const prisma = new PrismaClient().$extends(withAccelerate());

// KV (caché compartida entre instancias en Deno Deploy)
const kv = await Deno.openKv();

// --------------------
// Caché RAM (L1)
// --------------------
const serverCache: Record<string, { data: any; timestamp: number }> = {};
const CACHE_TTL = 3600000; // 1 hora en milisegundos

function getCached(key: string) {
  const entry = serverCache[key];
  if (entry && Date.now() - entry.timestamp < CACHE_TTL) return entry.data;
  return null;
}

function setCache(key: string, data: any) {
  serverCache[key] = { data, timestamp: Date.now() };
}

// --------------------
// Caché KV (L2)
// --------------------
async function kvGet<T>(key: Deno.KvKey): Promise<T | null> {
  const res = await kv.get<T>(key);
  return res.value ?? null;
}

async function kvSet<T>(key: Deno.KvKey, value: T, ttlMs: number) {
  await kv.set(key, value, { expireIn: ttlMs });
}

// TTLs KV
const TTL_1D_MS = 24 * 60 * 60 * 1000;
const TTL_7D_MS = 7 * 24 * 60 * 60 * 1000;

// --------------------
// Headers / CORS
// --------------------
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Expose-Headers": "Server-Timing, X-Cache",
  "Timing-Allow-Origin": "*",
  "Content-Type": "application/json",
};

function makeHeaders(cacheControl?: string) {
  const h = new Headers(corsHeaders);
  if (cacheControl) h.set("Cache-Control", cacheControl);
  return h;
}

// --------------------
// Server
// --------------------
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: makeHeaders() });
  }

  const url = new URL(req.url);
  const path = url.pathname;

  // Health
  if (path === "/" || path === "/health") {
    return new Response(JSON.stringify({ status: "ok" }), { headers: makeHeaders("no-store") });
  }

  try {
    // 1) Versions
    if (path === "/api/versions") {
      const cacheControl = "public, max-age=86400, stale-while-revalidate=300";
      const memKey = "versions";
      const kvKey: Deno.KvKey = ["versions"];

      const mem = getCached(memKey);
      if (mem) {
        const headers = makeHeaders(cacheControl);
        headers.set("X-Cache", "HIT(mem)");
        return new Response(JSON.stringify(mem), { headers });
      }

      const kvVal = await kvGet<any[]>(kvKey);
      if (kvVal) {
        setCache(memKey, kvVal);
        const headers = makeHeaders(cacheControl);
        headers.set("X-Cache", "HIT(kv)");
        return new Response(JSON.stringify(kvVal), { headers });
      }

      const versions = await prisma.bibleVersion.findMany({
        orderBy: { id: "asc" },
        cacheStrategy: { ttl: 86400, swr: 300 },
      });

      setCache(memKey, versions);
      await kvSet(kvKey, versions, TTL_1D_MS);

      const headers = makeHeaders(cacheControl);
      headers.set("X-Cache", "MISS");
      return new Response(JSON.stringify(versions), { headers });
    }

    // 2) Books
    if (path === "/api/books") {
      const cacheControl = "public, max-age=86400, stale-while-revalidate=300";

      const version = url.searchParams.get("version") || "RV60";
      const memKey = `books-${version}`;
      const kvKey: Deno.KvKey = ["books", version];

      const mem = getCached(memKey);
      if (mem) {
        const headers = makeHeaders(cacheControl);
        headers.set("X-Cache", "HIT(mem)");
        return new Response(JSON.stringify(mem), { headers });
      }

      const kvVal = await kvGet<any[]>(kvKey);
      if (kvVal) {
        setCache(memKey, kvVal);
        const headers = makeHeaders(cacheControl);
        headers.set("X-Cache", "HIT(kv)");
        return new Response(JSON.stringify(kvVal), { headers });
      }

      const books = await prisma.book.findMany({
        where: { version: { name: version } },
        orderBy: { bookOrder: "asc" },
        select: { id: true, name: true, testament: true, bookOrder: true },
        cacheStrategy: { ttl: 86400, swr: 300 },
      });

      setCache(memKey, books);
      await kvSet(kvKey, books, TTL_1D_MS);

      const headers = makeHeaders(cacheControl);
      headers.set("X-Cache", "MISS");
      return new Response(JSON.stringify(books), { headers });
    }

    // 3) Chapters (con Server-Timing)
    if (path === "/api/chapters") {
      const noMem = url.searchParams.get("nomem") === "1";
      const t0 = performance.now();
      const cacheControl = "public, max-age=604800, stale-while-revalidate=600";

      const bookIdParam = url.searchParams.get("bookId");
      const bookId = Number(bookIdParam);
      const debug = url.searchParams.get("debug") === "1";

      if (!bookIdParam || !Number.isFinite(bookId)) {
        return new Response(JSON.stringify({ error: "Parámetro bookId inválido" }), {
          status: 400,
          headers: makeHeaders("no-store"),
        });
      }

      const memKey = `chapters-${bookId}`;
      const kvKey: Deno.KvKey = ["chapters", bookId];

      if (!debug) {
        const mem = getCached(memKey);
        if (mem) {
          const headers = makeHeaders(cacheControl);
          headers.set("X-Cache", "HIT(mem)");
          headers.set("Server-Timing", `total;dur=${(performance.now() - t0).toFixed(1)}`);
          return new Response(JSON.stringify(mem), { headers });
        }

        const kvVal = await kvGet<any[]>(kvKey);
        if (kvVal) {
          setCache(memKey, kvVal);
          const headers = makeHeaders(cacheControl);
          headers.set("X-Cache", "HIT(kv)");
          headers.set("Server-Timing", `total;dur=${(performance.now() - t0).toFixed(1)}`);
          return new Response(JSON.stringify(kvVal), { headers });
        }
      }

      const tDb0 = performance.now();
      const chapters = await prisma.chapter.findMany({
        where: { bookId },
        orderBy: { number: "asc" },
        select: { id: true, number: true },
        cacheStrategy: { ttl: 604800, swr: 600 },
      });
      const tDb1 = performance.now();

      if (!debug) {
        setCache(memKey, chapters);
        await kvSet(kvKey, chapters, TTL_7D_MS);
      }

      const headers = makeHeaders(debug ? "no-store" : cacheControl);
      headers.set("X-Cache", debug ? "BYPASS(debug=1)" : "MISS");
      headers.set(
        "Server-Timing",
        `db;dur=${(tDb1 - tDb0).toFixed(1)}, total;dur=${(performance.now() - t0).toFixed(1)}`,
      );
      return new Response(JSON.stringify(chapters), { headers });
    }

    // 4) Verses (con Server-Timing)
    if (path === "/api/verses") {
      const noMem = url.searchParams.get("nomem") === "1";
      const t0 = performance.now();
      const cacheControl = "public, max-age=604800, stale-while-revalidate=600";

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

      const vKey = vNum ? Number(vNum) : "all";
      const memKey = `verses-${chId}-${vKey}`;
      const kvKey: Deno.KvKey = ["verses", chId, vKey];

if (!debug) {
  // 1) MEM (si noMem=1, lo saltamos)
  if (!noMem) {
    const mem = getCached(memKey);
    if (mem) {
      const headers = makeHeaders(cacheControl);
      headers.set("X-Cache", "HIT(mem)");
      headers.set("Server-Timing", `total;dur=${(performance.now() - t0).toFixed(1)}`);
      return new Response(JSON.stringify(mem), { headers });
    }
  }

  // 2) KV
  const kvVal = await kvGet<any[]>(kvKey);
  if (kvVal) {
    setCache(memKey, kvVal); // sube a mem para la próxima
    const headers = makeHeaders(cacheControl);
    headers.set("X-Cache", "HIT(kv)");
    headers.set("Server-Timing", `total;dur=${(performance.now() - t0).toFixed(1)}`);
    return new Response(JSON.stringify(kvVal), { headers });
  }
}

        const kvVal = await kvGet<any[]>(kvKey);
        if (kvVal) {
          setCache(memKey, kvVal);
          const headers = makeHeaders(cacheControl);
          headers.set("X-Cache", "HIT(kv)");
          headers.set("Server-Timing", `total;dur=${(performance.now() - t0).toFixed(1)}`);
          return new Response(JSON.stringify(kvVal), { headers });
        }
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

      if (!debug) {
        setCache(memKey, verses);
        await kvSet(kvKey, verses, TTL_7D_MS);
      }

      const headers = makeHeaders(debug ? "no-store" : cacheControl);
      headers.set("X-Cache", debug ? "BYPASS(debug=1)" : "MISS");
      headers.set(
        "Server-Timing",
        `db;dur=${(tDb1 - tDb0).toFixed(1)}, total;dur=${(performance.now() - t0).toFixed(1)}`,
      );
      return new Response(JSON.stringify(verses), { headers });
    }

    // 5) Compare (lo dejamos como lo tenías, con cacheStrategy)
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

      const headers = makeHeaders("public, max-age=86400, stale-while-revalidate=300");
      return new Response(JSON.stringify(formatted), { headers });
    }

    // Warmup (ligero): versions + books, y lo guarda en RAM y KV
    if (path === "/api/warmup") {
      try {
        // Versions
        const allVersions = await prisma.bibleVersion.findMany({
          orderBy: { id: "asc" },
          cacheStrategy: { ttl: 86400, swr: 300 },
        });
        setCache("versions", allVersions);
        await kvSet(["versions"], allVersions, TTL_1D_MS);

        // Books por versión
        for (const v of ["RV60", "LBLA"]) {
          const books = await prisma.book.findMany({
            where: { version: { name: v } },
            orderBy: { bookOrder: "asc" },
            select: { id: true, name: true, testament: true, bookOrder: true },
            cacheStrategy: { ttl: 86400, swr: 300 },
          });
          setCache(`books-${v}`, books);
          await kvSet(["books", v], books, TTL_1D_MS);
        }

        return new Response(JSON.stringify({ status: "✅ Cache warmed up (versions + books)" }), {
          headers: makeHeaders("no-store"),
        });
      } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), {
          status: 500,
          headers: makeHeaders("no-store"),
        });
      }
    }

    return new Response(JSON.stringify({ error: "404" }), {
      status: 404,
      headers: makeHeaders("no-store"),
    });
  } catch (error) {
    console.error("Error en petición:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: makeHeaders("no-store"),
    });
  }
});

// Cron warmup cada 6 horas
Deno.cron("warmup-cache", "0 */6 * * *", async () => {
  try {
    const res = await fetch("https://bible-eebv.jmcots-svg.deno.net/api/warmup");
    const data = await res.json();
    console.log("🔥 Warmup:", data.status);
  } catch (e) {
    console.error("❌ Warmup failed:", e.message);
  }
});
