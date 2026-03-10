import { serve } from "https://deno.land/std@0.220.0/http/server.ts";
import { Pool } from "https://deno.land/x/postgres@v0.19.3/mod.ts";

// Obtener URL de la base de datos
const databaseUrl = Deno.env.get("DATABASE_URL");

if (!databaseUrl) {
  console.error("❌ ERROR: DATABASE_URL no está configurada");
  Deno.exit(1);
}

const pool = new Pool(databaseUrl, 3, true);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json",
};

async function handler(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const path = url.pathname;

  let client;
  
  try {
    client = await pool.connect();

    // GET /api/books
    if (path === "/api/books") {
      const result = await client.queryObject(`
        SELECT id, name, testament, "bookOrder" 
        FROM "Book" 
        ORDER BY "bookOrder"
      `);
      return new Response(JSON.stringify(result.rows), { headers: corsHeaders });
    }

    // GET /api/chapters?bookId=1
    if (path === "/api/chapters") {
      const bookId = url.searchParams.get("bookId");
      if (!bookId) {
        return new Response(
          JSON.stringify({ error: "bookId requerido" }), 
          { status: 400, headers: corsHeaders }
        );
      }
      const result = await client.queryObject(
        `SELECT id, number FROM "Chapter" WHERE "bookId" = \$1 ORDER BY number`,
        [bookId]
      );
      return new Response(JSON.stringify(result.rows), { headers: corsHeaders });
    }

    // GET /api/verses?chapterId=1&verse=16
    if (path === "/api/verses") {
      const chapterId = url.searchParams.get("chapterId");
      const verse = url.searchParams.get("verse");
      
      if (!chapterId) {
        return new Response(
          JSON.stringify({ error: "chapterId requerido" }), 
          { status: 400, headers: corsHeaders }
        );
      }

      let query = `
        SELECT v.number, v.text, b.name as book, c.number as chapter
        FROM "Verse" v
        JOIN "Chapter" c ON v."chapterId" = c.id
        JOIN "Book" b ON c."bookId" = b.id
        WHERE c.id = \$1
      `;
      const params: (string | number)[] = [chapterId];

      if (verse) {
        query += ` AND v.number = \$2`;
        params.push(parseInt(verse));
      }

      query += ` ORDER BY v.number`;

      const result = await client.queryObject(query, params);
      return new Response(JSON.stringify(result.rows), { headers: corsHeaders });
    }

    // Health check
    if (path === "/" || path === "/api") {
      return new Response(
        JSON.stringify({ 
          status: "ok", 
          message: "API Biblia RV60",
          endpoints: ["/api/books", "/api/chapters?bookId=", "/api/verses?chapterId="]
        }), 
        { headers: corsHeaders }
      );
    }

    return new Response(
      JSON.stringify({ error: "Ruta no encontrada" }), 
      { status: 404, headers: corsHeaders }
    );

  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: "Error interno del servidor" }), 
      { status: 500, headers: corsHeaders }
    );
  } finally {
    if (client) {
      client.release();
    }
  }
}

console.log("🚀 API Biblia corriendo");
serve(handler, { port: 8000 });