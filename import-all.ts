import { parse } from "https://deno.land/x/xml@2.1.1/mod.ts";
import { prisma } from "./db.ts";

interface VersionConfig {
  xmlPath: string;
  name: string;
  abbreviation: string;
  languageCode: string;
  languageName: string;
  year?: number;
}

const VERSIONS: VersionConfig[] = [
  {
    xmlPath: "./data/RVR60.xml",
    name: "Reina Valera 1960",
    abbreviation: "RVR1960",
    languageCode: "es",
    languageName: "Español",
    year: 1960
  }
  // Aquí agregarás más versiones en el futuro
];

async function importVersion(config: VersionConfig) {
  console.log(`\n📥 Importando: ${config.name}`);
  console.log("━".repeat(50));

  try {
    let version = await prisma.bibleVersion.findUnique({
      where: { abbreviation: config.abbreviation }
    });

    if (version) {
      console.log(`✅ ${config.abbreviation} ya existe, omitiendo...`);
      return { success: true, skipped: true };
    }

    version = await prisma.bibleVersion.create({
      data: {
        name: config.name,
        abbreviation: config.abbreviation,
        languageCode: config.languageCode,
        languageName: config.languageName,
        year: config.year
      }
    });

    console.log(`📖 Leyendo: ${config.xmlPath}`);
    const xmlContent = await Deno.readTextFile(config.xmlPath);
    const parsed = parse(xmlContent);

    const books = extractBooksFromXML(parsed);
    console.log(`📚 Libros: ${books.length}`);

    let totalVerses = 0;

    for (let i = 0; i < books.length; i++) {
      const bookData = books[i];

      let book = await prisma.book.findUnique({
        where: { name: bookData.name }
      });

      if (!book) {
        book = await prisma.book.create({
          data: {
            name: bookData.name,
            abbreviation: bookData.abbreviation,
            canonicalOrder: i + 1,
            testament: i < 39 ? "old" : "new"
          }
        });
      }

      for (const chapterData of bookData.chapters) {
        let chapter = await prisma.chapter.findUnique({
          where: {
            bookId_chapterNumber: {
              bookId: book.id,
              chapterNumber: chapterData.number
            }
          }
        });

        if (!chapter) {
          chapter = await prisma.chapter.create({
            data: {
              bookId: book.id,
              chapterNumber: chapterData.number
            }
          });
        }

        const versesToCreate = chapterData.verses.map(v => ({
          chapterId: chapter.id,
          verseNumber: v.number,
          versionId: version.id,
          text: v.text
        }));

        await prisma.verse.createMany({
          data: versesToCreate,
          skipDuplicates: true
        });

        totalVerses += versesToCreate.length;
      }

      if ((i + 1) % 10 === 0) {
        console.log(`   ${i + 1}/${books.length} libros...`);
      }
    }

    console.log(`✅ ${totalVerses} versículos importados`);
    return { success: true, verses: totalVerses };

  } catch (error) {
    console.error(`❌ Error:`, error);
    return { success: false, error };
  }
}

function extractBooksFromXML(parsed: any) {
  const books = [];
  const xmlBooks = parsed.bible?.book || parsed.XMLBIBLE?.BIBLEBOOK || [];

  for (const xmlBook of xmlBooks) {
    const bookName = xmlBook["@name"] || xmlBook["@bname"];
    const bookAbbr = xmlBook["@abbr"] || xmlBook["@bsname"];
    const chapters = [];

    const xmlChapters = Array.isArray(xmlBook.chapter)
      ? xmlBook.chapter
      : [xmlBook.chapter];

    for (const xmlChapter of xmlChapters) {
      if (!xmlChapter) continue;

      const chapterNum = parseInt(xmlChapter["@number"] || "1");
      const verses = [];

      const xmlVerses = Array.isArray(xmlChapter.verse)
        ? xmlChapter.verse
        : [xmlChapter.verse];

      for (const xmlVerse of xmlVerses) {
        if (!xmlVerse) continue;

        verses.push({
          number: parseInt(xmlVerse["@number"] || "1"),
          text: (xmlVerse["#text"] || xmlVerse._ || xmlVerse).toString().trim()
        });
      }

      chapters.push({
        number: chapterNum,
        verses: verses.sort((a, b) => a.number - b.number)
      });
    }

    books.push({
      name: bookName,
      abbreviation: bookAbbr,
      chapters: chapters.sort((a, b) => a.number - b.number)
    });
  }

  return books;
}

async function importAll() {
  console.log("🚀 IMPORTANDO VERSIONES");
  
  for (const version of VERSIONS) {
    await importVersion(version);
  }

  await prisma.$disconnect();
  console.log("\n✅ PROCESO COMPLETADO");
}

if (import.meta.main) {
  await importAll();
}