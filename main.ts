import { Pool } from "https://deno.land/x/postgres@v0.19.3/mod.ts";

const databaseUrl = Deno.env.get("DATABASE_URL");
let pool: Pool | null = null;

if (databaseUrl) {
  try {
    const url = new URL(databaseUrl);
    pool = new Pool({
      hostname: url.hostname,
      port: url.port || "5432",
      user: url.username,
      password: url.password,
      database: url.pathname.slice(1),
      tls: { enabled: true, enforce: false },
    }, 10, true);
  } catch (e) {
    console.error("❌ Error configurando pool:", e);
  }
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const url = new URL(req.url);
  const path = url.pathname;

  if (path === "/" || path === "/health") {
    return new Response(JSON.stringify({ status: "ok" }), { headers: corsHeaders });
  }

  if (!pool) return new Response(JSON.stringify({ error: "Sin DB" }), { status: 500, headers: corsHeaders });

  let client;
  try {
    client = await pool.connect();

    // 1. RUTA: Versiones
    if (path === "/api/versions") {
      const result = await client.queryObject(`SELECT id, name, "fullName" FROM "BibleVersion" ORDER BY id`);
      return new Response(JSON.stringify(result.rows), { headers: corsHeaders });
    }

    // 2. RUTA: Libros por versión
    if (path === "/api/books") {
      const version = url.searchParams.get("version") || "RV60";
      const result = await client.queryObject(`
        SELECT b.id, b.name, b.testament, b."bookOrder" 
        FROM "Book" b
        JOIN "BibleVersion" v ON b."versionId" = v.id
        WHERE v.name = $1 ORDER BY b."bookOrder"
      `, [version]);
      return new Response(JSON.stringify(result.rows), { headers: corsHeaders });
    }

    // 3. RUTA: Capítulos
    if (path === "/api/chapters") {
      const bookId = url.searchParams.get("bookId");
      const result = await client.queryObject(`SELECT id, number FROM "Chapter" WHERE "bookId" = $1 ORDER BY number`, [bookId]);
      return new Response(JSON.stringify(result.rows), { headers: corsHeaders });
    }

    // 4. RUTA: Versículos
    if (path === "/api/verses") {
      const chId = url.searchParams.get("chapterId");
      const vNum = url.searchParams.get("verse");
      let query = `SELECT number, text FROM "Verse" WHERE "chapterId" = $1`;
      const params = [chId];
      if (vNum) { query += ` AND number = $2`; params.push(parseInt(vNum)); }
      query += ` ORDER BY number`;
      const result = await client.queryObject(query, params);
      return new Response(JSON.stringify(result.rows), { headers: corsHeaders });
    }

    // 5. RUTA CLAVE: COMPARACIÓN (Aquí es donde fallaba)
    if (path === "/api/compare") {
      const bookName = url.searchParams.get("bookName");
      const chapter = url.searchParams.get("chapter");
      const verse = url.searchParams.get("verse");

      if (!bookName || !chapter || !verse) throw new Error("Faltan datos");

      const result = await client.queryObject(`
        SELECT v.text, ver.name as version
        FROM "Verse" v
        JOIN "Chapter" c ON v."chapterId" = c.id
        JOIN "Book" b ON c."bookId" = b.id
        JOIN "BibleVersion" ver ON b."versionId" = ver.id
        WHERE b.name ILIKE $1 
          AND c.number = $2 
          AND v.number = $3
        ORDER BY ver.id ASC
      `, [bookName, parseInt(chapter), parseInt(verse)]);

      return new Response(JSON.stringify(result.rows), { headers: corsHeaders });
    }

    return new Response(JSON.stringify({ error: "404" }), { status: 404, headers: corsHeaders });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
  } finally {
    if (client) client.release();
  }
});
