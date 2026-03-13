import { Pool } from "npm:@neondatabase/serverless";

const pool = new Pool({
  connectionString: Deno.env.get("DATABASE_URL"),
});

// --------------------
// KV (Deno Deploy)
// --------------------
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
// Caché KV (L2)
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
    return new Response(JSON.stringify({ status: "ok" }), {
      headers: makeHeaders("no-store"),
    });
  }

  try {

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
        `SELECT id, name, "fullName"
         FROM "BibleVersion"
         ORDER BY id ASC`
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
        `SELECT id, number
         FROM "Chapter"
         WHERE "bookId" = \$1
         ORDER BY number ASC`,
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

      let query = `
        SELECT number, text
        FROM "Verse"
        WHERE "chapterId" = \$1
      `;
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
if (path === "/api/search") {
  const queryText = url.searchParams.get("query")?.trim();
  const version = url.searchParams.get("version") || "RV60";
  const testament = url.searchParams.get("testament") || "ALL";

  console.log(`[API Search] Received query: "${queryText}", version: "${version}", testament: "${testament}"`);

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
    testamentFilter = " AND b.\"testament\" = $" + paramIndex;
    params.push(testament);
    paramIndex++;
  }

  const countSql =
    "SELECT COUNT(*) as total " +
    "FROM \"Verse\" v " +
    "JOIN \"Chapter\" c ON v.\"chapterId\" = c.id " +
    "JOIN \"Book\" b ON c.\"bookId\" = b.id " +
    "JOIN \"BibleVersion\" bv ON b.\"versionId\" = bv.id " +
    "WHERE bv.name = \$1 " +
    "AND unaccent(lower(v.\"text\")) LIKE '%' || unaccent(lower(\$2)) || '%'" +
    testamentFilter;

  const dataSql =
    "SELECT " +
    "v.\"number\" AS verse, " +
    "v.\"text\" AS text, " +
    "c.\"number\" AS chapter, " +
    "b.\"name\" AS book, " +
    "b.\"testament\", " +
    "b.\"bookOrder\" " +
    "FROM \"Verse\" v " +
    "JOIN \"Chapter\" c ON v.\"chapterId\" = c.id " +
    "JOIN \"Book\" b ON c.\"bookId\" = b.id " +
    "JOIN \"BibleVersion\" bv ON b.\"versionId\" = bv.id " +
    "WHERE bv.name = \$1 " +
    "AND unaccent(lower(v.\"text\")) LIKE '%' || unaccent(lower(\$2)) || '%'" +
    testamentFilter + " " +
    "ORDER BY b.\"bookOrder\", c.\"number\", v.\"number\" " +
    "LIMIT $" + paramIndex + " OFFSET $" + (paramIndex + 1);

  params.push(limit, offset);

  const [countResult, dataResult] = await Promise.all([
    pool.query(countSql, params.slice(0, paramIndex - 1)),
    pool.query(dataSql, params),
  ]);

  const total = parseInt(countResult.rows[0].total);
  const totalPages = Math.ceil(total / limit);

  const response = {
    query: queryText,
    version,
    testament,
    total,
    page,
    limit,
    totalPages,
    results: dataResult.rows,
  };

  return new Response(JSON.stringify(response), {
    headers: makeHeaders("public, max-age=3600"),
  });
}

    // =====================================================
    // /api/cache/clear
    // =====================================================
    if (path === "/api/cache/clear") {
      const token = url.searchParams.get("token");
      const SECRET = Deno.env.get("CACHE_SECRET") ?? "mi-secreto-seguro";

      if (token !== SECRET) {
        return new Response(JSON.stringify({ error: "No autorizado" }), {
          status: 401,
          headers: makeHeaders("no-store"),
        });
      }

      Object.keys(serverCache).forEach((k) => delete serverCache[k]);

      const keysToDelete: Deno.KvKey[] = [
        ["versions"],
        ["books", "RV60"],
        ["books", "LBLA"],
        ["books", "NUEVA_VERSION"],
      ];

      for (const key of keysToDelete) {
        await kv.delete(key);
      }

      return new Response(JSON.stringify({ ok: true, message: "Caché limpiada correctamente" }), {
        headers: makeHeaders("no-store"),
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
        `SELECT id, name, "fullName"
         FROM "BibleVersion"
         WHERE "hasStrongs" = true
         ORDER BY id ASC`
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
        `SELECT v.number AS "verseNumber",
                w.text, w.strong, w.position
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

  // 1. Contar total de versículos únicos que contienen este Strong
  const { rows: countRows } = await pool.query(
    `SELECT COUNT(DISTINCT v.id) AS total
     FROM "Word" w
     JOIN "Verse" v ON w."verseId" = v.id
     WHERE w.strong = $1`,
    [strong]
  );
  const total = parseInt(countRows[0].total);

  // 2. Obtener los datos con w.text (que es tu columna real según el modelo Word)
  const { rows } = await pool.query(
    `SELECT b.name AS book,
            b."bookOrder",
            b.testament,
            c.number AS chapter,
            v.number AS verse,
            v.text,
            ARRAY_AGG(DISTINCT w.text) AS matched_words 
     FROM "Word" w
     JOIN "Verse" v ON w."verseId" = v.id
     JOIN "Chapter" c ON v."chapterId" = c.id
     JOIN "Book" b ON c."bookId" = b.id
     WHERE w.strong = $1
     GROUP BY b.id, c.id, v.id, b.name, b."bookOrder", b.testament, c.number, v.number, v.text
     ORDER BY b."bookOrder", c.number, v.number
     LIMIT $2 OFFSET $3`,
    [strong, limit, offset]
  );

  const totalPages = Math.ceil(total / limit);

  return new Response(JSON.stringify({
    strong,
    total,
    page,
    limit,
    totalPages,
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

      if (!code) {
        return new Response(JSON.stringify({ error: "Código Strong requerido" }), {
          status: 400,
          headers: makeHeaders("no-store"),
        });
      }

      const memKey = `strong-dict-${code}`;
      const mem = getCached(memKey);
      if (mem) {
        const headers = makeHeaders("public, max-age=604800");
        headers.set("X-Cache", "HIT(mem)");
        return new Response(JSON.stringify(mem), { headers });
      }

      const { rows: entryRows } = await pool.query(
        `SELECT
           strong, language, lemma, translit, pronunciation,
           morphology, "speechLang", definition, exegesis,
           explanation, "kjvDefinition", "strongsDef", "strongsDerivation"
         FROM "StrongEntry"
         WHERE strong = \$1`,
        [code]
      );

      if (entryRows.length === 0) {
        return new Response(JSON.stringify({ error: "not found" }), {
          status: 404,
          headers: makeHeaders("no-store"),
        });
      }

      const entry = entryRows[0];

      const { rows: relRows } = await pool.query(
        `SELECT
           sr."toStrong",
           sr."relationType",
           se.lemma           AS "toLemma",
           se.translit        AS "toTranslit",
           se."kjvDefinition" AS "toKjvDefinition"
         FROM "StrongRelation" sr
         LEFT JOIN "StrongEntry" se ON sr."toStrong" = se.strong
         WHERE sr."fromStrong" = \$1
         ORDER BY sr."relationType", sr."toStrong"`,
        [code]
      );

      const relations = relRows.map((r) => ({
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
    // 404
    // =====================================================
    return new Response(JSON.stringify({ error: "404" }), {
      status: 404,
      headers: makeHeaders("no-store"),
    });

  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
      headers: makeHeaders("no-store"),
    });
  }
});
