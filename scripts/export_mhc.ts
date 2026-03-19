import { Pool } from "npm:@neondatabase/serverless";

// Asegúrate de que tu variable de entorno DATABASE_URL esté disponible
// Si no lo está en la terminal, reemplaza Deno.env.get(...) por tu URL real de Supabase temporalmente entre comillas
const pool = new Pool({
  connectionString: Deno.env.get("DATABASE_URL"),
});

console.log("Iniciando exportación de MHC en Español...");

try {
  // 1. Obtener el ID de MHC
  const { rows: sourceRows } = await pool.query(
    `SELECT id FROM "CommentarySource" WHERE name = 'MHC'`
  );
  
  if (sourceRows.length === 0) {
    console.error("No se encontró la fuente MHC");
    Deno.exit(1);
  }
  const mhcId = sourceRows[0].id;

  // 2. Extraer todos los comentarios en español
  const { rows } = await pool.query(
    `SELECT "bookAbbr", "bookOrder", chapter, "verseStart", "verseEnd", title, content
     FROM "CommentaryEntry"
     WHERE "sourceId" = \$1 AND language = 'es'
     ORDER BY "bookOrder", chapter, "verseStart"`,
    [mhcId]
  );

  console.log(`Se encontraron ${rows.length} registros. Escribiendo archivo JSON...`);

  // 3. Crear el archivo JSON en tu proyecto
  await Deno.writeTextFile("mhc_es.json", JSON.stringify(rows, null, 2));

  console.log("✅ ¡Éxito! El archivo mhc_es.json ha sido creado en tu proyecto.");
} catch (error) {
  console.error("❌ Error durante la exportación:", error);
} finally {
  Deno.exit(0);
}
