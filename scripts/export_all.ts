import { Pool } from "npm:@neondatabase/serverless";

const pool = new Pool({
  connectionString: Deno.env.get("DATABASE_URL"),
});

console.log("🚀 Iniciando exportación masiva de todos los comentarios...");

try {
  // 1. Obtenemos qué autores e idiomas hay en la DB
  const { rows: combos } = await pool.query(`
    SELECT DISTINCT s.id, s.name, e.language
    FROM "CommentaryEntry" e
    JOIN "CommentarySource" s ON e."sourceId" = s.id
  `);

  if (combos.length === 0) {
    console.log("No hay comentarios en la base de datos para exportar.");
    Deno.exit(0);
  }

  // 2. Por cada autor e idioma, creamos un archivo JSON
  for (const combo of combos) {
    console.log(`\n⏳ Exportando ${combo.name} en idioma '${combo.language}'...`);
    
    const { rows } = await pool.query(`
       SELECT "bookAbbr", "bookOrder", chapter, "verseStart", "verseEnd", title, content, "divId", "sectionType", volume
       FROM "CommentaryEntry"
       WHERE "sourceId" = \$1 AND language = \$2
       ORDER BY "bookOrder", chapter, "verseStart"
    `, [combo.id, combo.language]);

    // El nombre del archivo será ej: calvin_es.json, mhc_en.json
    const fileName = `${combo.name.toLowerCase()}_${combo.language}.json`;
    
    await Deno.writeTextFile(fileName, JSON.stringify(rows, null, 2));
    console.log(`✅ Creado: ${fileName} (${rows.length} registros).`);
  }

  console.log("\n🎉 ¡TODAS LAS EXPORTACIONES FINALIZADAS!");
} catch (error) {
  console.error("❌ Error:", error);
} finally {
  Deno.exit(0);
}
