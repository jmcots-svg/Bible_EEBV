// scripts/rescue-upload.js
// Versión sin dependencias externas — usa https nativo de Node.js
// Se ejecuta SIEMPRE al final del workflow (if: always())

const fs    = require("fs");
const path  = require("path");
const https = require("https");

const SUPABASE_URL         = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const TARGET_LANG          = process.env.TARGET_LANG || "ca";
const BUCKET_NAME          = "Commentaries";

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("❌ Faltan variables de entorno");
  process.exit(0); // exit 0 para no romper el workflow
}

const DATA_DIR = path.join(process.cwd(), "data", "commentaries", TARGET_LANG);

// ── Upload directo a Supabase Storage via REST API ───────────────
function uploadToStorage(filename, jsonContent) {
  return new Promise((resolve) => {
    // Supabase Storage REST endpoint
    const urlPath = `/storage/v1/object/${BUCKET_NAME}/${filename}`;
    const host    = SUPABASE_URL.replace("https://", "").replace("http://", "");
    const body    = Buffer.from(JSON.stringify(jsonContent, null, 2), "utf8");

    const options = {
      hostname: host,
      path:     urlPath,
      method:   "POST",         // POST con upsert header = crear o sobreescribir
      headers: {
        "Authorization":  `Bearer ${SUPABASE_SERVICE_KEY}`,
        "Content-Type":   "application/json",
        "Content-Length": body.length,
        "x-upsert":       "true",   // sobreescribe si existe
      },
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ ok: true });
        } else {
          resolve({ ok: false, status: res.statusCode, body: data });
        }
      });
    });

    req.on("error", (e) => resolve({ ok: false, error: e.message }));
    req.write(body);
    req.end();
  });
}

// ── Buscar tmp files ─────────────────────────────────────────────
function findTmpFiles() {
  if (!fs.existsSync(DATA_DIR)) {
    console.log(`   📁 No existe el directorio: ${DATA_DIR}`);
    return [];
  }

  return fs.readdirSync(DATA_DIR)
    .filter(name => name.match(new RegExp(`_tmp_${TARGET_LANG}\\.json$`)))
    .map(name => ({
      tmpName:   name,
      tmpPath:   path.join(DATA_DIR, name),
      finalName: name.replace(`_tmp_${TARGET_LANG}`, `_${TARGET_LANG}`),
    }));
}

async function main() {
  console.log(`\n🚨 Rescue upload — idioma: ${TARGET_LANG}`);
  console.log(`   Directorio: ${DATA_DIR}\n`);

  const tmpFiles = findTmpFiles();

  if (tmpFiles.length === 0) {
    console.log("   ✅ No hay ficheros tmp. Nada que hacer.");
    return;
  }

  console.log(`   📋 Ficheros tmp encontrados: ${tmpFiles.length}\n`);

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
      `   🚀 ${tmpName} → ${finalName} (${entries} entradas)...`
    );

    const result = await uploadToStorage(finalName, data);

    if (result.ok) {
      console.log(" ✅");
    } else {
      console.log(` ❌ (${result.status || result.error})`);
      if (result.body) console.log(`      ${result.body}`);
    }
  }

  console.log("\n   🏁 Rescue upload completado.");
}

main().catch(err => {
  // Nunca lanzar exit(1) — este script no debe romper el workflow
  console.error("❌ Error en rescue-upload:", err.message);
  process.exit(0);
});
