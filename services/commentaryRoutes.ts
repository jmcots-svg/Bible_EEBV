import { Pool } from "npm:@neondatabase/serverless";
import { translateCommentaryOnTheFly } from "./translator.ts";

type MakeHeadersFn = (cacheControl?: string) => Headers;

export async function handleCommentaryRoutes(
  path: string,
  req: Request,
  url: URL,
  pool: Pool,
  makeHeaders: MakeHeadersFn
): Promise<Response | null> {

  if (path === "/api/commentary/sources") {
    const bookOrder = Number(url.searchParams.get("bookOrder"));
    const chapter = Number(url.searchParams.get("chapter"));
    const verse = url.searchParams.get("verse");
    const language = url.searchParams.get("language") || "en";

    if (!bookOrder || !chapter) {
      return new Response(
        JSON.stringify({ error: "Parámetros requeridos: bookOrder, chapter" }),
        { status: 400, headers: makeHeaders("no-store") }
      );
    }

    if (language === "en") {
      const params: any[] = [bookOrder, chapter];
      let query = "SELECT DISTINCT cs.id, cs.name, cs.\"fullName\", cs.author, cs.description,"
        + " COUNT(ce.id) as entry_count"
        + " FROM \"CommentarySource\" cs"
        + " JOIN \"CommentaryEntry\" ce ON ce.\"sourceId\" = cs.id"
        + " WHERE ce.\"bookOrder\" = \$1"
        + " AND ce.chapter = \$2"
        + " AND ce.language = 'en'";

      if (verse) {
        query += " AND (ce.\"verseStart\" IS NULL"
          + " OR (ce.\"verseStart\" <= \$3 AND (ce.\"verseEnd\" IS NULL OR ce.\"verseEnd\" >= \$3)))";
        params.push(Number(verse));
      }

      query += " GROUP BY cs.id, cs.name, cs.\"fullName\", cs.author, cs.description"
        + " ORDER BY cs.name ASC";

      const { rows } = await pool.query(query, params);
      return new Response(JSON.stringify(rows), {
        headers: makeHeaders("public, max-age=3600"),
      });
    }

    const params: any[] = [bookOrder, chapter, language];

    let verseCondition = "";
    if (verse) {
      verseCondition = " AND (ce.\"verseStart\" IS NULL"
        + " OR (ce.\"verseStart\" <= \$4 AND (ce.\"verseEnd\" IS NULL OR ce.\"verseEnd\" >= \$4)))";
      params.push(Number(verse));
    }

    const query = "WITH english_entries AS ("
      + "  SELECT ce.\"sourceId\", COUNT(*) as en_count"
      + "  FROM \"CommentaryEntry\" ce"
      + "  WHERE ce.\"bookOrder\" = \$1"
      + "  AND ce.chapter = \$2"
      + "  AND ce.language = 'en'"
      + verseCondition
      + "  GROUP BY ce.\"sourceId\""
      + "),"
      + "translated_entries AS ("
      + "  SELECT ce.\"sourceId\", COUNT(*) as trans_count"
      + "  FROM \"CommentaryEntry\" ce"
      + "  WHERE ce.\"bookOrder\" = \$1"
      + "  AND ce.chapter = \$2"
      + "  AND ce.language = \$3"
      + verseCondition
      + "  GROUP BY ce.\"sourceId\""
      + ")"
      + " SELECT"
      + "  cs.id, cs.name, cs.\"fullName\", cs.author, cs.description,"
      + "  COALESCE(ee.en_count, 0) as english_count,"
      + "  COALESCE(te.trans_count, 0) as translated_count,"
      + "  GREATEST(COALESCE(ee.en_count, 0), COALESCE(te.trans_count, 0)) as entry_count,"
      + "  CASE WHEN COALESCE(te.trans_count, 0) < COALESCE(ee.en_count, 0) THEN true ELSE false END as \"needsTranslation\""
      + " FROM \"CommentarySource\" cs"
      + " LEFT JOIN english_entries ee ON ee.\"sourceId\" = cs.id"
      + " LEFT JOIN translated_entries te ON te.\"sourceId\" = cs.id"
      + " WHERE COALESCE(ee.en_count, 0) > 0 OR COALESCE(te.trans_count, 0) > 0"
      + " ORDER BY cs.name ASC";

    const { rows } = await pool.query(query, params);
    return new Response(JSON.stringify(rows), {
      headers: makeHeaders("public, max-age=3600"),
    });
  }

  if (path === "/api/commentary") {
    const bookOrder = Number(url.searchParams.get("bookOrder"));
    const chapter = Number(url.searchParams.get("chapter"));
    const verse = url.searchParams.get("verse");
    const sourceId = url.searchParams.get("sourceId");
    const language = url.searchParams.get("language") || "en";

    if (!bookOrder || !chapter) {
      return new Response(
        JSON.stringify({ error: "Parámetros requeridos: bookOrder, chapter" }),
        { status: 400, headers: makeHeaders("no-store") }
      );
    }

    if (language === "en") {
      const params: any[] = [bookOrder, chapter];
      let paramIndex = 3;

      let query = "SELECT ce.id, ce.title, ce.content, ce.\"contentHtml\","
        + " ce.\"verseStart\", ce.\"verseEnd\", ce.\"sectionType\", ce.\"divId\","
        + " cs.name as source_name, cs.\"fullName\" as source_full_name, cs.author,"
        + " false as \"needsTranslation\""
        + " FROM \"CommentaryEntry\" ce"
        + " JOIN \"CommentarySource\" cs ON ce.\"sourceId\" = cs.id"
        + " WHERE ce.\"bookOrder\" = \$1"
        + " AND ce.chapter = \$2"
        + " AND ce.language = 'en'";

      if (sourceId) {
        query += " AND cs.id = $" + paramIndex;
        params.push(Number(sourceId));
        paramIndex++;
      }

      if (verse) {
        query += " AND ce.\"verseStart\" IS NOT NULL"
          + " AND ce.\"verseStart\" <= $" + paramIndex
          + " AND (ce.\"verseEnd\" IS NULL OR ce.\"verseEnd\" >= $" + (paramIndex + 1) + ")";
        params.push(Number(verse), Number(verse));
        paramIndex += 2;
      }

      query += " ORDER BY ce.\"verseStart\" NULLS FIRST, ce.id";

      const { rows } = await pool.query(query, params);
      return new Response(
        JSON.stringify({
          bookOrder,
          chapter,
          verse: verse ? Number(verse) : null,
          total: rows.length,
          entries: rows,
        }),
        { headers: makeHeaders("public, max-age=86400") }
      );
    }

    const params: any[] = [bookOrder, chapter, language];
    let paramIndex = 4;

    let query = "SELECT"
      + " ce_en.id as \"englishId\","
      + " ce_lang.id as \"translatedId\","
      + " COALESCE(ce_lang.title, ce_en.title) as title,"
      + " COALESCE(ce_lang.content, ce_en.content) as content,"
      + " COALESCE(ce_lang.\"contentHtml\", ce_en.\"contentHtml\") as \"contentHtml\","
      + " ce_en.\"verseStart\","
      + " ce_en.\"verseEnd\","
      + " ce_en.\"sectionType\","
      + " ce_en.\"divId\","
      + " cs.name as source_name,"
      + " cs.\"fullName\" as source_full_name,"
      + " cs.author,"
      + " CASE WHEN ce_lang.id IS NULL THEN true ELSE false END as \"needsTranslation\""
      + " FROM \"CommentaryEntry\" ce_en"
      + " JOIN \"CommentarySource\" cs ON ce_en.\"sourceId\" = cs.id"
      + " LEFT JOIN \"CommentaryEntry\" ce_lang"
      + "   ON ce_lang.\"sourceId\" = ce_en.\"sourceId\""
      + "   AND ce_lang.\"bookOrder\" = ce_en.\"bookOrder\""
      + "   AND ce_lang.chapter = ce_en.chapter"
      + "   AND ce_lang.language = \$3"
      + "   AND COALESCE(ce_lang.\"divId\", '') = COALESCE(ce_en.\"divId\", '')"
      + " WHERE ce_en.\"bookOrder\" = \$1"
      + " AND ce_en.chapter = \$2"
      + " AND ce_en.language = 'en'";

    if (sourceId) {
      query += " AND cs.id = $" + paramIndex;
      params.push(Number(sourceId));
      paramIndex++;
    }

    if (verse) {
      query += " AND ce_en.\"verseStart\" IS NOT NULL"
        + " AND ce_en.\"verseStart\" <= $" + paramIndex
        + " AND (ce_en.\"verseEnd\" IS NULL OR ce_en.\"verseEnd\" >= $" + (paramIndex + 1) + ")";
      params.push(Number(verse), Number(verse));
      paramIndex += 2;
    }

    query += " ORDER BY ce_en.\"verseStart\" NULLS FIRST, ce_en.id";

    const { rows } = await pool.query(query, params);

    const entries = rows.map((row: any) => ({
      id: row.translatedId || row.englishId,
      englishId: row.englishId,
      title: row.title,
      content: row.content,
      contentHtml: row.contentHtml,
      verseStart: row.verseStart,
      verseEnd: row.verseEnd,
      sectionType: row.sectionType,
      divId: row.divId,
      source_name: row.source_name,
      source_full_name: row.source_full_name,
      author: row.author,
      needsTranslation: row.needsTranslation,
    }));

    return new Response(
      JSON.stringify({
        bookOrder,
        chapter,
        verse: verse ? Number(verse) : null,
        language,
        total: entries.length,
        entries,
      }),
      { headers: makeHeaders("public, max-age=86400") }
    );
  }

  if (path === "/api/translate-commentary" && req.method === "POST") {
    try {
      const body = await req.json();
      const { sourceId, divId, targetLang } = body;

      if (!sourceId || !divId || !targetLang) {
        return new Response(
          JSON.stringify({ error: "Parámetros requeridos: sourceId, divId, targetLang" }),
          { status: 400, headers: makeHeaders("no-store") }
        );
      }

      const { rows: existing } = await pool.query(
        "SELECT * FROM \"CommentaryEntry\" WHERE \"sourceId\" = \$1 AND \"divId\" = \$2 AND language = \$3 LIMIT 1",
        [sourceId, divId, targetLang]
      );

      if (existing.length > 0) {
        return new Response(
          JSON.stringify({ entry: existing[0], cached: true, saved: true }),
          { headers: makeHeaders("no-store") }
        );
      }

      const { rows: englishRows } = await pool.query(
        "SELECT * FROM \"CommentaryEntry\" WHERE \"sourceId\" = \$1 AND \"divId\" = \$2 AND language = 'en' LIMIT 1",
        [sourceId, divId]
      );

      if (englishRows.length === 0) {
        return new Response(
          JSON.stringify({ error: "Entrada en inglés no encontrada" }),
          { status: 404, headers: makeHeaders("no-store") }
        );
      }

      const englishEntry = englishRows[0];
      const result = await translateCommentaryOnTheFly(englishEntry, targetLang);

      if (!result.success || !result.entry) {
        return new Response(
          JSON.stringify({ error: result.error || "Traducción falló" }),
          { status: 500, headers: makeHeaders("no-store") }
        );
      }

      const entry = result.entry;
      const { rows: inserted } = await pool.query(
        "INSERT INTO \"CommentaryEntry\" (\"sourceId\", language, \"bookAbbr\", \"bookOrder\", chapter, \"verseStart\", \"verseEnd\", title, content, \"contentHtml\", \"divId\", \"sectionType\", volume) VALUES (\$1, \$2, \$3, \$4, \$5, \$6, \$7, \$8, \$9, \$10, \$11, \$12, \$13) RETURNING *",
        [
          entry.sourceId,
          entry.language,
          entry.bookAbbr,
          entry.bookOrder,
          entry.chapter,
          entry.verseStart,
          entry.verseEnd,
          entry.title,
          entry.content,
          entry.contentHtml,
          entry.divId,
          entry.sectionType,
          entry.volume,
        ]
      );

      return new Response(
        JSON.stringify({
          entry: inserted[0],
          cached: false,
          saved: true,
          method: result.method,
        }),
        { headers: makeHeaders("no-store") }
      );
    } catch (error: unknown) {
      const err = error as { message?: string };
      console.error("[translate-commentary] Error:", err.message);
      return new Response(
        JSON.stringify({ error: err.message }),
        { status: 500, headers: makeHeaders("no-store") }
      );
    }
  }

  return null;
}
