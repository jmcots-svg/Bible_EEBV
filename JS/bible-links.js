// ============================================================
// bible-links.js
// Detecta y convierte referencias bíblicas en enlaces clicables
// Soporta: Español, Català, English
// ============================================================

// ── Diccionarios por idioma ──────────────────────────────────

const BOOK_MAPS = {

  es: {
    // Abreviaturas → Nombre completo
    "Gn":   "Génesis",      "Gén":  "Génesis",
    "Ex":   "Éxodo",        "Éx":   "Éxodo",
    "Lv":   "Levítico",     "Lev":  "Levítico",
    "Nm":   "Números",      "Núm":  "Números",
    "Dt":   "Deuteronomio", "Deu":  "Deuteronomio",
    "Jos":  "Josué",
    "Jue":  "Jueces",
    "Rt":   "Rut",
    "1 S":  "1 Samuel",     "1S":   "1 Samuel",
    "2 S":  "2 Samuel",     "2S":   "2 Samuel",
    "1 R":  "1 Reyes",      "1R":   "1 Reyes",
    "2 R":  "2 Reyes",      "2R":   "2 Reyes",
    "1 Cr": "1 Crónicas",   "1Cr":  "1 Crónicas",
    "2 Cr": "2 Crónicas",   "2Cr":  "2 Crónicas",
    "Esd":  "Esdras",
    "Neh":  "Nehemías",
    "Est":  "Ester",
    "Job":  "Job",
    "Sal":  "Salmos",       "Sl":   "Salmos",
    "Pr":   "Proverbios",   "Prov": "Proverbios",
    "Ec":   "Eclesiastés",  "Ecl":  "Eclesiastés",
    "Cnt":  "Cantares",     "Ct":   "Cantares",
    "Is":   "Isaías",
    "Jer":  "Jeremías",
    "Lm":   "Lamentaciones","Lam":  "Lamentaciones",
    "Ez":   "Ezequiel",
    "Dn":   "Daniel",
    "Os":   "Oseas",
    "Jl":   "Joel",
    "Am":   "Amós",
    "Abd":  "Abdías",
    "Jon":  "Jonás",
    "Mi":   "Miqueas",      "Miq":  "Miqueas",
    "Nah":  "Nahúm",
    "Hab":  "Habacuc",
    "Sof":  "Sofonías",
    "Hag":  "Hageo",
    "Zac":  "Zacarías",
    "Mal":  "Malaquías",
    // NT
    "Mt":   "Mateo",
    "Mr":   "Marcos",       "Mc":   "Marcos",
    "Lc":   "Lucas",
    "Jn":   "Juan",
    "Hch":  "Hechos",
    "Ro":   "Romanos",      "Rom":  "Romanos",
    "1 Co": "1 Corintios",  "1Co":  "1 Corintios",
    "2 Co": "2 Corintios",  "2Co":  "2 Corintios",
    "Gá":   "Gálatas",      "Gl":   "Gálatas",  "Gal": "Gálatas",
    "Ef":   "Efesios",
    "Fil":  "Filipenses",   "Flp":  "Filipenses",
    "Col":  "Colosenses",
    "1 Ts": "1 Tesalonicenses", "1Ts": "1 Tesalonicenses",
    "2 Ts": "2 Tesalonicenses", "2Ts": "2 Tesalonicenses",
    "1 Tes":"1 Tesalonicenses", "2 Tes":"2 Tesalonicenses",
    "1 Ti": "1 Timoteo",    "1Ti":  "1 Timoteo",
    "2 Ti": "2 Timoteo",    "2Ti":  "2 Timoteo",
    "Tit":  "Tito",         "Tt":   "Tito",
    "Flm":  "Filemón",
    "He":   "Hebreos",      "Heb":  "Hebreos",
    "Stg":  "Santiago",     "Sant": "Santiago",
    "1 P":  "1 Pedro",      "1P":   "1 Pedro",  "1Pe": "1 Pedro",
    "2 P":  "2 Pedro",      "2P":   "2 Pedro",  "2Pe": "2 Pedro",
    "1 Jn": "1 Juan",       "1Jn":  "1 Juan",
    "2 Jn": "2 Juan",       "2Jn":  "2 Juan",
    "3 Jn": "3 Juan",       "3Jn":  "3 Juan",
    "Jud":  "Judas",
    "Ap":   "Apocalipsis",  "Apoc": "Apocalipsis",
  },

  ca: {
    "Gn":   "Gènesi",       "Gén":  "Gènesi",
    "Ex":   "Èxode",
    "Lv":   "Levític",
    "Nm":   "Nombres",
    "Dt":   "Deuteronomi",
    "Jos":  "Josuè",
    "Jut":  "Jutges",
    "Rt":   "Rut",
    "1Sa":  "1 Samuel",     "1 Sa": "1 Samuel",
    "2Sa":  "2 Samuel",     "2 Sa": "2 Samuel",
    "1Re":  "1 Reis",       "1 Re": "1 Reis",
    "2Re":  "2 Reis",       "2 Re": "2 Reis",
    "1Cr":  "1 Cròniques",  "1 Cr": "1 Cròniques",
    "2Cr":  "2 Cròniques",  "2 Cr": "2 Cròniques",
    "Esd":  "Esdres",
    "Ne":   "Nehemies",
    "Est":  "Ester",
    "Job":  "Job",
    "Sal":  "Salms",
    "Pr":   "Proverbis",    "Prov": "Proverbis",
    "Ecl":  "Eclesiastès",
    "Ct":   "Càntic",
    "Is":   "Isaïes",
    "Jr":   "Jeremies",
    "Lm":   "Lamentacions",
    "Ez":   "Ezequiel",
    "Dn":   "Daniel",
    "Os":   "Osees",
    "Jl":   "Joel",
    "Am":   "Amós",
    "Abd":  "Abdies",
    "Jon":  "Jonàs",
    "Mi":   "Miquees",
    "Na":   "Nahum",
    "Hab":  "Habacuc",
    "Sof":  "Sofonies",
    "Ag":   "Ageu",
    "Za":   "Zacaries",
    "Ml":   "Malaquies",
    "Mt":   "Mateu",
    "Mc":   "Marc",
    "Lc":   "Lluc",
    "Jn":   "Joan",
    "Ac":   "Fets",         "Fet":  "Fets",
    "Rm":   "Romans",       "Rom":  "Romans",
    "1Co":  "1 Corintis",   "1 Co": "1 Corintis",
    "2Co":  "2 Corintis",   "2 Co": "2 Corintis",
    "Ga":   "Gàlates",
    "Ef":   "Efesis",
    "Fl":   "Filipencs",
    "Col":  "Colossencs",
    "1Te":  "1 Tessalonicencs", "1 Te": "1 Tessalonicencs",
    "2Te":  "2 Tessalonicencs", "2 Te": "2 Tessalonicencs",
    "1Ti":  "1 Timoteu",    "1 Ti": "1 Timoteu",
    "2Ti":  "2 Timoteu",    "2 Ti": "2 Timoteu",
    "Tit":  "Titus",
    "Flm":  "Filèmon",
    "He":   "Hebreus",
    "Jm":   "Jaume",
    "1Pe":  "1 Pere",       "1 Pe": "1 Pere",
    "2Pe":  "2 Pere",       "2 Pe": "2 Pere",
    "1Jn":  "1 Joan",       "1 Jn": "1 Joan",
    "2Jn":  "2 Joan",       "2 Jn": "2 Joan",
    "3Jn":  "3 Joan",       "3 Jn": "3 Joan",
    "Jud":  "Judes",
    "Ap":   "Apocalipsi",
  },

  en: {
    "Ge":   "Genesis",      "Gen":  "Genesis",
    "Ex":   "Exodus",       "Exo":  "Exodus",
    "Le":   "Leviticus",    "Lev":  "Leviticus",
    "Nu":   "Numbers",      "Num":  "Numbers",
    "De":   "Deuteronomy",  "Deu":  "Deuteronomy", "Dt": "Deuteronomy",
    "Jos":  "Joshua",
    "Jdg":  "Judges",       "Jug":  "Judges",
    "Ru":   "Ruth",         "Rut":  "Ruth",
    "1Sa":  "1 Samuel",     "1 Sa": "1 Samuel",     "1Sam": "1 Samuel",
    "2Sa":  "2 Samuel",     "2 Sa": "2 Samuel",     "2Sam": "2 Samuel",
    "1Ki":  "1 Kings",      "1 Ki": "1 Kings",
    "2Ki":  "2 Kings",      "2 Ki": "2 Kings",
    "1Ch":  "1 Chronicles", "1 Ch": "1 Chronicles",
    "2Ch":  "2 Chronicles", "2 Ch": "2 Chronicles",
    "Ezr":  "Ezra",
    "Ne":   "Nehemiah",     "Neh":  "Nehemiah",
    "Est":  "Esther",
    "Job":  "Job",
    "Ps":   "Psalms",       "Psa":  "Psalms",
    "Pr":   "Proverbs",     "Pro":  "Proverbs",     "Prov": "Proverbs",
    "Ec":   "Ecclesiastes", "Ecc":  "Ecclesiastes",
    "So":   "Song of Solomon",
    "Is":   "Isaiah",       "Isa":  "Isaiah",
    "Je":   "Jeremiah",     "Jer":  "Jeremiah",
    "La":   "Lamentations", "Lam":  "Lamentations",
    "Eze":  "Ezekiel",      "Ez":   "Ezekiel",
    "Da":   "Daniel",       "Dan":  "Daniel",
    "Ho":   "Hosea",        "Hos":  "Hosea",
    "Joe":  "Joel",
    "Am":   "Amos",
    "Ob":   "Obadiah",
    "Jon":  "Jonah",
    "Mi":   "Micah",        "Mic":  "Micah",
    "Na":   "Nahum",
    "Hab":  "Habakkuk",
    "Zep":  "Zephaniah",
    "Hag":  "Haggai",
    "Zec":  "Zechariah",
    "Mal":  "Malachi",
    // NT
    "Mt":   "Matthew",      "Mat":  "Matthew",
    "Mk":   "Mark",         "Mar":  "Mark",
    "Lk":   "Luke",         "Lu":   "Luke",
    "Jn":   "John",         "Jo":   "John",
    "Ac":   "Acts",         "Act":  "Acts",
    "Ro":   "Romans",       "Rom":  "Romans",
    "1Co":  "1 Corinthians","1 Co": "1 Corinthians",
    "2Co":  "2 Corinthians","2 Co": "2 Corinthians",
    "Ga":   "Galatians",    "Gal":  "Galatians",
    "Eph":  "Ephesians",    "Ef":   "Ephesians",
    "Php":  "Philippians",  "Phil": "Philippians",
    "Col":  "Colossians",
    "1Th":  "1 Thessalonians","1 Th": "1 Thessalonians",
    "2Th":  "2 Thessalonians","2 Th": "2 Thessalonians",
    "1Ti":  "1 Timothy",    "1 Ti": "1 Timothy",    "1Tim": "1 Timothy",
    "2Ti":  "2 Timothy",    "2 Ti": "2 Timothy",    "2Tim": "2 Timothy",
    "Tit":  "Titus",
    "Phm":  "Philemon",
    "He":   "Hebrews",      "Heb":  "Hebrews",
    "Jas":  "James",
    "1Pe":  "1 Peter",      "1 Pe": "1 Peter",      "1Pet": "1 Peter",
    "2Pe":  "2 Peter",      "2 Pe": "2 Peter",      "2Pet": "2 Peter",
    "1Jn":  "1 John",       "1 Jn": "1 John",
    "2Jn":  "2 John",       "2 Jn": "2 John",
    "3Jn":  "3 John",       "3 Jn": "3 John",
    "Jude": "Jude",
    "Re":   "Revelation",   "Rev":  "Revelation",
  }

};

// ── Nombres completos (para reconocer cuando vienen escritos enteros) ───

const FULL_NAMES = {
  es: [
    "Génesis","Éxodo","Levítico","Números","Deuteronomio","Josué","Jueces","Rut",
    "1 Samuel","2 Samuel","1 Reyes","2 Reyes","1 Crónicas","2 Crónicas",
    "Esdras","Nehemías","Ester","Job","Salmos","Proverbios","Eclesiastés",
    "Cantares","Isaías","Jeremías","Lamentaciones","Ezequiel","Daniel",
    "Oseas","Joel","Amós","Abdías","Jonás","Miqueas","Nahúm","Habacuc",
    "Sofonías","Hageo","Zacarías","Malaquías",
    "Mateo","Marcos","Lucas","Juan","Hechos","Romanos",
    "1 Corintios","2 Corintios","Gálatas","Efesios","Filipenses","Colosenses",
    "1 Tesalonicenses","2 Tesalonicenses","1 Timoteo","2 Timoteo","Tito",
    "Filemón","Hebreos","Santiago","1 Pedro","2 Pedro",
    "1 Juan","2 Juan","3 Juan","Judas","Apocalipsis"
  ],
  ca: [
    "Gènesi","Èxode","Levític","Nombres","Deuteronomi","Josuè","Jutges","Rut",
    "1 Samuel","2 Samuel","1 Reis","2 Reis","1 Cròniques","2 Cròniques",
    "Esdres","Nehemies","Ester","Job","Salms","Proverbis","Eclesiastès",
    "Càntic","Isaïes","Jeremies","Lamentacions","Ezequiel","Daniel",
    "Osees","Joel","Amós","Abdies","Jonàs","Miquees","Nahum","Habacuc",
    "Sofonies","Ageu","Zacaries","Malaquies",
    "Mateu","Marc","Lluc","Joan","Fets","Romans",
    "1 Corintis","2 Corintis","Gàlates","Efesis","Filipencs","Colossencs",
    "1 Tessalonicencs","2 Tessalonicencs","1 Timoteu","2 Timoteu","Titus",
    "Filèmon","Hebreus","Jaume","1 Pere","2 Pere",
    "1 Joan","2 Joan","3 Joan","Judes","Apocalipsi"
  ],
  en: [
    "Genesis","Exodus","Leviticus","Numbers","Deuteronomy","Joshua","Judges","Ruth",
    "1 Samuel","2 Samuel","1 Kings","2 Kings","1 Chronicles","2 Chronicles",
    "Ezra","Nehemiah","Esther","Job","Psalms","Proverbs","Ecclesiastes",
    "Song of Solomon","Isaiah","Jeremiah","Lamentations","Ezekiel","Daniel",
    "Hosea","Joel","Amos","Obadiah","Jonah","Micah","Nahum","Habakkuk",
    "Zephaniah","Haggai","Zechariah","Malachi",
    "Matthew","Mark","Luke","John","Acts","Romans",
    "1 Corinthians","2 Corinthians","Galatians","Ephesians","Philippians","Colossians",
    "1 Thessalonians","2 Thessalonians","1 Timothy","2 Timothy","Titus",
    "Philemon","Hebrews","James","1 Peter","2 Peter",
    "1 John","2 John","3 John","Jude","Revelation"
  ]
};


// ── Función principal ─────────────────────────────────────────

/**
 * Recibe texto HTML (o plano) y devuelve HTML con referencias clicables.
 * @param {string} text   - Texto con posibles referencias bíblicas
 * @param {string} lang   - 'es' | 'ca' | 'en'
 * @returns {string}      - HTML con <a class="bible-ref"> insertados
 */
export function linkBibleReferences(text, lang = 'es') {
    if (!text) return text;

    const bookMap  = BOOK_MAPS[lang]  || BOOK_MAPS['es'];
    const fullList = FULL_NAMES[lang] || FULL_NAMES['es'];

    // Construimos un patrón con todos los nombres conocidos
    // Ordenados de más largo a más corto para evitar conflictos
    const allNames = [
        ...fullList,
        ...Object.keys(bookMap)
    ].sort((a, b) => b.length - a.length);

    // Escapamos caracteres especiales del regex
    const escaped = allNames.map(n => escapeRegex(n)).join('|');

    /*
     * El patrón detecta:
     *  - Génesis 12:8; 26:25        → dos referencias del mismo libro
     *  - Hebreos 9:22; 11:4         → dos referencias del mismo libro
     *  - 1Co 16:1,2                 → versículos múltiples (coma)
     *  - Lucas 15:28-32             → rango de versículos
     *  - 2Pe 2                      → solo capítulo
     *  - Mateo 26:53,54             → versículos múltiples
     */
    const refPattern = new RegExp(
        `(${escaped})\\s+(\\d+)(?::(\\d+(?:[,\\-]\\d+)*))?` +
        `(?:\\s*;\\s*(\\d+)(?::(\\d+(?:[,\\-]\\d+)*))?)?`,
        'g'
    );

    return text.replace(refPattern, (match, bookRaw, ch1, v1, ch2, v2) => {

        // Resolver nombre completo
        const book = bookMap[bookRaw] || bookRaw;

        // Referencia 1
        const link1 = buildLink(book, ch1, v1, match);

        // Referencia 2 (si existe, ej: "Gén 12:8; 26:25")
        if (ch2) {
            // El texto visible se divide
            const label2 = v2 ? `${ch2}:${v2}` : ch2;
            const link2  = buildLink(book, ch2, v2, label2);
            // Texto visible: "Génesis 12:8; 26:25"
            return `${buildLink(book, ch1, v1, `${bookRaw} ${ch1}${v1 ? ':' + v1 : ''}`)}; ${link2}`;
        }

        return link1;
    });
}


// ── Helpers privados ─────────────────────────────────────────

function buildLink(book, chapter, verse, label) {
    const dataVerse = verse ? ` data-verse="${verse}"` : '';
    return `<a href="#" class="bible-ref" ` +
               `data-book="${encodeURIComponent(book)}" ` +
               `data-chapter="${chapter}"` +
               `${dataVerse}>${label}</a>`;
}

function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}


// ── Listener global de clicks ────────────────────────────────

/**
 * Llama a initBibleLinks() UNA sola vez al arrancar la app.
 * Pasa un callback que recibe (book, chapter, verse).
 */
export function initBibleLinks(onRefClick) {
    document.addEventListener('click', function (e) {
        const link = e.target.closest('.bible-ref');
        if (!link) return;

        e.preventDefault();
        e.stopPropagation();

        const book    = decodeURIComponent(link.dataset.book);
        const chapter = parseInt(link.dataset.chapter);
        const verse   = link.dataset.verse ? link.dataset.verse : null;

        if (typeof onRefClick === 'function') {
            onRefClick(book, chapter, verse);
        }
    });
}
