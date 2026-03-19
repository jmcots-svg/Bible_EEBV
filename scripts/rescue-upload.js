// scripts/rescue-upload.js
// Se ejecuta SIEMPRE al final del workflow.
// Busca ficheros *_tmp_{lang}.json en data/commentaries/{lang}/
// y los sube a Supabase como {abbr}_{lang}.json (versión usable).
// Si el script principal ya los borró (traducción completa), no hace nada.

const { createClient } = require("@supabase/supabase-js");
const fs   = require("fs");
const path = require("path");

const SUPABASE_URL         = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const TARGET_LANG          = process.env.TARGET_LANG || "ca";
const BUCKET_NAME          = "Commentaries";

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("❌ Faltan variables de entorno");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const DATA_DIR = path.join(process.cwd(), "data", "commentaries", TARGET_LANG);

// ── Buscar todos los tmp del idioma ──────────────────────────────
function findTmpFiles() {
  if (!fs.existsSync(DATA_DIR)) return [];

  return fs.readdirSync(DATA_DIR)
    .filter(name => name.match(new RegExp(`_tmp_${TARGET_LANG}\\.json$`)))
    .map(name => ({
      tmpName:   name,
      tmpPath:   path.join(DATA_DIR, name),
      // luther_tmp_ca.json → luther_ca.json
      finalName: name.replace(`_tmp_${TARGET_LANG}`, `_${TARGET_LANG}`),
    }));
}

async function uploadToStorage(filename, payload) {
  const blob = new Blob(
    [JSON.stringify(payload, null, 2)],
    { type: "application/json" }
  );
  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(filename, blob, { contentType: "application/json", upsert: true });

  if (error) {
    console.error(`  ❌ Upload fallido (${filename}): ${error.message}`);
    return false;
  }
  return true;
}

async function main() {
  console.log(`\n🚨 Rescue upload — idioma: ${TARGET_LANG}`);
  console.log(`   Buscando tmp en: ${DATA_DIR}\n`);

  const tmpFiles = findTmpFiles();

  if (tmpFiles.length === 0) {
    console.log("   ✅ No hay ficheros tmp. Nada que hacer.");
    return;
  }

  console.log(`   📋 Ficheros tmp encontrados: ${tmpFiles.length}`);

  for (const { tmpName, tmpPath, finalName } of tmpFiles) {
    let data;
    try {
      data = JSON.parse(fs.readFileSync(tmpPath, "utf8"));
    } catch (e) {
      console.error(`   ⚠️  No se pudo leer ${tmpName}: ${e.message}`);
      continue;
    }

    const entries = Array.isArray(data) ? data.length : "?";
    process.stdout.write(
      `   🚀 ${tmpName} (${entries} entradas) → ${finalName} en Supabase...`
    );

    const ok = await uploadToStorage(finalName, data);
    console.log(ok ? " ✅" : " ❌");
  }

  console.log("\n   🏁 Rescue upload completado.");
}

main().catch(err => {
  console.error("❌ Error en rescue-upload:", err);
  // No hacer process.exit(1) para no marcar el step como fallido
  // si el script principal ya terminó bien
});
