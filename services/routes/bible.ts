import { Pool } from "npm:@neondatabase/serverless";

// --------------------
// Tipos para caché
// --------------------
type ServerCache = Record<string, { data: any; timestamp: number }>;

interface CacheFunctions {
  getCached: (key: string) => any;
  setCache: (key: string, data: any) => void;
  kvGet: <T>(key: Deno.KvKey) => Promise<T | null>;
  kvSet: <T>(key: Deno.KvKey, value: T, ttlMs: number) => Promise<void>;
}

interface HeaderFunctions {
  makeHeaders: (cacheControl?: string) => Headers;
}

// --------------------
// Constantes
// --------------------
const TTL_1D_MS = 24 * 60 * 60 * 1000;

// --------------------
// Crear rutas
// --------------------
export function createBibleRoutes(
  pool: Pool,
  cache: CacheFunctions,
  headers: HeaderFunctions
) {
  const { getCached, setCache, kvGet, kvSet } = cache;
  const { makeHeaders } = headers;

  function cacheHit(type: "mem" | "kv", cacheControl: string): Headers {
    const h = makeHeaders(cacheControl);
    h.set("X-Cache", `HIT(${type})`);
    return h;
  }

  function cacheMiss(cacheControl: string): Headers {
    const h = makeHeaders(cacheControl);
    h.set("X-Cache", "MISS");
    return h;
  }

  return {
    // /api/versions
    async handleVersions(_url: URL): Promise<Response> {
      const cacheControl = "public, max-age=86400, stale-while-revalidate=300";
      const memKey = "versions";
      const kvKey: Deno.KvKey = ["versions"];

      const mem = getCached(memKey);
      if (mem) {
        return new Response(JSON.stringify(mem), { headers: cacheHit("mem", cacheControl) });
      }

      const kvVal = await kvGet<any[]>(kvKey);
      if (kvVal) {
        setCache(memKey, kvVal);
        return new Response(JSON.stringify(kvVal), { headers: cacheHit("kv", cacheControl) });
      }

      const { rows } = await pool.query(
        `SELECT id, name, "fullName", language
         FROM "BibleVersion"
         ORDER BY language ASC, id ASC`
      );

      setCache(memKey, rows);
      await kvSet(kvKey, rows, TTL_1D_MS);

      return new Response(JSON.stringify(rows), { headers: cacheMiss(cacheControl) });
    },

    // /api/books
    async handleBooks(url: URL): Promise<Response> {
      const cacheControl = "public, max-age=86400, stale-while-revalidate=300";
      const version = url.searchParams.get("version") || "RV60";
      const memKey = `books-${version}`;
      const kvKey: Deno.KvKey = ["books", version];

      const mem = getCached(memKey);
      if (mem) {
        return new Response(JSON.stringify(mem), { headers: cacheHit("mem", cacheControl) });
      }

      const kvVal = await kvGet<any[]>(kvKey);
      if (kvVal) {
        setCache(memKey, kvVal);
        return new Response(JSON.stringify(kvVal), { headers: cacheHit("kv", cacheControl) });
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

      return new Response(JSON.stringify(rows), { headers: cacheMiss(cacheControl) });
    },

    // /api/chapters
    async handleChapters(url: URL): Promise<Response> {
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
    },

    // /api/verses
    async handleVerses(url: URL): Promise<Response> {
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
    },

    // /api/versions/strongs
    async handleVersionsStrongs(_url: URL): Promise<Response> {
      const memKey = "versions-strongs";
      const mem = getCached(memKey);
      if (mem) {
        return new Response(JSON.stringify(mem), { headers: cacheHit("mem", "public, max-age=86400") });
      }

      const { rows } = await pool.query(
        `SELECT id, name, "fullName", language
         FROM "BibleVersion"
         WHERE "hasStrongs" = true
         ORDER BY id ASC`
      );

      setCache(memKey, rows);
      return new Response(JSON.stringify(rows), {
        headers: makeHeaders("public, max-age=86400"),
      });
    },
  };
}
