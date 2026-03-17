import { Pool } from "npm:@neondatabase/serverless";
import { handleCommentaryRoutes } from "./services/commentaryRoutes.ts";

const pool = new Pool({
  connectionString: Deno.env.get("DATABASE_URL"),
});

const kv = await Deno.openKv();

const serverCache: Record<string, { data: any; timestamp: number }> = {};
const CACHE_TTL = 3600000;

function getCached(key: string) {
  const entry = serverCache[key];
  if (entry && Date.now() - entry.timestamp < CACHE_TTL) return entry.data;
  return null;
}

function setCache(key: string, data: any) {
  serverCache[key] = { data, timestamp: Date.now() };
}

async function kvGet<T>(key: Deno.KvKey): Promise<T | null> {
  const res = await kv.get<T>(key);
  return res.value ?? null;
}

async function kvSet<T>(key: Deno.KvKey, value: T, ttlMs: number) {
  await kv.set(key, value, { expireIn: ttlMs });
}

const TTL_1D_MS = 24 * 60 * 60 * 1000;
const TTL_7D_MS = 7 * 24 * 60 * 60 * 1000;

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: makeHeaders("no-store") });
  }

  const url = new URL(req.url);
  const path = url.pathname;

  // =====================================================
  // Health check
  // =====================================================
  if (path === "/" || path === "/health") {
    return new Response(JSON.stringify({ status: "ok" }), {
      headers: makeHeaders("no-store"),
    });
  }

  try {
    // =====================================================
    // /api/cache/force-refresh - LIMPIEZA DE CACHÉ
    // =====================================================
    if (path === "/api/cache/force-refresh") {
      const token = url.searchParams.get("token");
      const SECRET = Deno.env.get("CACHE_SECRET");

      console.log("[Cache] Token recibido:", token ? "***" : "null");
      console.log("[Cache] Secret configurado:", SECRET ? "***" : "NO CONFIGURADO");

      if (!SECRET) {
        return new Response(JSON.stringify({ 
          error: "CACHE_SECRET no configurado en el servidor" 
        }), {
          status: 500,
          headers: makeHeaders("no-store"),
        });
      }

      if (token !== SECRET) {
        return new Response(JSON.stringify({ error: "No autorizado" }), {
          status: 401,
          headers: makeHeaders("no-store"),
        });
      }

      // 1. Limpiar TODA la memoria
      const memKeysCount = Object.keys(serverCache).length;
      Object.keys(serverCache).forEach((k) => delete serverCache[k]);

      // 2. Limpiar TODAS las claves de Deno KV
      const deletedKeys: string[] = [];
      for await (const entry of kv.list({ prefix: [] })) {
        await kv.delete(entry.key);
        deletedKeys.push(JSON.stringify(entry.key));
      }

      // 3. Obtener datos frescos de DB
      const { rows: versions } = await pool.query(
        `SELECT id, name, "fullName", language 
         FROM "BibleVersion" 
         ORDER BY language ASC, id ASC`
      );

      // 4. Pre-popular ambas cachés con datos correctos
      setCache("versions", versions);
      await kvSet(["versions"], versions, TTL_1D_MS);

      // También pre-popular los libros de cada versión
      for (const v of versions) {
        const { rows: books } = await pool.query(
          `SELECT b.id, b.name, b.testament, b."bookOrder"
           FROM "Book" b
           JOIN "BibleVersion" bv ON b."versionId" = bv.id
           WHERE bv.name = \$1
           ORDER BY b."bookOrder" ASC`,
          [v.name]
        );
        
        setCache("books-" + v.name, books);
        await kvSet(["books", v.name], books, TTL_1D_MS);
      }

      return new Response(
        JSON.stringify({
          ok: true,
          deletedMemoryKeys: memKeysCount,
          deletedKvKeys: deletedKeys.length,
          refreshedVersions: versions.map((v: any) => v.name),
          kjvPresent: versions.some((v: any) => v.name === "KJV"),
        }, null, 2),
        { headers: makeHeaders("no-store") }
      );
    }

    // =====================================================
    // /api/debug/versions - DIAGNÓSTICO
    // =====================================================
    if (path === "/api/debug/versions") {
      const memVersions = getCached("versions");
      const kvVersions = await kvGet<any[]>(["versions"]);
      
      const { rows: dbVersions } = await pool.query(
        `SELECT id, name, "fullName", language 
         FROM "BibleVersion" 
         ORDER BY language ASC, id ASC`
      );

      const getNames = (arr: any[] | null) => arr?.map((v: any) => v.name) ?? null;

      return new Response(JSON.stringify({
        timestamp: new Date().toISOString(),
        sources: {
          memory: {
            data: getNames(memVersions),
            hasKJV: memVersions?.some((v: any) => v.name === "KJV") ?? false,
            count: memVersions?.length ?? 0,
          },
          kv: {
            data: getNames(kvVersions),
            hasKJV: kvVersions?.some((v: any) => v.name === "KJV") ?? false,
            count: kvVersions?.length ?? 0,
          },
          database: {
            data: getNames(dbVersions),
            hasKJV: dbVersions.some((v: any) => v.name === "KJV"),
            count: dbVersions.length,
          },
        },
        diagnosis: !dbVersions.some((v: any) => v.name === "KJV")
          ? "❌ KJV NO está en la base de datos"
          : kvVersions && !kvVersions.some((v: any) => v.name === "KJV")
          ? "⚠️ KJV está en DB pero NO en Deno KV (caché corrupta)"
          : memVersions && !memVersions.some((v: any) => v.name === "KJV")
          ? "⚠️ KJV está en DB y KV pero NO en memoria"
          : "✅ KJV presente en todas las capas",
      }, null, 2), {
        headers: makeHeaders("no-store"),
      });
    }

    // =====================================================
    // /api/versions
    // =====================================================
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

      const { rows } = await pool.query(
        `SELECT id, name, "fullName", language FROM "BibleVersion" ORDER BY language ASC, id ASC`
      );

      setCache(memKey, rows);
      await kvSet(kvKey, rows, TTL_1D_MS);

      const headers = makeHeaders(cacheControl);
      headers.set("X-Cache", "MISS");
      return new Response(JSON.stringify(rows), { headers });
    }

    // =====================================================
    // /api/books
    // =====================================================
    if (path === "/api/books") {
      const cacheControl = "public, max-age=86400, stale-while-revalidate=300";
      const version = url.searchParams.get("version") || "RV60";

      const memKey = "books-" + version;
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

      const { rows } = await pool.query(
        `SELECT b.id, b.name, b.testament, b."bookOrder"
         FROM "Book" b
         JOIN "BibleVersion" v ON b."versionId" = v.id
         WHERE v.name = \$1
         ORDER BY b."bookOrder" ASC`,
        [version]
      );

      setCache(memKey, rows);
      await kvSet(kvKey, rows, TTL_1D_MS);

      const headers = makeHeaders(cacheControl);
      headers.set("X-Cache", "MISS");
      return new Response(JSON.stringify(rows), { headers });
    }

    // =====================================================
    // /api/chapters
    // =====================================================
    if (path === "/api/chapters") {
      const bookId = Number(url.searchParams.get("bookId"));
      if (!Number.isFinite(bookId)) {
        return new Response(JSON.stringify({ error: "Parámetro bookId inválido" }), {
          status: 400,
          headers: makeHeaders("no-store"),
        });
      }

      const { rows } = await pool.query(
        `SELECT id, number FROM "Chapter" WHERE "bookId" = \$1 ORDER BY number ASC`,
        [bookId]
      );

      return new Response(JSON.stringify(rows), {
        headers: makeHeaders("public, max-age=604800"),
      });
    }

    // =====================================================
    // /api/verses
    // =====================================================
    if (path === "/api/verses") {
      const chId = Number(url.searchParams.get("chapterId"));
      const vNum = url.searchParams.get("verse");

      if (!Number.isFinite(chId)) {
        return new Response(JSON.stringify({ error: "Parámetro chapterId inválido" }), {
          status: 400,
          headers: makeHeaders("no-store"),
        });
      }

      let query = `SELECT number, text FROM "Verse" WHERE "chapterId" = \$1`;
      const params: any[] = [chId];

      if (vNum) {
        query += ` AND number = \$2`;
        params.push(Number(vNum));
      }

      query += ` ORDER BY number ASC`;

      const { rows } = await pool.query(query, params);

      return new Response(JSON.stringify(rows), {
        headers: makeHeaders("public, max-age=604800"),
      });
    }

    // =====================================================
    // /api/compare
    // =====================================================
    if (path === "/api/compare") {
      const bookOrder = Number(url.searchParams.get("bookOrder"));
      const chapter = Number(url.searchParams.get("chapter"));
      const verse = Number(url.searchParams.get("verse"));

      if (!bookOrder || isNaN(chapter) || isNaN(verse)) {
        return new Response(JSON.stringify({ error: "Datos inválidos" }), {
          status: 400,
          headers: makeHeaders("no-store"),
        });
      }

      const { rows } = await pool.query(
        `SELECT v.text, bv.name as version, b.name as bookName
         FROM "Verse" v
         JOIN "Chapter" c ON v."chapterId" = c.id
         JOIN "Book" b ON c."bookId" = b.id
         JOIN "BibleVersion" bv ON b."versionId" = bv.id
         WHERE v.number = \$1
         AND c.number = \$2
         AND b."bookOrder" = \$3`,
        [verse, chapter, bookOrder]
      );

      return new Response(JSON.stringify(rows), {
        headers: makeHeaders("public, max-age=86400"),
      });
    }

    // =====================================================
    // /api/search
    // =====================================================
    // =====================================================
    // /api/search
    // =====================================================
    if (path === "/api/search") {
      const queryText = url.searchParams.get("query")?.trim();
      const version = url.searchParams.get("version") || "RV60";
      const testament = url.searchParams.get("testament") || "ALL";
      const exact = url.searchParams.get("exact") === "true";

      const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
      const limit = Math.min(50, Math.max(1, Number(url.searchParams.get("limit")) || 20));
      const offset = (page - 1) * limit;

      if (!queryText || queryText.length < 2) {
        return new Response(JSON.stringify({ error: "Query inválida" }), {
          status: 400,
          headers: makeHeaders("no-store"),
        });
      }

      const params: any[] = [version, queryText];
      let paramIndex = 3;

      let testamentFilter = "";
      if (testament !== "ALL") {
        // CORRECCIÓN AQUÍ: Todo en una misma línea y con formato correcto
        testamentFilter = ` AND b."testament" = 
$$
{paramIndex}`;
        params.push(testament);
        paramIndex++;
      }

      const searchFilter = exact
        ? ` AND unaccent(lower(v."text")) ~* ('\\m' || unaccent(lower($2)) || '\\M')`
        : ` AND unaccent(lower(v."text")) LIKE '%' || unaccent(lower($2)) || '%'`;

      const baseFrom = `FROM "Verse" v 
        JOIN "Chapter" c ON v."chapterId" = c.id 
        JOIN "Book" b ON c."bookId" = b.id 
        JOIN "BibleVersion" bv ON b."versionId" = bv.id 
        WHERE bv.name = $1${searchFilter}${testamentFilter}`;

      const countSql = `SELECT COUNT(*) as total ${baseFrom}`;

      // CORRECCIÓN AQUÍ: El LIMIT y OFFSET corregidos en la misma línea
      const dataSql = `SELECT v."number" AS verse, v."text" AS text, c."number" AS chapter, 
        b."name" AS book, b."testament", b."bookOrder" 
        ${baseFrom}
        ORDER BY b."bookOrder", c."number", v."number"
        LIMIT
$$
{paramIndex} OFFSET 
$$
{paramIndex + 1}`;

      params.push(limit, offset);

      const [countResult, dataResult] = await Promise.all([
        pool.query(countSql, params.slice(0, paramIndex - 1)),
        pool.query(dataSql, params),
      ]);

      const total = parseInt(countResult.rows[0].total);
      const totalPages = Math.ceil(total / limit);

      return new Response(JSON.stringify({
        query: queryText,
        version,
        testament,
        exact,
        total,
        page,
        limit,
        totalPages,
        results: dataResult.rows,
      }), {
        headers: makeHeaders("public, max-age=3600"),
      });
    }

    // =====================================================
    // /api/versions/strongs
    // =====================================================
    if (path === "/api/versions/strongs") {
      const memKey = "versions-strongs";
      const mem = getCached(memKey);
      if (mem) {
        const headers = makeHeaders("public, max-age=86400");
        headers.set("X-Cache", "HIT(mem)");
        return new Response(JSON.stringify(mem), { headers });
      }

      const { rows } = await pool.query(
        `SELECT id, name, "fullName", language FROM "BibleVersion" WHERE "hasStrongs" = true ORDER BY id ASC`
      );

      setCache(memKey, rows);
      return new Response(JSON.stringify(rows), {
        headers: makeHeaders("public, max-age=86400"),
      });
    }

    // =====================================================
    // /api/words
    // =====================================================
    if (path === "/api/words") {
      const chId = Number(url.searchParams.get("chapterId"));
      if (!Number.isFinite(chId)) {
        return new Response(JSON.stringify({ error: "Parámetro chapterId inválido" }), {
          status: 400,
          headers: makeHeaders("no-store"),
        });
      }

      const { rows } = await pool.query(
        `SELECT v.number AS "verseNumber", w.text, w.strong, w.position
         FROM "Word" w
         JOIN "Verse" v ON w."verseId" = v.id
         WHERE v."chapterId" = \$1
         ORDER BY v.number ASC, w.position ASC`,
        [chId]
      );

      const grouped: Record<number, {
        verseNumber: number;
        words: { text: string; strong: string | null; position: number }[];
      }> = {};

      for (const row of rows) {
        if (!grouped[row.verseNumber]) {
          grouped[row.verseNumber] = { verseNumber: row.verseNumber, words: [] };
        }
        grouped[row.verseNumber].words.push({
          text: row.text,
          strong: row.strong,
          position: row.position,
        });
      }

      const result = Object.values(grouped).sort((a, b) => a.verseNumber - b.verseNumber);

      return new Response(JSON.stringify(result), {
        headers: makeHeaders("public, max-age=604800"),
      });
    }

    // =====================================================
    // /api/strong-refs
    // =====================================================
    if (path === "/api/strong-refs") {
      const strong = url.searchParams.get("strong")?.trim();
      if (!strong) {
        return new Response(JSON.stringify({ error: "Parámetro strong requerido" }), {
          status: 400,
          headers: makeHeaders("no-store"),
        });
      }

      const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
      const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit")) || 50));
      const offset = (page - 1) * limit;

      const { rows: countRows } = await pool.query(
        `SELECT COUNT(DISTINCT v.id) AS total
         FROM "Word" w
         JOIN "Verse" v ON w."verseId" = v.id
         WHERE w.strong = \$1`,
        [strong]
      );
      const total = parseInt(countRows[0].total);

      const { rows } = await pool.query(
        `SELECT b.name AS book, b."bookOrder", b.testament,
         c.number AS chapter, v.number AS verse, v.text,
         ARRAY_AGG(DISTINCT w.text) AS matched_words
         FROM "Word" w
         JOIN "Verse" v ON w."verseId" = v.id
         JOIN "Chapter" c ON v."chapterId" = c.id
         JOIN "Book" b ON c."bookId" = b.id
         WHERE w.strong = \$1
         GROUP BY b.id, c.id, v.id, b.name, b."bookOrder", b.testament, c.number, v.number, v.text
         ORDER BY b."bookOrder", c.number, v.number
         LIMIT \$2 OFFSET \$3`,
        [strong, limit, offset]
      );

      return new Response(JSON.stringify({
        strong,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        results: rows,
      }), {
        headers: makeHeaders("public, max-age=3600"),
      });
    }

    // =====================================================
    // /api/strong-dict/:code
    // =====================================================
    if (path.startsWith("/api/strong-dict/")) {
      const code = decodeURIComponent(
        path.replace("/api/strong-dict/", "")
      ).toUpperCase().trim();

      let defLang = (url.searchParams.get("lang") || "en").toLowerCase();

      const langsMemKey = "strong-available-langs";
      let availableLangs = getCached(langsMemKey);

      if (!availableLangs) {
        const { rows } = await pool.query(
          `SELECT DISTINCT "definitionLang" FROM "StrongEntry"`
        );
        availableLangs = rows.map((r: any) => r.definitionLang);
        setCache(langsMemKey, availableLangs);
      }

      if (!availableLangs.includes(defLang)) defLang = "es";

      if (!code) {
        return new Response(JSON.stringify({ error: "Código Strong requerido" }), {
          status: 400,
          headers: makeHeaders("no-store"),
        });
      }

      const memKey = "strong-dict-" + code + "-" + defLang;
      const mem = getCached(memKey);
      if (mem) {
        const headers = makeHeaders("public, max-age=604800");
        headers.set("X-Cache", "HIT(mem)");
        return new Response(JSON.stringify(mem), { headers });
      }

      const { rows: entryRows } = await pool.query(
        `SELECT strong, language, "definitionLang", lemma, translit, pronunciation,
         morphology, "speechLang", definition, exegesis,
         explanation, "kjvDefinition", "strongsDef", "strongsDerivation"
         FROM "StrongEntry"
         WHERE strong = \$1 AND "definitionLang" = \$2`,
        [code, defLang]
      );

      let entry = entryRows[0];
      let usedLang = defLang;

      if (!entry && defLang !== "en") {
        const { rows: enRows } = await pool.query(
          `SELECT strong, language, "definitionLang", lemma, translit, pronunciation,
           morphology, "speechLang", definition, exegesis,
           explanation, "kjvDefinition", "strongsDef", "strongsDerivation"
           FROM "StrongEntry"
           WHERE strong = \$1 AND "definitionLang" = 'en'`,
          [code]
        );

        entry = enRows[0];
        usedLang = "en";
      }

      if (!entry) {
        return new Response(JSON.stringify({ error: "not found" }), {
          status: 404,
          headers: makeHeaders("no-store"),
        });
      }

      const { rows: relRows } = await pool.query(
        `SELECT sr."toStrong", sr."relationType",
         se.lemma AS "toLemma",
         se.translit AS "toTranslit",
         se."kjvDefinition" AS "toKjvDefinition"
         FROM "StrongRelation" sr
         LEFT JOIN "StrongEntry" se
           ON sr."toStrong" = se.strong
           AND se."definitionLang" = \$2
         WHERE sr."fromStrong" = \$1
           AND sr."fromDefLang" = \$2
         ORDER BY sr."relationType", sr."toStrong"`,
        [code, usedLang]
      );

      const relations = relRows.map((r: any) => ({
        toStrong: r.toStrong,
        relationType: r.relationType,
        to: {
          strong: r.toStrong,
          lemma: r.toLemma,
          translit: r.toTranslit,
          kjvDefinition: r.toKjvDefinition,
        },
      }));

      const result = { ...entry, relations };
      setCache(memKey, result);

      return new Response(JSON.stringify(result), {
        headers: makeHeaders("public, max-age=604800"),
      });
    }

    // =====================================================
    // Rutas de Commentary
    // =====================================================
    if (
      path === "/api/commentary/sources" ||
      path === "/api/commentary" ||
      (path === "/api/translate-commentary" && req.method === "POST")
    ) {
      const commentaryResponse = await handleCommentaryRoutes(
        path,
        req,
        url,
        pool,
        makeHeaders
      );
      if (commentaryResponse !== null) return commentaryResponse;
    }

    // =====================================================
    // 404
    // =====================================================
    return new Response(JSON.stringify({ error: "Not found" }), {
      status: 404,
      headers: makeHeaders("no-store"),
    });

  } catch (error) {
    console.error("Error en el servidor:", error);
    return new Response(JSON.stringify({ error: "Error interno del servidor" }), {
      status: 500,
      headers: makeHeaders("no-store"),
    });
  }
});
