import { serve } from "https://deno.land/std@0.220.0/http/server.ts";
import { Pool } from "https://deno.land/x/postgres@v0.19.3/mod.ts";

// Conexión a la base de datos (Deno Deploy inyecta DATABASE_URL automáticamente)
const pool = new Pool(Deno.env.get("DATABASE_URL")!, 3, true);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json",
};

async function handler(req: Request): Promise<Response> {
  // Manejar preflight CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const path = url.pathname;

  const client = await pool.connect();

  try {
    // GET /api/books - Lista de libros
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

    // GET /api/verses?chapterId=1&verse=16 (verse opcional)
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

    // Ruta raíz - health check
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

    // 404
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
    client.release();
  }
}

console.log("🚀 API Biblia corriendo en puerto 8000");
serve(handler, { port: 8000 });