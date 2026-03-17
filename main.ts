import { Pool } from "npm:@neondatabase/serverless";
import { translateCommentaryOnTheFly } from "./services/translator.ts";
import { createBibleRoutes } from "./services/routes/bible.ts";

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

// --------------------
// Crear rutas de biblia
// --------------------
const bibleRoutes = createBibleRoutes(
  pool,
  { getCached, setCache, kvGet, kvSet },
  { makeHeaders }
);

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
    // RUTAS DE BIBLIA (en services/routes/bible.ts)
    // =====================================================
    if (path === "/api/versions") {
      return await bibleRoutes.handleVersions(url);
    }

    if (path === "/api/books") {
      return await bibleRoutes.handleBooks(url);
    }

    if (path === "/api/chapters") {
      return await bibleRoutes.handleChapters(url);
    }

    if (path === "/api/verses") {
      return await bibleRoutes.handleVerses(url);
    }

    if (path === "/api/versions/strongs") {
      return await bibleRoutes.handleVersionsStrongs(url);
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
      const exact = url.searchParams.get("exact") === "true";

      console.log(`[API Search] Received query: "${queryText}", version: "${version}", testament: "${testament}", exact: ${exact}`);

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
        testamentFilter = ` AND b."testament" = 
$$
{paramIndex}`;
        params.push(testament);
        paramIndex++;
      }

      let searchFilter: string;
      if (exact) {
        searchFilter = `AND unaccent(lower(v."text")) ~* ('\\m' || unaccent(lower($2)) || '\\M')`;
      } else {
        searchFilter = `AND unaccent(lower(v."text")) LIKE '%' || unaccent(lower($2)) || '%'`;
      }

      const countSql = `
        SELECT COUNT(*) as total
        FROM "Verse" v
        JOIN "Chapter" c ON v."chapterId" = c.id
        JOIN "Book" b ON c."bookId" = b.id
        JOIN "BibleVersion" bv ON b."versionId" = bv.id
        WHERE bv.name = $1 ${searchFilter}${testamentFilter}`;

      const dataSql = `
        SELECT v."number" AS verse, v."text" AS text, c."number" AS chapter,
               b."name" AS book, b."testament", b."bookOrder"
        FROM "Verse" v
        JOIN "Chapter" c ON v."chapterId" = c.id
        JOIN "Book" b ON c."bookId" = b.id
        JOIN "BibleVersion" bv ON b."versionId" = bv.id
        WHERE bv.name = $1 ${searchFilter}${testamentFilter}
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
    // /api/cache/clear
    // =====================================================
    if (path === "/api/cache/clear") {
      const token = url.searchParams.get("token");
      const SECRET = Deno.env.get("CACHE_SECRET");

      if (token !== SECRET) {
        return new Response(JSON.stringify({ error: "No autorizado" }), {
          status: 401,
          headers: makeHeaders("no-store"),
        });
      }

      Object.keys(serverCache).forEach((k) => delete serverCache[k]);

      const keysToDelete: Deno.KvKey[] = [
        ["versions"],
        ["versions-strongs"],
      ];

      const { rows: versions } = await pool.query(
        `SELECT name FROM "BibleVersion" ORDER BY name ASC`
      );

      for (const v of versions) {
        keysToDelete.push(["books", v.name]);
        console.log(`[Cache Clear] Agregando clave para eliminar: ["books", "${v.name}"]`);
      }

      for (const key of keysToDelete) {
        await kv.delete(key);
        console.log(`[Cache Clear] ✓ Eliminada: ${JSON.stringify(key)}`);
      }

      return new Response(
        JSON.stringify({
          ok: true,
          message: `Caché limpiada correctamente (${keysToDelete.length} claves)`,
          deletedKeys: keysToDelete.length,
          versions: versions.map((v) => v.name),
        }),
        { headers: makeHeaders("no-store") }
      );
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
         WHERE v."chapterId" = $1
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
         WHERE w.strong = $1`,
        [strong]
      );
      const total = parseInt(countRows[0].total);

      const { rows } = await pool.query(
        `SELECT b.name AS book, b."bookOrder", b.testament, c.number AS chapter,
                v.number AS verse, v.text, ARRAY_AGG(DISTINCT w.text) AS matched_words
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
      const code = decodeURIComponent(path.replace("/api/strong-dict/", "")).toUpperCase().trim();
      let defLang = (url.searchParams.get("lang") || "en").toLowerCase();

      const langsMemKey = "strong-available-langs";
      let availableLangs = getCached(langsMemKey);

      if (!availableLangs) {
        const { rows } = await pool.query(`SELECT DISTINCT "definitionLang" FROM "StrongEntry"`);
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

      const memKey = `strong-dict-${code}-${defLang}`;
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
         WHERE strong = $1 AND "definitionLang" = $2`,
        [code, defLang]
      );

      let entry = entryRows[0];
      let usedLang = defLang;

      if (!entry && defLang !== "en") {
        console.log(`[Strong] ${code}: idioma "${defLang}" no encontrado, usando fallback a inglés`);

        const { rows: enRows } = await pool.query(
          `SELECT strong, language, "definitionLang", lemma, translit, pronunciation,
                  morphology, "speechLang", definition, exegesis,
                  explanation, "kjvDefinition", "strongsDef", "strongsDerivation"
           FROM "StrongEntry"
           WHERE strong = $1 AND "definitionLang" = 'en'`,
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
        `SELECT sr."toStrong", sr."relationType", se.lemma AS "toLemma",
                se.translit AS "toTranslit", se."kjvDefinition" AS "toKjvDefinition"
         FROM "StrongRelation" sr
         LEFT JOIN "StrongEntry" se ON sr."toStrong" = se.strong AND se."definitionLang" = $2
         WHERE sr."fromStrong" = $1 AND sr."fromDefLang" = $2
         ORDER BY sr."relationType", sr."toStrong"`,
        [code, usedLang]
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
    // /api/commentary/sources
    // =====================================================
    if (path === "/api/commentary/sources") {
      const bookOrder = Number(url.searchParams.get("bookOrder"));
      const chapter = Number(url.searchParams.get("chapter"));
      const verse = url.searchParams.get("verse");
      const language = url.searchParams.get("language") || "en";

      if (!bookOrder || !chapter) {
        return new Response(JSON.stringify({ error: "Parámetros requeridos: bookOrder, chapter" }), {
          status: 400,
          headers: makeHeaders("no-store"),
        });
      }

      if (language === "en") {
        let query = `
          SELECT DISTINCT cs.id, cs.name, cs."fullName", cs.author, cs.description,
                 COUNT(ce.id) as entry_count
          FROM "CommentarySource" cs
          JOIN "CommentaryEntry" ce ON ce."sourceId" = cs.id
          WHERE ce."bookOrder" = $1 AND ce.chapter = $2 AND ce.language = 'en'`;

        const params: any[] = [bookOrder, chapter];

        if (verse) {
          query += ` AND (ce."verseStart" IS NULL
                     OR (ce."verseStart" <= $3 AND (ce."verseEnd" IS NULL OR ce."verseEnd" >= $3)))`;
          params.push(Number(verse));
        }

        query += ` GROUP BY cs.id, cs.name, cs."fullName", cs.author, cs.description ORDER BY cs.name ASC`;

        const { rows } = await pool.query(query, params);
        return new Response(JSON.stringify(rows), { headers: makeHeaders("public, max-age=3600") });
      }

      let verseCondition = "";
      const params: any[] = [bookOrder, chapter, language];

      if (verse) {
        verseCondition = ` AND (ce."verseStart" IS NULL
                           OR (ce."verseStart" <= $4 AND (ce."verseEnd" IS NULL OR ce."verseEnd" >= $4)))`;
        params.push(Number(verse));
      }

      const query = `
        WITH english_entries AS (
          SELECT ce."sourceId", COUNT(*) as en_count
          FROM "CommentaryEntry" ce
          WHERE ce."bookOrder" = $1 AND ce.chapter = $2 AND ce.language = 'en'${verseCondition}
          GROUP BY ce."sourceId"
        ),
        translated_entries AS (
          SELECT ce."sourceId", COUNT(*) as trans_count
          FROM "CommentaryEntry" ce
          WHERE ce."bookOrder" = $1 AND ce.chapter = $2 AND ce.language = $3${verseCondition}
          GROUP BY ce."sourceId"
        )
        SELECT cs.id, cs.name, cs."fullName", cs.author, cs.description,
               COALESCE(ee.en_count, 0) as english_count,
               COALESCE(te.trans_count, 0) as translated_count,
               GREATEST(COALESCE(ee.en_count, 0), COALESCE(te.trans_count, 0)) as entry_count,
               CASE WHEN COALESCE(te.trans_count, 0) < COALESCE(ee.en_count, 0) THEN true ELSE false END as "needsTranslation"
        FROM "CommentarySource" cs
        LEFT JOIN english_entries ee ON ee."sourceId" = cs.id
        LEFT JOIN translated_entries te ON te."sourceId" = cs.id
        WHERE COALESCE(ee.en_count, 0) > 0 OR COALESCE(te.trans_count, 0) > 0
        ORDER BY cs.name ASC`;

      const { rows } = await pool.query(query, params);
      return new Response(JSON.stringify(rows), { headers: makeHeaders("public, max-age=3600") });
    }

    // =====================================================
    // /api/commentary
    // =====================================================
    if (path === "/api/commentary") {
      const bookOrder = Number(url.searchParams.get("bookOrder"));
      const chapter = Number(url.searchParams.get("chapter"));
      const verse = url.searchParams.get("verse");
      const sourceId = url.searchParams.get("sourceId");
      const language = url.searchParams.get("language") || "en";

      if (!bookOrder || !chapter) {
        return new Response(JSON.stringify({ error: "Parámetros requeridos: bookOrder, chapter" }), {
          status: 400,
          headers: makeHeaders("no-store"),
        });
      }

      if (language === "en") {
        const params: any[] = [bookOrder, chapter];
        let paramIndex = 3;

        let query = `
          SELECT ce.id, ce.title, ce.content, ce."contentHtml",
                 ce."verseStart", ce."verseEnd", ce."sectionType", ce."divId",
                 cs.name as source_name, cs."fullName" as source_full_name, cs.author,
                 false as "needsTranslation"
          FROM "CommentaryEntry" ce
          JOIN "CommentarySource" cs ON ce."sourceId" = cs.id
          WHERE ce."bookOrder" = $1 AND ce.chapter = $2 AND ce.language = 'en'`;

        if (sourceId) {
          query += ` AND cs.id =
$$
{paramIndex}`;
          params.push(Number(sourceId));
          paramIndex++;
        }

        if (verse) {
          query += ` AND ce."verseStart" IS NOT NULL
                     AND ce."verseStart" <= 
$$
{paramIndex}
                     AND (ce."verseEnd" IS NULL OR ce."verseEnd" >=
$$
{paramIndex + 1})`;
          params.push(Number(verse), Number(verse));
          paramIndex += 2;
        }

        query += ` ORDER BY ce."verseStart" NULLS FIRST, ce.id`;

        const { rows } = await pool.query(query, params);

        return new Response(JSON.stringify({
          bookOrder,
          chapter,
          verse: verse ? Number(verse) : null,
          total: rows.length,
          entries: rows,
        }), { headers: makeHeaders("public, max-age=86400") });
      }

      const params: any[] = [bookOrder, chapter, language];
      let paramIndex = 4;

      let query = `
        SELECT ce_en.id as "englishId", ce_lang.id as "translatedId",
               COALESCE(ce_lang.title, ce_en.title) as title,
               COALESCE(ce_lang.content, ce_en.content) as content,
               COALESCE(ce_lang."contentHtml", ce_en."contentHtml") as "contentHtml",
               ce_en."verseStart", ce_en."verseEnd", ce_en."sectionType", ce_en."divId",
               cs.name as source_name, cs."fullName" as source_full_name, cs.author,
               CASE WHEN ce_lang.id IS NULL THEN true ELSE false END as "needsTranslation"
        FROM "CommentaryEntry" ce_en
        JOIN "CommentarySource" cs ON ce_en."sourceId" = cs.id
        LEFT JOIN "CommentaryEntry" ce_lang
          ON ce_lang."sourceId" = ce_en."sourceId"
          AND ce_lang."bookOrder" = ce_en."bookOrder"
          AND ce_lang.chapter = ce_en.chapter
          AND ce_lang.language = \$3
          AND COALESCE(ce_lang."divId", '') = COALESCE(ce_en."divId", '')
        WHERE ce_en."bookOrder" = \$1 AND ce_en.chapter = \$2 AND ce_en.language = 'en'`;

      if (sourceId) {
        query += ` AND cs.id = 
$$
{paramIndex}`;
        params.push(Number(sourceId));
        paramIndex++;
      }

      if (verse) {
        query += ` AND ce_en."verseStart" IS NOT NULL
                   AND ce_en."verseStart" <=
$$
{paramIndex}
                   AND (ce_en."verseEnd" IS NULL OR ce_en."verseEnd" >= $${paramIndex + 1})`;
        params.push(Number(verse), Number(verse));
        paramIndex += 2;
      }

      query += ` ORDER BY ce_en."verseStart" NULLS FIRST, ce_en.id`;

      const { rows } = await pool.query(query, params);

      const entries = rows.map((row: any) => ({
        id: row.translatedId || row.englishId,
        englishId: row.englishId,
        title: row.title,
        content: row.content,
        contentHtml: row.contentHtml,
        verseStart: row.verseStart,
        verseEnd: row.verseEnd,
        sectionType: row.sectionType,
        divId: row.divId,
        source_name: row.source_name,
        source_full_name: row.source_full_name,
        author: row.author,
        needsTranslation: row.needsTranslation,
      }));

      return new Response(JSON.stringify({
        bookOrder,
        chapter,
        verse: verse ? Number(verse) : null,
        language,
        total: entries.length,
        entries,
      }), { headers: makeHeaders("public, max-age=86400") });
    }

    // =====================================================
    // /api/translate-commentary
    // =====================================================
    if (path === "/api/translate-commentary" && req.method === "POST") {
      try {
        const body = await req.json();
        const { sourceId, divId, targetLang } = body;

        if (!sourceId || !divId || !targetLang) {
          return new Response(
            JSON.stringify({ error: "Parámetros requeridos: sourceId, divId, targetLang" }),
            { status: 400, headers: makeHeaders("no-store") }
          );
        }

        const { rows: existing } = await pool.query(
          `SELECT * FROM "CommentaryEntry"
           WHERE "sourceId" = \$1 AND "divId" = \$2 AND language = \$3 LIMIT 1`,
          [sourceId, divId, targetLang]
        );

        if (existing.length > 0) {
          return new Response(
            JSON.stringify({ entry: existing[0], cached: true, saved: true }),
            { headers: makeHeaders("no-store") }
          );
        }

        const { rows: englishRows } = await pool.query(
          `SELECT * FROM "CommentaryEntry"
           WHERE "sourceId" = \$1 AND "divId" = \$2 AND language = 'en' LIMIT 1`,
          [sourceId, divId]
        );

        if (englishRows.length === 0) {
          return new Response(
            JSON.stringify({ error: "Entrada en inglés no encontrada" }),
            { status: 404, headers: makeHeaders("no-store") }
          );
        }

        const englishEntry = englishRows[0];
        const result = await translateCommentaryOnTheFly(englishEntry, targetLang);

        if (!result.success || !result.entry) {
          return new Response(
            JSON.stringify({ error: result.error || "Traducción falló" }),
            { status: 500, headers: makeHeaders("no-store") }
          );
        }

        const entry = result.entry;
        const { rows: inserted } = await pool.query(
          `INSERT INTO "CommentaryEntry"
           ("sourceId", language, "bookAbbr", "bookOrder", chapter,
            "verseStart", "verseEnd", title, content, "contentHtml",
            "divId", "sectionType", volume)
           VALUES (\$1, \$2, \$3, \$4, \$5, \$6, \$7, \$8, \$9, \$10, \$11, \$12, \$13)
           RETURNING *`,
          [
            entry.sourceId,
            entry.language,
            entry.bookAbbr,
            entry.bookOrder,
            entry.chapter,
            entry.verseStart,
            entry.verseEnd,
            entry.title,
            entry.content,
            entry.contentHtml,
            entry.divId,
            entry.sectionType,
            entry.volume,
          ]
        );

        return new Response(
          JSON.stringify({
            entry: inserted[0],
            cached: false,
            saved: true,
            method: result.method,
          }),
          { headers: makeHeaders("no-store") }
        );
      } catch (error: unknown) {
        const err = error as { message?: string };
        console.error("[translate-commentary] Error:", err.message);
        return new Response(
          JSON.stringify({ error: err.message }),
          { status: 500, headers: makeHeaders("no-store") }
        );
      }
    }

    // =====================================================
    // 404
    // =====================================================
    return new Response(JSON.stringify({ error: "404" }), {
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
