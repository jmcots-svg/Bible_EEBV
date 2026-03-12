import { PrismaClient } from "npm:@prisma/client/edge";
const prisma = new PrismaClient();

// KV (Deno Deploy) - requiere deno.json con: "unstable": ["kv"]
const kv = await Deno.openKv();

// --------------------
// Caché RAM (L1)
// --------------------
const serverCache: Record<string, { data: any; timestamp: number }> = {};
const CACHE_TTL = 3600000; // 1h

function getCached(key: string) {
  const entry = serverCache[key];
  if (entry && Date.now() - entry.timestamp < CACHE_TTL) return entry.data;
  return null;
}

function setCache(key: string, data: any) {
  serverCache[key] = { data, timestamp: Date.now() };
}

// --------------------
// Caché KV (L2, compartida)
// --------------------
async function kvGet<T>(key: Deno.KvKey): Promise<T | null> {
  const res = await kv.get<T>(key);
  return res.value ?? null;
}

async function kvSet<T>(key: Deno.KvKey, value: T, ttlMs: number) {
  await kv.set(key, value, { expireIn: ttlMs });
}

const TTL_1D_MS = 24 * 60 * 60 * 1000;
const TTL_7D_MS = 7 * 24 * 60 * 60 * 1000;

// --------------------
// Headers / CORS
// --------------------
const corsHeaders: Record<string, string> = {
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
    return new Response(null, { headers: makeHeaders("no-store") });
  }

  const url = new URL(req.url);
  const path = url.pathname;

  if (path === "/" || path === "/health") {
    return new Response(JSON.stringify({ status: "ok" }), { headers: makeHeaders("no-store") });
  }

  try {
    // --------------------
    // /api/versions
    // --------------------
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
      });

      setCache(memKey, versions);
      await kvSet(kvKey, versions, TTL_1D_MS);

      const headers = makeHeaders(cacheControl);
      headers.set("X-Cache", "MISS");
      return new Response(JSON.stringify(versions), { headers });
    }

    // --------------------
    // /api/books
    // --------------------
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
      });

      setCache(memKey, books);
      await kvSet(kvKey, books, TTL_1D_MS);

      const headers = makeHeaders(cacheControl);
      headers.set("X-Cache", "MISS");
      return new Response(JSON.stringify(books), { headers });
    }

    // --------------------
    // /api/chapters
    // --------------------
    if (path === "/api/chapters") {
      const t0 = performance.now();
      const cacheControl = "public, max-age=604800, stale-while-revalidate=600";

      const bookIdParam = url.searchParams.get("bookId");
      const bookId = Number(bookIdParam);
      const debug = url.searchParams.get("debug") === "1";
      const noMem = url.searchParams.get("nomem") === "1";

      if (!bookIdParam || !Number.isFinite(bookId)) {
        return new Response(JSON.stringify({ error: "Parámetro bookId inválido" }), {
          status: 400,
          headers: makeHeaders("no-store"),
        });
      }

      const memKey = `chapters-${bookId}`;
      const kvKey: Deno.KvKey = ["chapters", bookId];

      if (!debug) {
        // MEM
        if (!noMem) {
          const mem = getCached(memKey);
          if (mem) {
            const headers = makeHeaders(cacheControl);
            headers.set("X-Cache", "HIT(mem)");
            headers.set("Server-Timing", `total;dur=${(performance.now() - t0).toFixed(1)}`);
            return new Response(JSON.stringify(mem), { headers });
          }
        }

        // KV
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

    // --------------------
    // /api/verses
    // --------------------
    if (path === "/api/verses") {
      const t0 = performance.now();
      const cacheControl = "public, max-age=604800, stale-while-revalidate=600";

      const chIdParam = url.searchParams.get("chapterId");
      const chId = Number(chIdParam);
      const vNum = url.searchParams.get("verse");
      const debug = url.searchParams.get("debug") === "1";
      const noMem = url.searchParams.get("nomem") === "1";

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
        // MEM
        if (!noMem) {
          const mem = getCached(memKey);
          if (mem) {
            const headers = makeHeaders(cacheControl);
            headers.set("X-Cache", "HIT(mem)");
            headers.set("Server-Timing", `total;dur=${(performance.now() - t0).toFixed(1)}`);
            return new Response(JSON.stringify(mem), { headers });
          }
        }

        // KV
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

    // --------------------
    // /api/compare
    // --------------------
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
              name: { equals: bookName, mode: "insensitive" },
            },
          },
        },
        select: {
          text: true,
          chapter: {
            select: {
              book: {
                select: { version: { select: { name: true } } },
              },
            },
          },
        },
      });

      const formatted = results.map((v) => ({
        text: v.text,
        version: v.chapter.book.version.name,
      }));

      const headers = makeHeaders("public, max-age=86400, stale-while-revalidate=300");
      return new Response(JSON.stringify(formatted), { headers });
    }

    // --------------------
    // /api/warmup (ligero)
    // --------------------
    if (path === "/api/warmup") {
      try {
        const allVersions = await prisma.bibleVersion.findMany({
          orderBy: { id: "asc" },
        });
        setCache("versions", allVersions);
        await kvSet(["versions"], allVersions, TTL_1D_MS);

        for (const v of ["RV60", "LBLA", "BEC"]) {
          const books = await prisma.book.findMany({
            where: { version: { name: v } },
            orderBy: { bookOrder: "asc" },
            select: { id: true, name: true, testament: true, bookOrder: true },
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

    // --------------------
    // /api/search (Concordancia Bíblica - accent insensitive)
    // --------------------
    if (path === "/api/search") {
      const t0 = performance.now();
      
      const query = url.searchParams.get("query")?.trim();
      const version = url.searchParams.get("version") || "RV60";
      const testament = url.searchParams.get("testament") || "ALL";
      const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
      const limit = Math.min(50, Math.max(1, Number(url.searchParams.get("limit")) || 20));
      const offset = (page - 1) * limit;

      if (!query || query.length < 2) {
        return new Response(
          JSON.stringify({ error: "El término de búsqueda debe tener al menos 2 caracteres" }),
          { status: 400, headers: makeHeaders("no-store") }
        );
      }

      if (query.length > 100) {
        return new Response(
          JSON.stringify({ error: "El término de búsqueda es demasiado largo" }),
          { status: 400, headers: makeHeaders("no-store") }
        );
      }

      // Cache
      const cacheControl = "public, max-age=3600, stale-while-revalidate=300";
      const normalizedQuery = query.toLowerCase();
      const memKey = `search-${version}-${testament}-${normalizedQuery}-p${page}-l${limit}`;
      const kvKey: Deno.KvKey = ["search", version, testament, normalizedQuery, page, limit];

      // MEM cache
      const mem = getCached(memKey);
      if (mem) {
        const headers = makeHeaders(cacheControl);
        headers.set("X-Cache", "HIT(mem)");
        headers.set("Server-Timing", `total;dur=${(performance.now() - t0).toFixed(1)}`);
        return new Response(JSON.stringify(mem), { headers });
      }

      // KV cache
      const kvVal = await kvGet<any>(kvKey);
      if (kvVal) {
        setCache(memKey, kvVal);
        const headers = makeHeaders(cacheControl);
        headers.set("X-Cache", "HIT(kv)");
        headers.set("Server-Timing", `total;dur=${(performance.now() - t0).toFixed(1)}`);
        return new Response(JSON.stringify(kvVal), { headers });
      }

      const tDb0 = performance.now();

      // Build testament filter
      const testamentFilter = testament !== "ALL" 
        ? `AND b."testament" = '${testament}'` 
        : "";

      // Sanitize query for LIKE (escape special chars)
      const sanitizedQuery = normalizedQuery
        .replace(/\\/g, '\\\\')
        .replace(/%/g, '\\%')
        .replace(/_/g, '\\_');

      // COUNT query (accent-insensitive using unaccent)
      const countResult = await prisma.$queryRawUnsafe<[{ count: bigint }]>(`
        SELECT COUNT(*) as count
        FROM "Verse" v
        JOIN "Chapter" c ON v."chapterId" = c.id
        JOIN "Book" b ON c."bookId" = b.id
        JOIN "BibleVersion" bv ON b."versionId" = bv.id
        WHERE bv."name" = \$1
        ${testamentFilter}
        AND unaccent(lower(v."text")) LIKE '%' || unaccent(lower(\$2)) || '%'
      `, version, sanitizedQuery);

      const totalCount = Number(countResult[0].count);

      // SEARCH query (accent-insensitive, paginated)
      const results = await prisma.$queryRawUnsafe<any[]>(`
        SELECT 
          v."number" as verse_number,
          v."text" as verse_text,
          c."number" as chapter_number,
          b."name" as book_name,
          b."testament" as book_testament,
          b."bookOrder" as book_order
        FROM "Verse" v
        JOIN "Chapter" c ON v."chapterId" = c.id
        JOIN "Book" b ON c."bookId" = b.id
        JOIN "BibleVersion" bv ON b."versionId" = bv.id
        WHERE bv."name" = \$1
        ${testamentFilter}
        AND unaccent(lower(v."text")) LIKE '%' || unaccent(lower(\$2)) || '%'
        ORDER BY b."bookOrder" ASC, c."number" ASC, v."number" ASC
        LIMIT \$3 OFFSET \$4
      `, version, sanitizedQuery, limit, offset);

      const tDb1 = performance.now();

      const formatted = results.map((r) => ({
        book: r.book_name,
        chapter: r.chapter_number,
        verse: r.verse_number,
        text: r.verse_text,
        testament: r.book_testament,
        bookOrder: r.book_order,
      }));

      const responseData = {
        query: query,
        version: version,
        testament: testament,
        total: totalCount,
        page: page,
        limit: limit,
        totalPages: Math.ceil(totalCount / limit),
        results: formatted,
      };

      // Cache
      setCache(memKey, responseData);
      await kvSet(kvKey, responseData, TTL_1D_MS);

      const headers = makeHeaders(cacheControl);
      headers.set("X-Cache", "MISS");
      headers.set(
        "Server-Timing",
        `db;dur=${(tDb1 - tDb0).toFixed(1)}, total;dur=${(performance.now() - t0).toFixed(1)}`
      );
      return new Response(JSON.stringify(responseData), { headers });
    }
    
    // 404
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
