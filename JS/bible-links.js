// ============================================================
// bible-links.js
// ============================================================

const BOOK_MAPS = {
  es: {
    // Pentateuco
    "Gn": "Génesis", "Gén": "Génesis", "Génesis": "Génesis",
    "Ex": "Éxodo", "Éx": "Éxodo", "Éxodo": "Éxodo",
    "Lv": "Levítico", "Lev": "Levítico", "Levítico": "Levítico",
    "Nm": "Números", "Núm": "Números", "Números": "Números",
    "Dt": "Deuteronomio", "Deu": "Deuteronomio", "Deuteronomio": "Deuteronomio",
    // Históricos
    "Jos": "Josué", "Josué": "Josué",
    "Jue": "Jueces", "Jueces": "Jueces",
    "Rt": "Rut", "Rut": "Rut",
    "1 S": "1 Samuel", "1S": "1 Samuel", "1 Samuel": "1 Samuel",
    "2 S": "2 Samuel", "2S": "2 Samuel", "2 Samuel": "2 Samuel",
    "1 R": "1 Reyes", "1R": "1 Reyes", "1 Reyes": "1 Reyes",
    "2 R": "2 Reyes", "2R": "2 Reyes", "2 Reyes": "2 Reyes",
    "1 Cr": "1 Crónicas", "1Cr": "1 Crónicas", "1 Crónicas": "1 Crónicas",
    "2 Cr": "2 Crónicas", "2Cr": "2 Crónicas", "2 Crónicas": "2 Crónicas",
    "Esd": "Esdras", "Esdras": "Esdras",
    "Neh": "Nehemías", "Nehemías": "Nehemías",
    "Est": "Ester", "Ester": "Ester",
    // Poéticos
    "Job": "Job",
    "Sal": "Salmos", "Sl": "Salmos", "Salmo": "Salmos", "Salmos": "Salmos",
    "Pr": "Proverbios", "Prov": "Proverbios", "Proverbios": "Proverbios",
    "Ec": "Eclesiastés", "Ecl": "Eclesiastés", "Eclesiastés": "Eclesiastés",
    "Cnt": "Cantares", "Ct": "Cantares", "Cantares": "Cantares",
    // Profetas mayores
    "Is": "Isaías", "Isaías": "Isaías",
    "Jer": "Jeremías", "Jeremías": "Jeremías",
    "Lm": "Lamentaciones", "Lam": "Lamentaciones", "Lamentaciones": "Lamentaciones",
    "Ez": "Ezequiel", "Ezequiel": "Ezequiel",
    "Dn": "Daniel", "Dan": "Daniel", "Daniel": "Daniel",
    // Profetas menores
    "Os": "Oseas", "Oseas": "Oseas",
    "Jl": "Joel", "Joel": "Joel",
    "Am": "Amós", "Amós": "Amós",
    "Abd": "Abdías", "Abdías": "Abdías",
    "Jon": "Jonás", "Jonás": "Jonás",
    "Mi": "Miqueas", "Miq": "Miqueas", "Miqueas": "Miqueas",
    "Nah": "Nahúm", "Nahúm": "Nahúm",
    "Hab": "Habacuc", "Habacuc": "Habacuc",
    "Sof": "Sofonías", "Sofonías": "Sofonías",
    "Hag": "Hageo", "Hageo": "Hageo",
    "Zac": "Zacarías", "Zacarías": "Zacarías",
    "Mal": "Malaquías", "Malaquías": "Malaquías",
    // NT
    "Mt": "Mateo", "Mateo": "Mateo",
    "Mr": "Marcos", "Mc": "Marcos", "Marcos": "Marcos",
    "Lc": "Lucas", "Lucas": "Lucas",
    "Jn": "Juan", "Juan": "Juan",
    "Hch": "Hechos", "Hechos": "Hechos",
    "Ro": "Romanos", "Rom": "Romanos", "Romanos": "Romanos",
    "1 Co": "1 Corintios", "1Co": "1 Corintios", "1 Corintios": "1 Corintios",
    "2 Co": "2 Corintios", "2Co": "2 Corintios", "2 Corintios": "2 Corintios",
    "Gá": "Gálatas", "Gál": "Gálatas", "Gl": "Gálatas", "Gal": "Gálatas", "Gálatas": "Gálatas",
    "Ef": "Efesios", "Efesios": "Efesios",
    "Fil": "Filipenses", "Flp": "Filipenses", "Filipenses": "Filipenses",
    "Col": "Colosenses", "Colosenses": "Colosenses",
    "1 Ts": "1 Tesalonicenses", "1Ts": "1 Tesalonicenses",
    "2 Ts": "2 Tesalonicenses", "2Ts": "2 Tesalonicenses",
    "1 Tes": "1 Tesalonicenses", "1Tes": "1 Tesalonicenses", "1 Tesalonicenses": "1 Tesalonicenses",
    "2 Tes": "2 Tesalonicenses", "2Tes": "2 Tesalonicenses", "2 Tesalonicenses": "2 Tesalonicenses",
    "1 Ti": "1 Timoteo", "1Ti": "1 Timoteo", "1 Timoteo": "1 Timoteo",
    "2 Ti": "2 Timoteo", "2Ti": "2 Timoteo", "2 Timoteo": "2 Timoteo",
    "Tit": "Tito", "Tt": "Tito", "Tito": "Tito",
    "Flm": "Filemón", "Filemón": "Filemón",
    "He": "Hebreos", "Heb": "Hebreos", "Hebreos": "Hebreos",
    "Stg": "Santiago", "Sant": "Santiago", "Santiago": "Santiago",
    "1 P": "1 Pedro", "1P": "1 Pedro", "1Pe": "1 Pedro", "1 Pedro": "1 Pedro",
    "2 P": "2 Pedro", "2P": "2 Pedro", "2Pe": "2 Pedro", "2 Pedro": "2 Pedro",
    "1 Jn": "1 Juan", "1Jn": "1 Juan", "1 Juan": "1 Juan",
    "2 Jn": "2 Juan", "2Jn": "2 Juan", "2 Juan": "2 Juan",
    "3 Jn": "3 Juan", "3Jn": "3 Juan", "3 Juan": "3 Juan",
    "Jud": "Judas", "Judas": "Judas",
    "Ap": "Apocalipsis", "Apoc": "Apocalipsis", "Apocalipsis": "Apocalipsis",
  },

  ca: {
    "Gn": "Gènesi", "Gén": "Gènesi", "Gènesi": "Gènesi",
    "Ex": "Èxode", "Èxode": "Èxode",
    "Lv": "Levític", "Levític": "Levític",
    "Nm": "Nombres", "Nombres": "Nombres",
    "Dt": "Deuteronomi", "Deuteronomi": "Deuteronomi",
    "Jos": "Josuè", "Josuè": "Josuè",
    "Jut": "Jutges", "Jutges": "Jutges",
    "Rt": "Rut", "Rut": "Rut",
    "1Sa": "1 Samuel", "1 Sa": "1 Samuel", "1 Samuel": "1 Samuel",
    "2Sa": "2 Samuel", "2 Sa": "2 Samuel", "2 Samuel": "2 Samuel",
    "1Re": "1 Reis", "1 Re": "1 Reis", "1 Reis": "1 Reis",
    "2Re": "2 Reis", "2 Re": "2 Reis", "2 Reis": "2 Reis",
    "1Cr": "1 Cròniques", "1 Cr": "1 Cròniques", "1 Cròniques": "1 Cròniques",
    "2Cr": "2 Cròniques", "2 Cr": "2 Cròniques", "2 Cròniques": "2 Cròniques",
    "Esd": "Esdres", "Esdres": "Esdres",
    "Ne": "Nehemies", "Neh": "Nehemies", "Nehemies": "Nehemies",
    "Est": "Ester", "Ester": "Ester",
    "Job": "Job",
    "Sal": "Salms", "Salms": "Salms",
    "Pr": "Proverbis", "Prov": "Proverbis", "Proverbis": "Proverbis",
    "Ecl": "Eclesiastès", "Eclesiastès": "Eclesiastès",
    "Ct": "Càntic", "Càntic": "Càntic",
    "Is": "Isaïes", "Isaïes": "Isaïes",
    "Jr": "Jeremies", "Jer": "Jeremies", "Jeremies": "Jeremies",
    "Lm": "Lamentacions", "Lamentacions": "Lamentacions",
    "Ez": "Ezequiel", "Ezequiel": "Ezequiel",
    "Dn": "Daniel", "Daniel": "Daniel",
    "Os": "Osees", "Osees": "Osees",
    "Jl": "Joel", "Joel": "Joel",
    "Am": "Amós", "Amós": "Amós",
    "Abd": "Abdies", "Abdies": "Abdies",
    "Jon": "Jonàs", "Jonàs": "Jonàs",
    "Mi": "Miquees", "Miquees": "Miquees",
    "Na": "Nahum", "Nahum": "Nahum",
    "Hab": "Habacuc", "Habacuc": "Habacuc",
    "Sof": "Sofonies", "Sofonies": "Sofonies",
    "Ag": "Ageu", "Ageu": "Ageu",
    "Za": "Zacaries", "Zacaries": "Zacaries",
    "Ml": "Malaquies", "Malaquies": "Malaquies",
    "Mt": "Mateu", "Mateu": "Mateu",
    "Mc": "Marc", "Marc": "Marc",
    "Lc": "Lluc", "Lluc": "Lluc",
    "Jn": "Joan", "Joan": "Joan",
    "Ac": "Fets", "Fet": "Fets", "Fets": "Fets",
    "Rm": "Romans", "Rom": "Romans", "Romans": "Romans",
    "1Co": "1 Corintis", "1 Co": "1 Corintis", "1 Corintis": "1 Corintis",
    "2Co": "2 Corintis", "2 Co": "2 Corintis", "2 Corintis": "2 Corintis",
    "Ga": "Gàlates", "Gàlates": "Gàlates",
    "Ef": "Efesis", "Efesis": "Efesis",
    "Fl": "Filipencs", "Filipencs": "Filipencs",
    "Col": "Colossencs", "Colossencs": "Colossencs",
    "1Te": "1 Tessalonicencs", "1 Te": "1 Tessalonicencs", "1 Tessalonicencs": "1 Tessalonicencs",
    "2Te": "2 Tessalonicencs", "2 Te": "2 Tessalonicencs", "2 Tessalonicencs": "2 Tessalonicencs",
    "1Ti": "1 Timoteu", "1 Ti": "1 Timoteu", "1 Timoteu": "1 Timoteu",
    "2Ti": "2 Timoteu", "2 Ti": "2 Timoteu", "2 Timoteu": "2 Timoteu",
    "Tit": "Titus", "Titus": "Titus",
    "Flm": "Filèmon", "Filèmon": "Filèmon",
    "He": "Hebreus", "Heb": "Hebreus", "Hebreus": "Hebreus",
    "Jm": "Jaume", "Jaume": "Jaume",
    "1Pe": "1 Pere", "1 Pe": "1 Pere", "1 Pere": "1 Pere",
    "2Pe": "2 Pere", "2 Pe": "2 Pere", "2 Pere": "2 Pere",
    "1Jn": "1 Joan", "1 Jn": "1 Joan", "1 Joan": "1 Joan",
    "2Jn": "2 Joan", "2 Jn": "2 Joan", "2 Joan": "2 Joan",
    "3Jn": "3 Joan", "3 Jn": "3 Joan", "3 Joan": "3 Joan",
    "Jud": "Judes", "Judes": "Judes",
    "Ap": "Apocalipsi", "Apocalipsi": "Apocalipsi",
  },

  en: {
    "Ge": "Genesis", "Gen": "Genesis", "Genesis": "Genesis",
    "Ex": "Exodus", "Exo": "Exodus", "Exodus": "Exodus",
    // ✅ "Le" añadido — Leviticus abreviado en comentarios ingleses antiguos
    "Le": "Leviticus", "Lev": "Leviticus", "Leviticus": "Leviticus",
    "Nu": "Numbers", "Num": "Numbers", "Numbers": "Numbers",
    "De": "Deuteronomy", "Deu": "Deuteronomy", "Dt": "Deuteronomy", "Deuteronomy": "Deuteronomy",
    "Jos": "Joshua", "Joshua": "Joshua",
    "Jdg": "Judges", "Judges": "Judges",
    "Ru": "Ruth", "Rut": "Ruth", "Ruth": "Ruth",
    "1Sa": "1 Samuel", "1 Sa": "1 Samuel", "1Sam": "1 Samuel", "1 Samuel": "1 Samuel",
    "2Sa": "2 Samuel", "2 Sa": "2 Samuel", "2Sam": "2 Samuel", "2 Samuel": "2 Samuel",
    "1Ki": "1 Kings", "1 Ki": "1 Kings", "1 Kings": "1 Kings",
    "2Ki": "2 Kings", "2 Ki": "2 Kings", "2 Kings": "2 Kings",
    "1Ch": "1 Chronicles", "1 Ch": "1 Chronicles", "1 Chronicles": "1 Chronicles",
    "2Ch": "2 Chronicles", "2 Ch": "2 Chronicles", "2 Chronicles": "2 Chronicles",
    "Ezr": "Ezra", "Ezra": "Ezra",
    "Ne": "Nehemiah", "Neh": "Nehemiah", "Nehemiah": "Nehemiah",
    "Est": "Esther", "Esther": "Esther",
    "Job": "Job",
    "Ps": "Psalms", "Psa": "Psalms", "Psalm": "Psalms", "Psalms": "Psalms",
    "Pr": "Proverbs", "Pro": "Proverbs", "Prov": "Proverbs", "Proverbs": "Proverbs",
    "Ec": "Ecclesiastes", "Ecc": "Ecclesiastes", "Ecclesiastes": "Ecclesiastes",
    "So": "Song of Solomon", "Song": "Song of Solomon",
    "Is": "Isaiah", "Isa": "Isaiah", "Isaiah": "Isaiah",
    "Je": "Jeremiah", "Jer": "Jeremiah", "Jeremiah": "Jeremiah",
    "La": "Lamentations", "Lam": "Lamentations", "Lamentations": "Lamentations",
    "Eze": "Ezekiel", "Ez": "Ezekiel", "Ezekiel": "Ezekiel",
    "Da": "Daniel", "Dan": "Daniel", "Daniel": "Daniel",
    "Ho": "Hosea", "Hos": "Hosea", "Hosea": "Hosea",
    "Joe": "Joel", "Joel": "Joel",
    "Am": "Amos", "Amos": "Amos",
    "Ob": "Obadiah", "Obadiah": "Obadiah",
    "Jon": "Jonah", "Jonah": "Jonah",
    "Mi": "Micah", "Mic": "Micah", "Micah": "Micah",
    "Na": "Nahum", "Nahum": "Nahum",
    "Hab": "Habakkuk", "Habakkuk": "Habakkuk",
    "Zep": "Zephaniah", "Zephaniah": "Zephaniah",
    "Hag": "Haggai", "Haggai": "Haggai",
    "Zec": "Zechariah", "Zechariah": "Zechariah",
    "Mal": "Malachi", "Malachi": "Malachi",
    "Mt": "Matthew", "Mat": "Matthew", "Matthew": "Matthew",
    "Mk": "Mark", "Mar": "Mark", "Mark": "Mark",
    "Lk": "Luke", "Lu": "Luke", "Luke": "Luke",
    "Jn": "John", "Jo": "John", "John": "John",
    "Ac": "Acts", "Act": "Acts", "Acts": "Acts",
    "Ro": "Romans", "Rom": "Romans", "Romans": "Romans",
    "1Co": "1 Corinthians", "1 Co": "1 Corinthians", "1 Corinthians": "1 Corinthians",
    "2Co": "2 Corinthians", "2 Co": "2 Corinthians", "2 Corinthians": "2 Corinthians",
    "Ga": "Galatians", "Gal": "Galatians", "Galatians": "Galatians",
    "Eph": "Ephesians", "Ef": "Ephesians", "Ephesians": "Ephesians",
    "Php": "Philippians", "Phil": "Philippians", "Philippians": "Philippians",
    "Col": "Colossians", "Colossians": "Colossians",
    "1Th": "1 Thessalonians", "1 Th": "1 Thessalonians", "1 Thessalonians": "1 Thessalonians",
    "2Th": "2 Thessalonians", "2 Th": "2 Thessalonians", "2 Thessalonians": "2 Thessalonians",
    "1Ti": "1 Timothy", "1 Ti": "1 Timothy", "1Tim": "1 Timothy", "1 Timothy": "1 Timothy",
    "2Ti": "2 Timothy", "2 Ti": "2 Timothy", "2Tim": "2 Timothy", "2 Timothy": "2 Timothy",
    "Tit": "Titus", "Titus": "Titus",
    "Phm": "Philemon", "Philemon": "Philemon",
    "He": "Hebrews", "Heb": "Hebrews", "Hebrews": "Hebrews",
    "Jas": "James", "James": "James",
    "1Pe": "1 Peter", "1 Pe": "1 Peter", "1Pet": "1 Peter", "1 Peter": "1 Peter",
    "2Pe": "2 Peter", "2 Pe": "2 Peter", "2Pet": "2 Peter", "2 Peter": "2 Peter",
    "1Jn": "1 John", "1 Jn": "1 John", "1 John": "1 John",
    "2Jn": "2 John", "2 Jn": "2 John", "2 John": "2 John",
    "3Jn": "3 John", "3 Jn": "3 John", "3 John": "3 John",
    "Jude": "Jude",
    "Re": "Revelation", "Rev": "Revelation", "Revelation": "Revelation",
  }
};

const FULL_NAMES = {
  es: [
    "Génesis","Éxodo","Levítico","Números","Deuteronomio","Josué","Jueces","Rut",
    "1 Samuel","2 Samuel","1 Reyes","2 Reyes","1 Crónicas","2 Crónicas",
    "Esdras","Nehemías","Ester","Job","Salmos","Salmo","Proverbios","Eclesiastés",
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
    "Ezra","Nehemiah","Esther","Job","Psalms","Psalm","Proverbs","Ecclesiastes",
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


// ── Función principal ────────────────────────────────────────

export function linkBibleReferences(text, lang = 'es') {
    if (!text) return text;

    const bookMap  = BOOK_MAPS[lang]  || BOOK_MAPS['es'];
    const fullList = FULL_NAMES[lang] || FULL_NAMES['es'];

    // ✅ Solo nombres conocidos, de más largo a más corto
    const allNames = [
        ...fullList,
        ...Object.keys(bookMap)
    ].sort((a, b) => b.length - a.length);

    // ✅ Eliminar duplicados
    const uniqueNames = [...new Set(allNames)];
    const escaped = uniqueNames.map(n => escapeRegex(n)).join('|');

    /*
     * Reglas del patrón:
     * 1. El nombre del libro debe ir precedido de inicio, espacio, ( o ;
     *    → evita "p.149", "tratada", "nota"
     * 2. El nombre debe empezar por MAYÚSCULA (ya está en los diccionarios)
     * 3. Versículos: "3:1" | "3:1,2" | "3:1, 2" | "3:1-5" | "12:23,24"
     * 4. Segunda ref con ";": "9:22; 11:4"
     * 5. Puntuación final ignorada: "." ")" no forman parte del link
     */
    const refPattern = new RegExp(
        // ✅ Precedido de: inicio de string, espacio, (, [, ; o ,
        `(^|[\\s(\$$;,])` +
        // Nombre del libro (solo conocidos)
        `(${escaped})` +
        // Espacio + capítulo
        `\\s+(\\d+)` +
        // :versículo(s) — opcional
        `(?::(\\d+(?:\\s*[,\\-]\\s*\\d+)*))?` +
        // Segunda referencia con ";" — opcional
        `(?:\\s*;\\s*(\\d+)(?::(\\d+(?:\\s*[,\\-]\\s*\\d+)*))?)?`,
        'gm'
    );

    return text.replace(refPattern, (match, prefix, bookRaw, ch1, v1, ch2, v2) => {

        const book   = bookMap[bookRaw] || bookRaw;
        const cleanV1 = v1 ? v1.replace(/[.\s)]+$/, '').replace(/\s*,\s*/g, ',') : null;
        const cleanV2 = v2 ? v2.replace(/[.\s)]+$/, '').replace(/\s*,\s*/g, ',') : null;

        if (ch2) {
            const label1 = `${bookRaw} ${ch1}${cleanV1 ? ':' + cleanV1 : ''}`;
            const label2 = `${ch2}${cleanV2 ? ':' + cleanV2 : ''}`;
            return prefix +
                buildLink(book, ch1, cleanV1, label1) +
                '; ' +
                buildLink(book, ch2, cleanV2, label2);
        }

        const label = `${bookRaw} ${ch1}${cleanV1 ? ':' + cleanV1 : ''}`;
        return prefix + buildLink(book, ch1, cleanV1, label);
    });
}


// ── Helpers ──────────────────────────────────────────────────

function buildLink(book, chapter, verse, label) {
    const dataVerse = verse ? ` data-verse="${verse}"` : '';
    return `<a href="#" class="bible-ref" ` +
               `data-book="${encodeURIComponent(book)}" ` +
               `data-chapter="${chapter}"` +
               `${dataVerse}>${label}</a>`;
}

function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[$$\\]/g, '\\$&');
}


// ── Listener global ───────────────────────────────────────────

export function initBibleLinks(onRefClick) {
    document.addEventListener('click', function (e) {
        const link = e.target.closest('.bible-ref');
        if (!link) return;

        e.preventDefault();
        e.stopPropagation();

        const book    = decodeURIComponent(link.dataset.book);
        const chapter = parseInt(link.dataset.chapter);
        const verse   = link.dataset.verse || null;

        if (typeof onRefClick === 'function') {
            onRefClick(book, chapter, verse);
        }
    });
}


// ── parseVerseData para app.js ────────────────────────────────

export function parseVerseData(verseData) {
    if (!verseData) return null;

    // Rango: "5-8"
    const rangeMatch = verseData.match(/^(\d+)\s*-\s*(\d+)$/);
    if (rangeMatch) {
        const start = parseInt(rangeMatch[1]);
        const end   = parseInt(rangeMatch[2]);
        const result = [];
        for (let i = start; i <= end; i++) result.push(i);
        return result;
    }

    // Lista: "5,7"
    if (verseData.includes(',')) {
        return verseData.split(',')
            .map(v => parseInt(v.trim()))
            .filter(n => !isNaN(n));
    }

    // Simple: "5"
    const single = parseInt(verseData);
    return isNaN(single) ? null : [single];
}
