const { PrismaClient } = require("@prisma/client");
const fs = require("fs");
const path = require("path");
const { XMLParser } = require("fast-xml-parser");

const prisma = new PrismaClient();

// ============================================
// CLI ARGS
// ============================================

function parseCliArgs() {
  const args = process.argv.slice(2);
  const parsed = {};
  let dryRun = false;

  for (const arg of args) {
    if (arg === "--dryRun") {
      dryRun = true;
      continue;
    }
    const match = arg.match(/^--(\w+)=(.*)$/);
    if (match) {
      parsed[match[1]] = match[2];
    }
  }

  const required = ["file", "sourceName", "sourceFullName", "author", "language"];
  for (const key of required) {
    if (!parsed[key]) {
      console.error(`❌ Falta argumento requerido: --${key}`);
      process.exit(1);
    }
  }

  return {
    file: parsed.file,
    sourceName: parsed.sourceName.toUpperCase(),
    sourceFullName: parsed.sourceFullName,
    author: parsed.author,
    language: parsed.language,
    description: parsed.description || "",
    publishedYear: parsed.publishedYear || "",
    volumes: parseInt(parsed.volumes || "1", 10),
    dryRun,
  };
}

// ============================================
// MAPEO LIBROS → OSIS
// ============================================

const BOOK_NAME_TO_OSIS = {
  "genesis": { osisAbbr: "Gen", bookOrder: 1 },
  "exodus": { osisAbbr: "Exod", bookOrder: 2 },
  "leviticus": { osisAbbr: "Lev", bookOrder: 3 },
  "numbers": { osisAbbr: "Num", bookOrder: 4 },
  "deuteronomy": { osisAbbr: "Deut", bookOrder: 5 },
  "joshua": { osisAbbr: "Josh", bookOrder: 6 },
  "judges": { osisAbbr: "Judg", bookOrder: 7 },
  "ruth": { osisAbbr: "Ruth", bookOrder: 8 },
  "1 samuel": { osisAbbr: "1Sam", bookOrder: 9 },
  "2 samuel": { osisAbbr: "2Sam", bookOrder: 10 },
  "1 kings": { osisAbbr: "1Kgs", bookOrder: 11 },
  "2 kings": { osisAbbr: "2Kgs", bookOrder: 12 },
  "1 chronicles": { osisAbbr: "1Chr", bookOrder: 13 },
  "2 chronicles": { osisAbbr: "2Chr", bookOrder: 14 },
  "ezra": { osisAbbr: "Ezra", bookOrder: 15 },
  "nehemiah": { osisAbbr: "Neh", bookOrder: 16 },
  "esther": { osisAbbr: "Esth", bookOrder: 17 },
  "job": { osisAbbr: "Job", bookOrder: 18 },
  "psalms": { osisAbbr: "Ps", bookOrder: 19 },
  "psalm": { osisAbbr: "Ps", bookOrder: 19 },
  "proverbs": { osisAbbr: "Prov", bookOrder: 20 },
  "ecclesiastes": { osisAbbr: "Eccl", bookOrder: 21 },
  "song of solomon": { osisAbbr: "Song", bookOrder: 22 },
  "isaiah": { osisAbbr: "Isa", bookOrder: 23 },
  "jeremiah": { osisAbbr: "Jer", bookOrder: 24 },
  "lamentations": { osisAbbr: "Lam", bookOrder: 25 },
  "ezekiel": { osisAbbr: "Ezek", bookOrder: 26 },
  "daniel": { osisAbbr: "Dan", bookOrder: 27 },
  "hosea": { osisAbbr: "Hos", bookOrder: 28 },
  "joel": { osisAbbr: "Joel", bookOrder: 29 },
  "amos": { osisAbbr: "Amos", bookOrder: 30 },
  "obadiah": { osisAbbr: "Obad", bookOrder: 31 },
  "jonah": { osisAbbr: "Jonah", bookOrder: 32 },
  "micah": { osisAbbr: "Mic", bookOrder: 33 },
  "nahum": { osisAbbr: "Nah", bookOrder: 34 },
  "habakkuk": { osisAbbr: "Hab", bookOrder: 35 },
  "zephaniah": { osisAbbr: "Zeph", bookOrder: 36 },
  "haggai": { osisAbbr: "Hag", bookOrder: 37 },
  "zechariah": { osisAbbr: "Zech", bookOrder: 38 },
  "malachi": { osisAbbr: "Mal", bookOrder: 39 },
  "matthew": { osisAbbr: "Matt", bookOrder: 40 },
  "mark": { osisAbbr: "Mark", bookOrder: 41 },
  "luke": { osisAbbr: "Luke", bookOrder: 42 },
  "john": { osisAbbr: "John", bookOrder: 43 },
  "acts": { osisAbbr: "Acts", bookOrder: 44 },
  "romans": { osisAbbr: "Rom", bookOrder: 45 },
  "1 corinthians": { osisAbbr: "1Cor", bookOrder: 46 },
  "2 corinthians": { osisAbbr: "2Cor", bookOrder: 47 },
  "galatians": { osisAbbr: "Gal", bookOrder: 48 },
  "ephesians": { osisAbbr: "Eph", bookOrder: 49 },
  "philippians": { osisAbbr: "Phil", bookOrder: 50 },
  "colossians": { osisAbbr: "Col", bookOrder: 51 },
  "1 thessalonians": { osisAbbr: "1Thess", bookOrder: 52 },
  "2 thessalonians": { osisAbbr: "2Thess", bookOrder: 53 },
  "1 timothy": { osisAbbr: "1Tim", bookOrder: 54 },
  "2 timothy": { osisAbbr: "2Tim", bookOrder: 55 },
  "titus": { osisAbbr: "Titus", bookOrder: 56 },
  "philemon": { osisAbbr: "Phlm", bookOrder: 57 },
  "hebrews": { osisAbbr: "Heb", bookOrder: 58 },
  "james": { osisAbbr: "Jas", bookOrder: 59 },
  "1 peter": { osisAbbr: "1Pet", bookOrder: 60 },
  "2 peter": { osisAbbr: "2Pet", bookOrder: 61 },
  "1 john": { osisAbbr: "1John", bookOrder: 62 },
  "2 john": { osisAbbr: "2John", bookOrder: 63 },
  "3 john": { osisAbbr: "3John", bookOrder: 64 },
  "jude": { osisAbbr: "Jude", bookOrder: 65 },
  "revelation": { osisAbbr: "Rev", bookOrder: 66 },
  "revelations": { osisAbbr: "Rev", bookOrder: 66 },
};

// ============================================
// PARSING DE REFERENCIA
// ============================================

function parseRef(ref) {
  if (ref.startsWith("[")) return null;

  const match = ref.match(
    /^(\d?\s?[A-Za-z\s]+?)\s+(\d+):(\d+)(?:\s*-\s*(\d+))?$/
  );

  if (!match) return null;

  const bookName = match[1].trim().toLowerCase();
  const chapter = parseInt(match[2], 10);
  const verseStart = parseInt(match[3], 10);
  const verseEnd = match[4] ? parseInt(match[4], 10) : null;

  const bookInfo = BOOK_NAME_TO_OSIS[bookName];
  if (!bookInfo) return null;

  return {
    bookName: match[1].trim(),
    osisAbbr: bookInfo.osisAbbr,
    bookOrder: bookInfo.bookOrder,
    chapter,
    verseStart: verseStart === 0 ? null : verseStart,
    verseEnd: verseEnd === 0 ? null : verseEnd,
  };
}

// ============================================
// LIMPIEZA OSIS → HTML
// ============================================

function decodeHtmlEntities(text) {
  return text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function resolveHiTags(html) {
  const tagMap = {
    "⟨STRONG⟩": { open: "<strong>", close: "</strong>" },
    "⟨EM⟩": { open: "<em>", close: "</em>" },
    "⟨SUB⟩": { open: "<sub>", close: "</sub>" },
    "⟨SUP⟩": { open: "<sup>", close: "</sup>" },
    "⟨U⟩": { open: "<u>", close: "</u>" },
    "⟨SPAN⟩": { open: "<span>", close: "</span>" },
  };

  const markers = Object.keys(tagMap);
  const stack = [];
  let result = "";
  let i = 0;

  while (i < html.length) {
    let foundMarker = false;
    for (const marker of markers) {
      if (html.substring(i, i + marker.length) === marker) {
        stack.push(marker);
        result += tagMap[marker].open;
        i += marker.length;
        foundMarker = true;
        break;
      }
    }
    if (foundMarker) continue;

    if (html.substring(i, i + 5) === "</hi>") {
      const lastMarker = stack.pop();
      if (lastMarker && tagMap[lastMarker]) {
        result += tagMap[lastMarker].close;
      } else {
        result += "</span>";
      }
      i += 5;
      continue;
    }

    result += html[i];
    i++;
  }

  return result;
}

function osisToHtml(raw) {
  let html = decodeHtmlEntities(raw);

  html = html.replace(/<milestone[^>]*\/>/g, "");

  html = html.replace(/<div\s+sID="[^"]*"\s+type="x-p"\s*\/>/g, "<p>");
  html = html.replace(/<div\s+eID="[^"]*"\s+type="x-p"\s*\/>/g, "</p>");

  html = html.replace(/<div\s+sID="[^"]*"\s+type="paragraph"\s*\/>/g, "<p>");
  html = html.replace(/<div\s+eID="[^"]*"\s+type="paragraph"\s*\/>/g, "</p>");

  html = html.replace(/<div\s+[^>]*(?:sID|eID)="[^"]*"[^>]*\/?>/g, "");

  html = html.replace(/<hi\s+type="bold">/g, "⟨STRONG⟩");
  html = html.replace(/<hi\s+type="italic">/g, "⟨EM⟩");
  html = html.replace(/<hi\s+type="sub">/g, "⟨SUB⟩");
  html = html.replace(/<hi\s+type="super">/g, "⟨SUP⟩");
  html = html.replace(/<hi\s+type="underline">/g, "⟨U⟩");
  html = html.replace(/<hi\s+type="[^"]*">/g, "⟨SPAN⟩");

  html = resolveHiTags(html);

  html = html.replace(/<lb\s*\/>/g, "<br/>");

  html = html.replace(
    /<foreign\s+xml:lang="([^"]+)">/g,
    '<span lang="\$1" class="foreign">'
  );
  html = html.replace(/<\/foreign>/g, "</span>");

  html = html.replace(
    /<reference\s+osisRef="(?:Bible:)?([^"]+)">/g,
    '<a class="scripture-ref" data-osis="\$1">'
  );
  html = html.replace(/<\/reference>/g, "</a>");

  html = html.replace(/<note(?:\s+n="([^"]*)")?>/g, (_, n) =>
    `<span class="footnote"${n ? ` data-note="${n}"` : ""}>`
  );
  html = html.replace(/<\/note>/g, "</span>");

  html = html.replace(/<title(?:\s+type="[^"]*")?>/g, "<h3>");
  html = html.replace(/<\/title>/g, "</h3>");

  html = html.replace(/<list>/g, "<ul>");
  html = html.replace(/<\/list>/g, "</ul>");
  html = html.replace(/<item>/g, "<li>");
  html = html.replace(/<\/item>/g, "</li>");
  html = html.replace(/<label>[^<]*<\/label>/g, "");

  html = html.replace(/<row>/g, "<tr>");
  html = html.replace(/<\/row>/g, "</tr>");
  html = html.replace(/<cell>/g, "<td>");
  html = html.replace(/<\/cell>/g, "</td>");

  html = html.replace(
    /<figure\s+alt="([^"]*)"[^>]*src="([^"]*)"[^>]*\/>/g,
    '<img alt="\$1" src="\$2"/>'
  );

  html = html.replace(/<div\s+annotateRef="[^"]*"\s+annotateType="[^"]*"[^>]*\/?>/g, "");
  html = html.replace(/<div\s+[^>]*\/?>/g, "");
  html = html.replace(/<\/div>/g, "");

  html = html.replace(/\s+/g, " ").trim();
  html = html.replace(/<p>\s*<\/p>/g, "");

  return html;
}

function htmlToPlainText(html) {
  let text = html;
  text = text.replace(/<br\s*\/?>/g, "\n");
  text = text.replace(/<\/p>/g, "\n\n");
  text = text.replace(/<\/h3>/g, "\n\n");
  text = text.replace(/<\/li>/g, "\n");
  text = text.replace(/<\/tr>/g, "\n");
  text = text.replace(/<[^>]+>/g, "");
  text = text.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"');
  text = text.replace(/[ \t]+/g, " ");
  text = text.replace(/\n{3,}/g, "\n\n");
  return text.trim();
}

// ============================================
// FILTRADO Y DETECCIÓN
// ============================================

function shouldSkipEntry(ref, content) {
  if (ref.startsWith("[")) return true;
  const decoded = decodeHtmlEntities(content);
  if (decoded.includes("No Commentary on these verses is yet included")) return true;
  return false;
}

function detectSectionType(parsedRef, content) {
  if (parsedRef.chapter === 0) return "preface";
  const decoded = decodeHtmlEntities(content);
  if (
    decoded.includes("Translator's Preface") ||
    decoded.includes("AUTHOR'S EPISTLE DEDICATORY") ||
    (decoded.includes("COMMENTARIES") && decoded.includes("VOLUME FIRST"))
  ) {
    return "preface";
  }
  return "commentary";
}

function extractTitle(html) {
  const match = html.match(/<h3>([^<]+)<\/h3>/);
  return match ? match[1].trim() : null;
}

// ============================================
// PARSEO XML
// ============================================

function parseCommentaryXml(filePath) {
  const xml = fs.readFileSync(filePath, "utf-8");
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    textNodeName: "#text",
    isArray: (name) => name === "entry",
    trimValues: false,
  });
  const parsed = parser.parse(xml);
  if (!parsed?.commentary?.entry) {
    throw new Error(`No se encontraron entries en ${filePath}`);
  }
  return parsed.commentary.entry;
}

// ============================================
// VERIFICACIÓN PREVIA (DRY RUN)
// ============================================

async function verifyBeforeSeed(args, entries) {
  console.log("\n═══════════════════════════════════════════");
  console.log("🔍 VERIFICACIÓN PREVIA");
  console.log("═══════════════════════════════════════════");

  const existingSource = await prisma.commentarySource.findUnique({
    where: { name: args.sourceName },
  });

  if (existingSource) {
    console.log(`\n⚠️  CommentarySource "${args.sourceName}" ya existe:`);
    console.log(`   ID:     ${existingSource.id}`);
    console.log(`   Nombre: ${existingSource.fullName}`);
    console.log(`   Autor:  ${existingSource.author}`);

    if (existingSource.author !== args.author) {
      console.log(`\n❌ CONFLICTO DE AUTOR:`);
      console.log(`   Existente: "${existingSource.author}"`);
      console.log(`   Nuevo:     "${args.author}"`);
      console.log(`   ⚠️  Se actualizará si procedes.`);
    }

    if (existingSource.fullName !== args.sourceFullName) {
      console.log(`\n⚠️  CAMBIO DE NOMBRE:`);
      console.log(`   Existente: "${existingSource.fullName}"`);
      console.log(`   Nuevo:     "${args.sourceFullName}"`);
    }

    const existingCount = await prisma.commentaryEntry.count({
      where: { sourceId: existingSource.id, language: args.language },
    });

    if (existingCount > 0) {
      console.log(
        `\n⚠️  Ya existen ${existingCount} entries para ${args.sourceName} (${args.language}).`
      );
      console.log(`   Se ELIMINARÁN antes de insertar los nuevos.`);
    }
  } else {
    console.log(`\n✅ CommentarySource "${args.sourceName}" es nuevo. Se creará.`);
  }

  const books = new Set(entries.map((e) => e.ref.osisAbbr));
  const types = entries.reduce((acc, e) => {
    acc[e.sectionType] = (acc[e.sectionType] || 0) + 1;
    return acc;
  }, {});

  console.log("\n📊 ESTADÍSTICAS DEL ARCHIVO:");
  console.log(`   Total entries válidos: ${entries.length}`);
  console.log(`   Libros cubiertos:      ${books.size}`);
  console.log(`   Libros:                ${[...books].join(", ")}`);
  console.log(`   Por tipo:`);
  for (const [type, count] of Object.entries(types)) {
    console.log(`     - ${type}: ${count}`);
  }

  console.log("\n📝 MUESTRA DE ENTRIES (primeros 5):");
  const sample = entries.slice(0, 5);
  for (const entry of sample) {
    const preview = entry.content.substring(0, 100).replace(/\n/g, " ");
    console.log(
      `   ${entry.ref.osisAbbr} ${entry.ref.chapter}:${entry.ref.verseStart ?? "0"} [${entry.sectionType}]`
    );
    if (entry.title) console.log(`     Título: "${entry.title}"`);
    console.log(`     "${preview}..."`);
  }

  console.log("\n🔗 VERIFICACIÓN DE LIBROS EN DB:");
  let allBooksValid = true;
  for (const bookAbbr of books) {
    const found = await prisma.bookAbbreviation.findFirst({
      where: { osisAbbr: bookAbbr },
    });
    if (found) {
      console.log(`   ✅ ${bookAbbr} → encontrado (order: ${found.bookOrder})`);
    } else {
      console.log(`   ❌ ${bookAbbr} → NO encontrado en BookAbbreviation`);
      allBooksValid = false;
    }
  }

  if (!allBooksValid) {
    console.log("\n⚠️  Algunos libros no tienen entrada en BookAbbreviation.");
    console.log("   Los comentarios se insertarán igual, pero la vinculación podría fallar.");
  }

  console.log("\n═══════════════════════════════════════════");
  console.log("📋 RESUMEN DE LA OPERACIÓN:");
  console.log(`   Fuente:    ${args.sourceName} — "${args.sourceFullName}"`);
  console.log(`   Autor:     ${args.author}`);
  console.log(`   Idioma:    ${args.language}`);
  console.log(`   Entries:   ${entries.length}`);
  console.log(`   Libros:    ${books.size}`);
  console.log(`   Dry Run:   ${args.dryRun}`);
  console.log("═══════════════════════════════════════════");

  if (args.dryRun) {
    console.log("\n🏁 DRY RUN completado. No se insertó nada en la DB.");
    console.log('   Para insertar, ejecuta de nuevo con dryRun = false.\n');
    return false;
  }

  return true;
}

// ============================================
// SEED PRINCIPAL
// ============================================

async function seedCommentary(args) {
  console.log("═══════════════════════════════════════════");
  console.log("📖 SEED: Comentario Bíblico");
  console.log("═══════════════════════════════════════════");

  const filePath = path.resolve(args.file);
  if (!fs.existsSync(filePath)) {
    console.error(`❌ Archivo no encontrado: ${filePath}`);
    process.exit(1);
  }
  console.log(`📄 Archivo: ${filePath}`);

  console.log("⏳ Parseando XML...");
  const rawEntries = parseCommentaryXml(filePath);
  console.log(`   Total entries en XML: ${rawEntries.length}`);

  console.log("⏳ Procesando entries...");
  const entries = [];
  let skipped = 0;
  let parseErrors = 0;
  const warnings = [];

  for (const raw of rawEntries) {
    const ref = raw["@_ref"];
    const content = raw["#text"] || "";

    if (!content.trim() || shouldSkipEntry(ref, content)) {
      skipped++;
      continue;
    }

    const parsedRef = parseRef(ref);
    if (!parsedRef) {
      if (!ref.startsWith("[")) {
        warnings.push(`No se pudo parsear: "${ref}"`);
      }
      parseErrors++;
      continue;
    }

    const contentHtml = osisToHtml(content);
    const contentText = htmlToPlainText(contentHtml);

    if (contentText.trim().length < 20) {
      skipped++;
      continue;
    }

    const sectionType = detectSectionType(parsedRef, content);
    const title = extractTitle(contentHtml);

    const divId = [
      args.sourceName,
      args.language,
      parsedRef.osisAbbr,
      parsedRef.chapter,
      parsedRef.verseStart ?? 0,
    ].join("-");

    entries.push({
      ref: parsedRef,
      title,
      content: contentText,
      contentHtml,
      divId,
      sectionType,
      volume: 1,
    });
  }

  console.log(`   ✅ Válidos:  ${entries.length}`);
  console.log(`   ⏭️  Saltados: ${skipped}`);
  console.log(`   ⚠️  Errores:  ${parseErrors}`);

  if (warnings.length > 0) {
    console.log(`\n   ⚠️  Warnings (primeros 10):`);
    warnings.slice(0, 10).forEach((w) => console.log(`      - ${w}`));
  }

  if (entries.length === 0) {
    console.error("❌ No hay entries válidos. Abortando.");
    process.exit(1);
  }

  const shouldProceed = await verifyBeforeSeed(args, entries);
  if (!shouldProceed) {
    process.exit(0);
  }

  console.log("\n⏳ Creando/actualizando CommentarySource...");
  const source = await prisma.commentarySource.upsert({
    where: { name: args.sourceName },
    update: {
      fullName: args.sourceFullName,
      author: args.author,
      description: args.description,
      publishedYear: args.publishedYear,
      volumes: args.volumes,
    },
    create: {
      name: args.sourceName,
      fullName: args.sourceFullName,
      author: args.author,
      description: args.description,
      publishedYear: args.publishedYear,
      volumes: args.volumes,
      isPublicDomain: true,
    },
  });
  console.log(`   ✅ Source ID: ${source.id}`);

  const deleted = await prisma.commentaryEntry.deleteMany({
    where: { sourceId: source.id, language: args.language },
  });
  console.log(`   🗑️  Anteriores eliminados: ${deleted.count}`);

  console.log("\n⏳ Insertando entries...");
  const BATCH_SIZE = 100;
  let inserted = 0;

  for (let i = 0; i < entries.length; i += BATCH_SIZE) {
    const batch = entries.slice(i, i + BATCH_SIZE);

    await prisma.commentaryEntry.createMany({
      data: batch.map((entry) => ({
        sourceId: source.id,
        language: args.language,
        bookAbbr: entry.ref.osisAbbr,
        bookOrder: entry.ref.bookOrder,
        chapter: entry.ref.chapter,
        verseStart: entry.ref.verseStart,
        verseEnd: entry.ref.verseEnd,
        title: entry.title,
        content: entry.content,
        contentHtml: entry.contentHtml,
        divId: entry.divId,
        sectionType: entry.sectionType,
        volume: entry.volume,
      })),
      skipDuplicates: true,
    });

    inserted += batch.length;
    if (inserted % 500 === 0 || inserted === entries.length) {
      console.log(`   📝 ${inserted}/${entries.length}`);
    }
  }

  const finalCount = await prisma.commentaryEntry.count({
    where: { sourceId: source.id, language: args.language },
  });

  const bookCoverage = await prisma.commentaryEntry.groupBy({
    by: ["bookAbbr"],
    where: { sourceId: source.id, language: args.language },
    _count: { id: true },
    orderBy: { bookAbbr: "asc" },
  });

  console.log("\n═══════════════════════════════════════════");
  console.log("✅ SEED COMPLETADO");
  console.log("═══════════════════════════════════════════");
  console.log(`   Fuente:        ${args.sourceName} (ID: ${source.id})`);
  console.log(`   Nombre:        ${args.sourceFullName}`);
  console.log(`   Autor:         ${args.author}`);
  console.log(`   Idioma:        ${args.language}`);
  console.log(`   Insertados:    ${inserted}`);
  console.log(`   En DB ahora:   ${finalCount}`);
  console.log(`   Libros:`);
  for (const book of bookCoverage) {
    console.log(`     - ${book.bookAbbr}: ${book._count.id} entries`);
  }
  console.log("═══════════════════════════════════════════\n");
}

// ============================================
// EJECUCIÓN
// ============================================

const args = parseCliArgs();

seedCommentary(args)
  .catch((e) => {
    console.error("❌ Error fatal:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
