import { Application, Router } from "https://deno.land/x/oak@v12.6.1/mod.ts";
import { oakCors } from "https://deno.land/x/cors@v1.2.2/mod.ts";
import { prisma } from "./db.ts";

const router = new Router();

router.get("/api/versions", async (ctx) => {
  const versions = await prisma.bibleVersion.findMany({
    orderBy: { abbreviation: "asc" }
  });
  ctx.response.body = versions;
});

router.get("/api/books", async (ctx) => {
  const books = await prisma.book.findMany({
    orderBy: { canonicalOrder: "asc" }
  });
  ctx.response.body = books;
});

router.get("/api/books/:bookId/chapters", async (ctx) => {
  const bookId = parseInt(ctx.params.bookId);
  const chapters = await prisma.chapter.findMany({
    where: { bookId },
    orderBy: { chapterNumber: "asc" }
  });
  ctx.response.body = chapters;
});

router.get("/api/chapters/:chapterId/verses", async (ctx) => {
  const chapterId = parseInt(ctx.params.chapterId);
  const versionId = ctx.request.url.searchParams.get("version");

  const verses = await prisma.verse.findMany({
    where: {
      chapterId,
      ...(versionId && { versionId: parseInt(versionId) })
    },
    orderBy: { verseNumber: "asc" },
    include: { version: true }
  });

  ctx.response.body = verses;
});

router.get("/api/compare/chapter/:bookId/:chapterNum", async (ctx) => {
  const bookId = parseInt(ctx.params.bookId);
  const chapterNum = parseInt(ctx.params.chapterNum);
  const versionIds = ctx.request.url.searchParams
    .getAll("versions")
    .map(id => parseInt(id));

  const chapter = await prisma.chapter.findUnique({
    where: {
      bookId_chapterNumber: { bookId, chapterNumber: chapterNum }
    },
    include: { book: true }
  });

  if (!chapter) {
    ctx.response.status = 404;
    ctx.response.body = { error: "Capítulo no encontrado" };
    return;
  }

  const verses = await prisma.verse.findMany({
    where: {
      chapterId: chapter.id,
      ...(versionIds.length > 0 && { versionId: { in: versionIds } })
    },
    include: { version: true },
    orderBy: [{ verseNumber: "asc" }, { versionId: "asc" }]
  });

  const grouped: Record<number, any[]> = {};
  verses.forEach(verse => {
    if (!grouped[verse.verseNumber]) {
      grouped[verse.verseNumber] = [];
    }
    grouped[verse.verseNumber].push({
      version: verse.version.abbreviation,
      versionName: verse.version.name,
      text: verse.text
    });
  });

  ctx.response.body = {
    book: chapter.book.name,
    chapter: chapterNum,
    verses: grouped
  };
});

router.get("/api/stats", async (ctx) => {
  const versions = await prisma.bibleVersion.count();
  const books = await prisma.book.count();
  const verses = await prisma.verse.count();

  const versionsList = await prisma.bibleVersion.findMany({
    select: {
      abbreviation: true,
      name: true,
      _count: { select: { verses: true } }
    }
  });

  ctx.response.body = {
    totalVersions: versions,
    totalBooks: books,
    totalVerses: verses,
    versions: versionsList
  };
});

const app = new Application();
app.use(oakCors({ origin: "*" }));
app.use(router.routes());
app.use(router.allowedMethods());

console.log("🚀 Bible API running");
await app.listen({ port: 8000 });