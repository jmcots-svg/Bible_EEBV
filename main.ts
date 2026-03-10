import { Pool } from "https://deno.land/x/postgres@v0.19.3/mod.ts";

// Configuración de la base de datos
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
    }, 3, true);
    console.log("✅ Pool de BD configurado");
  } catch (e) {
    console.error("❌ Error configurando pool:", e);
  }
} else {
  console.log("⚠️ DATABASE_URL no configurada");
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const path = url.pathname;

  // Health check
  if (path === "/" || path === "/health") {
    return new Response(JSON.stringify({ 
      status: "ok", 
      database: pool ? "configurada" : "no configurada"
    }), { headers: corsHeaders });
  }

  if (!pool) {
    return new Response(JSON.stringify({ error: "Base de datos no configurada" }), { status: 500, headers: corsHeaders });
  }

  let client;

  try {
    client = await pool.connect();

    // 1. NUEVA RUTA: Listar versiones disponibles
    if (path === "/api/versions") {
      const result = await client.queryObject(`
        SELECT id, name, "fullName" FROM "BibleVersion" ORDER BY name
      `);
      return new Response(JSON.stringify(result.rows), { headers: corsHeaders });
    }

    // 2. RUTA MODIFICADA: Listar libros filtrados por versión
    // Ejemplo: /api/books?version=LBLA
    if (path === "/api/books") {
      const versionName = url.searchParams.get("version") || "RV60";
      const result = await client.queryObject(`
        SELECT b.id, b.name, b.testament, b."bookOrder" 
        FROM "Book" b
        JOIN "BibleVersion" v ON b."versionId" = v.id
        WHERE v.name = $1
        ORDER BY b."bookOrder"
      `, [versionName]);
      return new Response(JSON.stringify(result.rows), { headers: corsHeaders });
    }

    // GET /api/chapters?bookId=1
    if (path === "/api/chapters") {
      const bookId = url.searchParams.get("bookId");
      if (!bookId) {
        return new Response(JSON.stringify({ error: "bookId requerido" }), { status: 400, headers: corsHeaders });
      }
      const result = await client.queryObject(
        `SELECT id, number FROM "Chapter" WHERE "bookId" = $1 ORDER BY number`,
        [bookId]
      );
      return new Response(JSON.stringify(result.rows), { headers: corsHeaders });
    }

    // GET /api/verses?chapterId=1&verse=16
    if (path === "/api/verses") {
      const chapterId = url.searchParams.get("chapterId");
      const verse = url.searchParams.get("verse");
      
      if (!chapterId) {
        return new Response(JSON.stringify({ error: "chapterId requerido" }), { status: 400, headers: corsHeaders });
      }

      let query = `
        SELECT v.number, v.text, b.name as book, c.number as chapter
        FROM "Verse" v
        JOIN "Chapter" c ON v."chapterId" = c.id
        JOIN "Book" b ON c."bookId" = b.id
        WHERE c.id = $1
      `;
      const params: (string | number)[] = [chapterId];

      if (verse) {
        query += ` AND v.number = $2`;
        params.push(parseInt(verse));
      }

      query += ` ORDER BY v.number`;

      const result = await client.queryObject(query, params);
      return new Response(JSON.stringify(result.rows), { headers: corsHeaders });
    }

    return new Response(JSON.stringify({ error: "Ruta no encontrada" }), { status: 404, headers: corsHeaders });

  } catch (error) {
    console.error("❌ Error:", error);
    return new Response(JSON.stringify({ error: "Error de base de datos", details: String(error) }), { status: 500, headers: corsHeaders });
  } finally {
    if (client) client.release();
  }
});
