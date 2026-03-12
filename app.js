// ⚠️ URL de tu backend
const API_URL = 'https://bible-eebv.jmcots-svg.deno.net';

async function fetchJSON(url, signal = null) {
    const res = await fetch(url, { signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
}

const cache = {
    books: {},
    chapters: {},
    verses: {},
    search: {}
};

document.addEventListener('DOMContentLoaded', () => {

    // =====================
    // 1. SELECCIÓN DE ELEMENTOS
    // =====================
    const versionSelect  = document.getElementById('version');
    const bookSelect     = document.getElementById('book');
    const chapterSelect  = document.getElementById('chapter');
    const verseSelect    = document.getElementById('verse');
    const content        = document.getElementById('content');
    const reference      = document.getElementById('reference');
    const mainTitle      = document.getElementById('mainTitle');
    const themeCheckbox  = document.getElementById('themeCheckbox');

    // Concordancia
    const concVersion   = document.getElementById('concVersion');
    const concTestament = document.getElementById('concTestament');
    const concQuery     = document.getElementById('concQuery');
    const concSearchBtn = document.getElementById('concSearchBtn');
    const concExact     = document.getElementById('concExact');

    // Comparación
    const compVersionA = document.getElementById('compVersionA');
    const compVersionB = document.getElementById('compVersionB');
    const compBook     = document.getElementById('compBook');
    const compChapter  = document.getElementById('compChapter');
    const compVerse    = document.getElementById('compVerse');

    // Tabs y paneles
    const modeTabs         = document.querySelectorAll('.mode-tab');
    const panelLectura     = document.getElementById('panelLectura');
    const panelConcordancia= document.getElementById('panelConcordancia');
    const panelComparacion = document.getElementById('panelComparacion');

    let currentMode = 'lectura';

    // =====================
    // 2. MODO NOCHE
    // =====================
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
        if (themeCheckbox) themeCheckbox.checked = true;
    }
    if (themeCheckbox) {
        themeCheckbox.addEventListener('change', () => {
            const isDark = themeCheckbox.checked;
            document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
            localStorage.setItem('theme', isDark ? 'dark' : 'light');
        });
    }

    // FONT SIZE
const fontSizes = ['0.9rem', '1.1rem', '1.35rem'];
const fontKnob  = document.getElementById('fontKnob');
const fontTrack = document.getElementById('fontTrack');
let fontPos = parseInt(localStorage.getItem('fontPos') ?? '1');

function applyFontPos(pos) {
    fontPos = pos;
    fontKnob.dataset.pos  = pos;
    fontTrack.dataset.pos = pos;
    fontKnob.textContent  = ['a','A','A'][pos];
    document.getElementById('content')
            .style.setProperty('--font-reading', fontSizes[pos]);
    localStorage.setItem('fontPos', pos);
}

applyFontPos(fontPos);

fontTrack.addEventListener('click', () => {
    applyFontPos((fontPos + 1) % 3);
});

// =====================
// 2b. TAMAÑO DE TEXTO
// =====================
const fontSizes  = ['0.9rem', '1.1rem', '1.35rem'];
const fontLabels = ['a', 'A', 'A'];

const fontKnob  = document.getElementById('fontKnob');
const fontTrack = fontKnob ? fontKnob.parentElement : null;
const fontSwitchLabel = document.querySelector('.font-switch');

let fontPos = parseInt(localStorage.getItem('fontPos') ?? '1');
applyFontPos(fontPos);

function applyFontPos(pos) {
    fontPos = pos;

    if (fontKnob)  { 
        fontKnob.dataset.pos  = pos; 
        fontKnob.textContent  = fontLabels[pos]; 
    }
    if (fontTrack) { 
        fontTrack.dataset.pos = pos; 
    }

    // Aplica la variable en #content → afecta a todos los paneles
    const contentEl = document.getElementById('content');
    if (contentEl) {
        contentEl.style.setProperty('--font-reading', fontSizes[pos]);
    }

    localStorage.setItem('fontPos', pos);
}

// Click en cualquier parte del label avanza la posición
if (fontSwitchLabel) {
    fontSwitchLabel.addEventListener('click', (e) => {
        e.preventDefault();
        applyFontPos((fontPos + 1) % 3);
    });
}
    
// =====================
// 3. TABS - CAMBIO DE MODO
// =====================
modeTabs.forEach(tab => {
    tab.addEventListener('click', () => {
        const mode = tab.dataset.mode;
        if (mode === currentMode) return;

        const prevMode = currentMode; // ← guardamos el modo anterior
        currentMode = mode;
        modeTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        // Ocultar todos los paneles primero
        panelLectura.style.display      = 'none';
        panelConcordancia.style.display = 'none';
        panelComparacion.style.display  = 'none';

        if (mode === 'lectura') {
            panelLectura.style.display = '';

            // ── Sincronizar desde Comparación → Lectura ──────────────────
            if (prevMode === 'comparacion' && compBook.value && compChapter.value) {
                syncCompToReading();
                return; // syncCompToReading se encarga de renderizar
            }
            // ─────────────────────────────────────────────────────────────

            if (chapterSelect.value) {
                onSearch();
            } else if (bookSelect.value) {
                content.innerHTML = '<p class="placeholder">Selecciona un capítulo</p>';
                if (reference) { reference.textContent = ''; reference.classList.remove('visible'); }
            } else {
                content.innerHTML = '<p class="placeholder">Selecciona una versión y libro para comenzar</p>';
                if (reference) { reference.textContent = ''; reference.classList.remove('visible'); }
            }

        } else if (mode === 'concordancia') {
            panelConcordancia.style.display = '';
            if (currentSearchData) {
                renderSearchResults(currentSearchData);
            } else {
                content.innerHTML = '<p class="placeholder">Escribe una palabra o frase para buscar en toda la Biblia</p>';
                if (reference) { reference.textContent = ''; reference.classList.remove('visible'); }
            }

        } else if (mode === 'comparacion') {
            panelComparacion.style.display = '';

            // ── Sincronizar desde Lectura → Comparación ───────────────────
            if (prevMode === 'lectura' && bookSelect.value && chapterSelect.value) {
                syncReadingToComp();
                return; // syncReadingToComp se encarga de renderizar
            }
            // ─────────────────────────────────────────────────────────────

            if (currentCompData) {
                const { versesA, versesB, versionA, versionB, bookName, chNum, vNum } = currentCompData;
                renderComparisonView(versesA, versesB, versionA, versionB, bookName, chNum, vNum);
            } else {
                content.innerHTML = '<p class="placeholder">Selecciona dos versiones y un capítulo para comparar</p>';
                if (reference) { reference.textContent = ''; reference.classList.remove('visible'); }
            }
        }
    });
});

// =====================
// 3b. SYNC: Lectura → Comparación
// =====================
async function syncReadingToComp() {
    const bookId   = bookSelect.value;
    const bookName = bookSelect.options[bookSelect.selectedIndex]?.text;
    const chapterId = chapterSelect.value;
    const chNum    = chapterSelect.options[chapterSelect.selectedIndex]?.dataset.number;
    const vNum     = verseSelect.value; // puede ser "" (todo el capítulo)

    if (!bookId || !chapterId) return;

    content.innerHTML = '<p class="loading">⚖️ Cargando comparación...</p>';

    try {
        // 1. Cargar libros en compBook (usa la versión A actual)
        await loadCompBooks();

        // 2. Seleccionar el mismo libro
        compBook.value = bookId;
        compBook.disabled = false;

        // 3. Cargar capítulos del libro
        await loadCompChapters();

        // 4. Seleccionar el mismo capítulo
        //    compChapter tiene ids que corresponden a la misma versión (A)
        compChapter.value = chapterId;
        compChapter.disabled = false;

        // 5. Cargar versículos del capítulo
        const cacheKey = `${chapterId}-all`;
        let verses = cache.verses[cacheKey];
        if (!verses) {
            verses = await fetchJSON(`${API_URL}/api/verses?chapterId=${chapterId}`);
            cache.verses[cacheKey] = verses;
        }
        compVerse.innerHTML = '<option value="">Todo el capítulo</option>';
        verses.forEach(v => {
            const opt = document.createElement('option');
            opt.value = v.number;
            opt.textContent = `Versículo ${v.number}`;
            compVerse.appendChild(opt);
        });
        compVerse.disabled = false;

        // 6. Seleccionar el mismo versículo
        compVerse.value = vNum;

        // 7. Renderizar comparación
        renderComparison();

    } catch (e) {
        content.innerHTML = `<p class="error">❌ Error al sincronizar: ${e.message}</p>`;
    }
}

// =====================
// 3c. SYNC: Comparación → Lectura
// =====================
async function syncCompToReading() {
    const bookId    = compBook.value;
    const bookName  = compBook.options[compBook.selectedIndex]?.text;
    const chapterId = compChapter.value;
    const chNum     = compChapter.options[compChapter.selectedIndex]?.dataset.number;
    const vNum      = compVerse.value; // puede ser "" (todo el capítulo)

    if (!bookId || !chapterId) return;

    content.innerHTML = '<p class="loading">📖 Cargando lectura...</p>';

    try {
        // 1. Aseguramos libros cargados en panel lectura
        const version = versionSelect.value;
        if (!cache.books[version]) {
            const data = await fetchJSON(`${API_URL}/api/books?version=${version}`);
            cache.books[version] = data;
        }
        renderBooks(cache.books[version]);

        // 2. Seleccionar el mismo libro
        bookSelect.value = bookId;
        bookSelect.disabled = false;

        // 3. Cargar capítulos
        if (!cache.chapters[bookId]) {
            const chaptersData = await fetchJSON(`${API_URL}/api/chapters?bookId=${bookId}`);
            cache.chapters[bookId] = chaptersData;
            localStorage.setItem(`chapters_${bookId}`, JSON.stringify(chaptersData));
        }
        renderChapters(cache.chapters[bookId]);

        // 4. Seleccionar el mismo capítulo
        chapterSelect.value = chapterId;
        chapterSelect.disabled = false;

        // 5. Cargar y mostrar versículos
        const cacheKey = `${chapterId}-all`;
        if (!cache.verses[cacheKey]) {
            const versesData = await fetchJSON(`${API_URL}/api/verses?chapterId=${chapterId}`);
            cache.verses[cacheKey] = versesData;
        }
        renderVerseSelect(cache.verses[cacheKey]);

        // 6. Seleccionar el mismo versículo
        verseSelect.value = vNum;

        // 7. Renderizar lectura
        onSearch();

    } catch (e) {
        content.innerHTML = `<p class="error">❌ Error al sincronizar: ${e.message}</p>`;
    }
}

    // =====================
    // 4. FUNCIONES MODO LECTURA
    // =====================
    async function loadBooks(version) {
        if (!version) return;
        if (cache.books[version]) { renderBooks(cache.books[version]); return; }
        try {
            const data = await fetchJSON(`${API_URL}/api/books?version=${version}`);
            cache.books[version] = data;
            renderBooks(data);
        } catch (e) { showError('Error al cargar libros'); }
    }

    function renderBooks(booksList) {
        bookSelect.innerHTML = '<option value="">-- Selecciona libro --</option>';
        const ot = booksList.filter(b => b.testament === 'OT');
        const nt = booksList.filter(b => b.testament === 'NT');
        const createGroup = (label, list) => {
            const group = document.createElement('optgroup');
            group.label = label;
            list.forEach(b => {
                const opt = document.createElement('option');
                opt.value = b.id;
                opt.textContent = b.name;
                group.appendChild(opt);
            });
            return group;
        };
        bookSelect.appendChild(createGroup('📜 Antiguo Testamento', ot));
        bookSelect.appendChild(createGroup('✝️ Nuevo Testamento', nt));
        bookSelect.disabled = false;
    }

    async function onVersionChange() {
        const version = versionSelect.value;
        resetSelects(['book', 'chapter', 'verse']);
        content.innerHTML = '<p class="placeholder">Cambiando de versión...</p>';
        await loadBooks(version);
    }

    async function onBookChange() {
        const bookId = bookSelect.value;
        resetSelects(['chapter', 'verse']);
        if (!bookId) return;
        if (cache.chapters[bookId]) { renderChapters(cache.chapters[bookId]); return; }
        const localData = localStorage.getItem(`chapters_${bookId}`);
        if (localData) {
            const parsed = JSON.parse(localData);
            cache.chapters[bookId] = parsed;
            renderChapters(parsed);
            return;
        }
        try {
            const data = await fetchJSON(`${API_URL}/api/chapters?bookId=${bookId}`);
            cache.chapters[bookId] = data;
            localStorage.setItem(`chapters_${bookId}`, JSON.stringify(data));
            renderChapters(data);
            if (data.length > 0) {
                const firstChapterId = data[0].id;
                const cacheKey = `${firstChapterId}-all`;
                if (!cache.verses[cacheKey]) {
                    fetchJSON(`${API_URL}/api/verses?chapterId=${firstChapterId}`)
                        .then(verses => { cache.verses[cacheKey] = verses; })
                        .catch(() => {});
                }
            }
        } catch (e) { showError('Error al cargar capítulos'); }
    }

    function renderChapters(chapters) {
        chapterSelect.innerHTML = '<option value="">-- Selecciona capítulo --</option>';
        chapters.forEach(ch => {
            const opt = document.createElement('option');
            opt.value = ch.id;
            opt.textContent = `Capítulo ${ch.number}`;
            opt.dataset.number = ch.number;
            chapterSelect.appendChild(opt);
        });
        chapterSelect.disabled = false;
    }

    let versesAbort = null;
    let isFetching = false;

    async function onChapterChange() {
        if (isFetching) return;
        const chId = chapterSelect.value;
        resetSelects(['verse']);
        if (!chId) {
            content.innerHTML = '<p class="placeholder">Selecciona un capítulo</p>';
            if (reference) reference.classList.remove('visible');
            return;
        }
        const cacheKey = `${chId}-all`;
        if (cache.verses[cacheKey]) { renderVerseSelect(cache.verses[cacheKey]); onSearch(); return; }
        try {
            isFetching = true;
            content.innerHTML = '<p class="loading">Cargando capítulo...</p>';
            if (versesAbort) versesAbort.abort();
            versesAbort = new AbortController();
            const verses = await fetchJSON(`${API_URL}/api/verses?chapterId=${chId}`, versesAbort.signal);
            cache.verses[cacheKey] = verses;
            renderVerseSelect(verses);
            onSearch();
        } catch (e) {
            if (e.name === "AbortError") return;
            showError('Error al cargar versículos');
        } finally { isFetching = false; }
    }

    function renderVerseSelect(verses) {
        verseSelect.innerHTML = '<option value="">Todo el capítulo</option>';
        verses.forEach(v => {
            const opt = document.createElement('option');
            opt.value = v.number;
            opt.textContent = `Versículo ${v.number}`;
            verseSelect.appendChild(opt);
        });
        verseSelect.disabled = false;
    }

    async function onSearch() {
        const chId = chapterSelect.value;
        const vNum = verseSelect.value;
        if (!chId) return;
        content.innerHTML = '<p class="loading">Cargando contenido...</p>';
        if (reference) { reference.textContent = ''; reference.classList.remove('visible'); }
        const cacheKeyAll = `${chId}-all`;
        let versesToRender = [];
        try {
            if (cache.verses[cacheKeyAll]) {
                versesToRender = cache.verses[cacheKeyAll];
            } else {
                if (versesAbort) versesAbort.abort();
                versesAbort = new AbortController();
                versesToRender = await fetchJSON(`${API_URL}/api/verses?chapterId=${chId}`, versesAbort.signal);
                cache.verses[cacheKeyAll] = versesToRender;
            }
            if (vNum) versesToRender = versesToRender.filter(v => String(v.number) === String(vNum));
            renderVerses(versesToRender, vNum);
        } catch (e) {
            if (e.name === "AbortError") return;
            showError('Error al buscar el contenido');
        }
    }

    function renderVerses(verses, vNum) {
        const bName = bookSelect.selectedIndex >= 0 ? bookSelect.options[bookSelect.selectedIndex].text : '';
        const chNum = chapterSelect.selectedIndex >= 0 ? chapterSelect.options[chapterSelect.selectedIndex].dataset.number : '';
        if (reference) {
            reference.textContent = `${bName} ${chNum}${vNum ? ':' + vNum : ''}`;
            reference.classList.add('visible');
        }
        content.innerHTML = verses.map(v => `
            <p class="verse"><span class="verse-number">${v.number}</span>${v.text}</p>
        `).join('');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // =====================
    // 5. FUNCIONES MODO CONCORDANCIA
    // =====================
    let searchAbort = null;
    let currentSearchPage = 1;
    let currentSearchData = null;
    let currentCompData = null;

    async function onConcordanciaSearch(page = 1) {
        const query = concQuery.value.trim();
        const version = concVersion.value;
        const testament = concTestament.value;
        if (!query || query.length < 2) { showError('Escribe al menos 2 caracteres para buscar'); return; }
        currentSearchPage = page;
        content.innerHTML = '<p class="loading">🔍 Buscando en toda la Biblia...</p>';
        if (reference) { reference.textContent = ''; reference.classList.remove('visible'); }
        concSearchBtn.disabled = true;
        concSearchBtn.textContent = '⏱️...';
        const cacheKey = `${version}-${testament}-${query.toLowerCase()}-p${page}`;
        if (cache.search[cacheKey]) {
            currentSearchData = cache.search[cacheKey];
            renderSearchResults(cache.search[cacheKey]);
            concSearchBtn.disabled = false;
            concSearchBtn.textContent = '🔎 Buscar';
            return;
        }
        try {
            if (searchAbort) searchAbort.abort();
            searchAbort = new AbortController();
            const data = await fetchJSON(
                `${API_URL}/api/search?query=${encodeURIComponent(query)}&version=${version}&testament=${testament}&page=${page}&limit=20`,
                searchAbort.signal
            );
            cache.search[cacheKey] = data;
            currentSearchData = data;
            renderSearchResults(data);
        } catch (e) {
            if (e.name === "AbortError") return;
            showError('Error al realizar la búsqueda');
        } finally {
            concSearchBtn.disabled = false;
            concSearchBtn.textContent = '🔎 Buscar';
        }
    }

    function isExactWordMatch(text, query) {
        const normalized = removeAccents(text.toLowerCase());
        const normalizedQ = removeAccents(query.toLowerCase().trim());
        const regex = new RegExp(`\\b${escapeRegExp(normalizedQ)}\\b`, 'i');
        return regex.test(normalized);
    }

    function renderSearchResults(data) {
        const exactMode = concExact && concExact.checked;
        let results = data.results;
        if (exactMode) results = results.filter(r => isExactWordMatch(r.text, data.query));
        if (reference) { reference.textContent = `Resultados para "${data.query}"`; reference.classList.add('visible'); }
        if (data.total === 0 || (exactMode && results.length === 0 && data.results.length === 0)) {
            content.innerHTML = `<div class="search-no-results"><p class="search-icon">🔍</p><h3>No se encontraron resultados</h3></div>`;
            return;
        }
        if (exactMode && results.length === 0) {
            content.innerHTML = `<div class="search-no-results"><p class="search-icon">🔎</p><h3>Sin coincidencias exactas en esta página</h3></div>`;
            return;
        }
        const startResult = (data.page - 1) * data.limit + 1;
        const endResult = Math.min(data.page * data.limit, data.total);
        let html = `<div class="search-stats">
            <span class="search-total">📊 ${data.total.toLocaleString()} resultado${data.total !== 1 ? 's' : ''} para "<strong>${escapeHtml(data.query)}</strong>"</span>
            <span class="search-range">Mostrando ${startResult}-${endResult}</span>
        </div>`;
        results.forEach(r => {
            const highlightedText = exactMode ? highlightExactWord(r.text, data.query) : highlightText(r.text, data.query);
            const testamentIcon = r.testament === 'OT' ? '📜' : '✝️';
            html += `<div class="search-result-card">
                <div class="search-result-header">
                    <a href="#" class="search-result-ref search-nav-link"
                       data-book="${escapeHtml(r.book)}" data-chapter="${r.chapter}" data-verse="${r.verse}">
                        ${testamentIcon} ${r.book} ${r.chapter}:${r.verse}
                    </a>
                </div>
                <p class="search-result-text">${highlightedText}</p>
            </div>`;
        });
        if (data.totalPages > 1) {
            html += `<div class="search-pagination">`;
            if (data.page > 1) html += `<button class="pagination-btn" data-page="${data.page - 1}">⬅ Anterior</button>`;
            html += `<span class="pagination-info">Página ${data.page} de ${data.totalPages}</span>`;
            if (data.page < data.totalPages) html += `<button class="pagination-btn" data-page="${data.page + 1}">Siguiente ➡</button>`;
            html += `</div>`;
        }
        content.innerHTML = html;
        content.querySelectorAll('.pagination-btn').forEach(btn => {
            btn.addEventListener('click', () => { onConcordanciaSearch(parseInt(btn.dataset.page)); window.scrollTo({ top: 0, behavior: 'smooth' }); });
        });
        content.querySelectorAll('.search-nav-link').forEach(link => {
            link.addEventListener('click', (e) => { e.preventDefault(); navigateToVerse(link.dataset.book, link.dataset.chapter, link.dataset.verse); });
        });
    }

    function removeAccents(str) { return str.normalize('NFD').replace(/[\u0300-\u036f]/g, ''); }

    function highlightExactWord(text, query) {
        if (!query) return escapeHtml(text);
        const normalizedText = removeAccents(text.toLowerCase());
        const normalizedQuery = removeAccents(query.toLowerCase().trim());
        const regex = new RegExp(`\\b${escapeRegExp(normalizedQuery)}\\b`, 'gi');
        const matches = [];
        let match;
        while ((match = regex.exec(normalizedText)) !== null) {
            matches.push({ start: match.index, end: match.index + normalizedQuery.length });
        }
        if (matches.length === 0) return escapeHtml(text);
        let result = '', lastEnd = 0;
        for (const m of matches) {
            result += escapeHtml(text.substring(lastEnd, m.start));
            result += `<mark class="search-highlight">${escapeHtml(text.substring(m.start, m.end))}</mark>`;
            lastEnd = m.end;
        }
        return result + escapeHtml(text.substring(lastEnd));
    }

    function highlightText(text, query) {
        if (!query) return escapeHtml(text);
        const normalizedText = removeAccents(text.toLowerCase());
        const normalizedQuery = removeAccents(query.toLowerCase());
        const matches = [];
        let searchFrom = 0;
        while (searchFrom < normalizedText.length) {
            const index = normalizedText.indexOf(normalizedQuery, searchFrom);
            if (index === -1) break;
            matches.push({ start: index, end: index + normalizedQuery.length });
            searchFrom = index + 1;
        }
        if (matches.length === 0) return escapeHtml(text);
        let result = '', lastEnd = 0;
        for (const m of matches) {
            result += escapeHtml(text.substring(lastEnd, m.start));
            result += `<mark class="search-highlight">${escapeHtml(text.substring(m.start, m.end))}</mark>`;
            lastEnd = m.end;
        }
        return result + escapeHtml(text.substring(lastEnd));
    }

    function escapeHtml(str) { const div = document.createElement('div'); div.textContent = str; return div.innerHTML; }
    function escapeRegExp(string) { return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

    // =====================
    // 5b. NAVEGACIÓN CONCORDANCIA → LECTURA
    // =====================
    async function navigateToVerse(bookName, chapterNum, verseNum) {
        const version = concVersion.value || versionSelect.value;
        content.innerHTML = '<p class="loading">📖 Abriendo en modo lectura...</p>';
        try {
            versionSelect.value = version;
            if (!cache.books[version]) {
                const data = await fetchJSON(`${API_URL}/api/books?version=${version}`);
                cache.books[version] = data;
            }
            renderBooks(cache.books[version]);
            const book = cache.books[version].find(b => b.name === bookName);
            if (!book) { showError(`No se encontró el libro "${bookName}"`); return; }
            bookSelect.value = book.id;
            if (!cache.chapters[book.id]) {
                const chaptersData = await fetchJSON(`${API_URL}/api/chapters?bookId=${book.id}`);
                cache.chapters[book.id] = chaptersData;
                localStorage.setItem(`chapters_${book.id}`, JSON.stringify(chaptersData));
            }
            renderChapters(cache.chapters[book.id]);
            const chapter = cache.chapters[book.id].find(ch => String(ch.number) === String(chapterNum));
            if (!chapter) { showError(`No se encontró el capítulo ${chapterNum}`); return; }
            chapterSelect.value = chapter.id;
            const cacheKey = `${chapter.id}-all`;
            if (!cache.verses[cacheKey]) {
                const versesData = await fetchJSON(`${API_URL}/api/verses?chapterId=${chapter.id}`);
                cache.verses[cacheKey] = versesData;
            }
            renderVerseSelect(cache.verses[cacheKey]);
            verseSelect.value = String(verseNum);
            currentMode = 'lectura';
            modeTabs.forEach(t => t.classList.toggle('active', t.dataset.mode === 'lectura'));
            panelLectura.style.display = '';
            panelConcordancia.style.display = 'none';
            panelComparacion.style.display = 'none';
            onSearch();
        } catch (e) { showError('Error al navegar al versículo'); }
    }

    // =====================
    // 6. PANEL COMPARACIÓN
    // =====================
    async function loadCompBooks() {
        const version = compVersionA.value;
        if (!version) return;
        let books = cache.books[version];
        if (!books) {
            books = await fetchJSON(`${API_URL}/api/books?version=${version}`);
            cache.books[version] = books;
        }
        compBook.innerHTML = '<option value="">-- Selecciona libro --</option>';
        const ot = books.filter(b => b.testament === 'OT');
        const nt = books.filter(b => b.testament === 'NT');
        const createGroup = (label, list) => {
            const group = document.createElement('optgroup');
            group.label = label;
            list.forEach(b => {
                const opt = document.createElement('option');
                opt.value = b.id;
                opt.textContent = b.name;
                group.appendChild(opt);
            });
            return group;
        };
        compBook.appendChild(createGroup('📜 Antiguo Testamento', ot));
        compBook.appendChild(createGroup('✝️ Nuevo Testamento', nt));
        compBook.disabled = false;
        compChapter.innerHTML = '<option value="">-- Selecciona capítulo --</option>';
        compChapter.disabled = true;
        compVerse.innerHTML = '<option value="">Todo el capítulo</option>';
        compVerse.disabled = true;
    }

    async function loadCompChapters() {
        const bookId = compBook.value;
        if (!bookId) return;
        let chapters = cache.chapters[bookId];
        if (!chapters) {
            chapters = await fetchJSON(`${API_URL}/api/chapters?bookId=${bookId}`);
            cache.chapters[bookId] = chapters;
        }
        compChapter.innerHTML = '<option value="">-- Selecciona capítulo --</option>';
        chapters.forEach(ch => {
            const opt = document.createElement('option');
            opt.value = ch.id;
            opt.textContent = `Capítulo ${ch.number}`;
            opt.dataset.number = ch.number;
            compChapter.appendChild(opt);
        });
        compChapter.disabled = false;
        compVerse.innerHTML = '<option value="">Todo el capítulo</option>';
        compVerse.disabled = true;
    }

    async function loadCompVerses() {
        const chId = compChapter.value;
        if (!chId) return;
        const cacheKey = `${chId}-all`;
        let verses = cache.verses[cacheKey];
        if (!verses) {
            verses = await fetchJSON(`${API_URL}/api/verses?chapterId=${chId}`);
            cache.verses[cacheKey] = verses;
        }
        compVerse.innerHTML = '<option value="">Todo el capítulo</option>';
        verses.forEach(v => {
            const opt = document.createElement('option');
            opt.value = v.number;
            opt.textContent = `Versículo ${v.number}`;
            compVerse.appendChild(opt);
        });
        compVerse.disabled = false;
        renderComparison();
    }

    async function renderComparison() {
        const versionA = compVersionA.value;
        const versionB = compVersionB.value;
        const chIdA    = compChapter.value;
        const vNum     = compVerse.value;
        if (!versionA || !versionB || !chIdA) return;
        if (versionA === versionB) {
            content.innerHTML = '<p class="error">❌ Selecciona dos versiones diferentes</p>';
            return;
        }
        content.innerHTML = '<p class="loading">⚖️ Comparando versiones...</p>';
        try {
            const bookName = compBook.options[compBook.selectedIndex]?.text;
            const chNum    = compChapter.options[compChapter.selectedIndex]?.dataset.number;
            let booksB = cache.books[versionB];
            if (!booksB) {
                booksB = await fetchJSON(`${API_URL}/api/books?version=${versionB}`);
                cache.books[versionB] = booksB;
            }
            const bookB = booksB.find(b => b.name === bookName);
            if (!bookB) throw new Error(`No se encontró "${bookName}" en ${versionB}`);
            let chaptersB = cache.chapters[bookB.id];
            if (!chaptersB) {
                chaptersB = await fetchJSON(`${API_URL}/api/chapters?bookId=${bookB.id}`);
                cache.chapters[bookB.id] = chaptersB;
            }
            const chapterB = chaptersB.find(ch => String(ch.number) === String(chNum));
            if (!chapterB) throw new Error(`No se encontró capítulo ${chNum} en ${versionB}`);
            const cacheKeyA = `${chIdA}-all`;
            const cacheKeyB = `${chapterB.id}-all`;
            let versesA = cache.verses[cacheKeyA];
            if (!versesA) {
                versesA = await fetchJSON(`${API_URL}/api/verses?chapterId=${chIdA}`);
                cache.verses[cacheKeyA] = versesA;
            }
            let versesB = cache.verses[cacheKeyB];
            if (!versesB) {
                versesB = await fetchJSON(`${API_URL}/api/verses?chapterId=${chapterB.id}`);
                cache.verses[cacheKeyB] = versesB;
            }
            if (vNum) {
                versesA = versesA.filter(v => String(v.number) === String(vNum));
                versesB = versesB.filter(v => String(v.number) === String(vNum));
            }
            renderComparisonView(versesA, versesB, versionA, versionB, bookName, chNum, vNum);
        } catch (e) {
            content.innerHTML = `<p class="error">❌ ${e.message}</p>`;
        }
    }

    function renderComparisonView(versesA, versesB, versionA, versionB, bookName, chNum, vNum) {
        if (reference) {
            reference.textContent = `${bookName} ${chNum}${vNum ? ':' + vNum : ''}`;
            reference.classList.add('visible');
        }
        
        currentCompData = { versesA, versesB, versionA, versionB, bookName, chNum, vNum };
        
        const rowsHtml = versesA.map(vA => {
            const vB = versesB.find(v => v.number === vA.number);
            return `<div class="comp-row">
                <div class="comp-cell"><span class="verse-number">${vA.number}</span>${vA.text}</div>
                <div class="comp-cell"><span class="verse-number">${vB?.number ?? vA.number}</span>${vB?.text ?? '<em>No disponible</em>'}</div>
            </div>`;
        }).join('');
        content.innerHTML = `
            <div class="comp-header">
                <div class="comp-version-badge">${versionA}</div>
                <div class="comp-version-badge">${versionB}</div>
            </div>
            <div class="comp-container">${rowsHtml}</div>`;
    }

    // =====================
    // 7. UTILIDADES
    // =====================
    function resetSelects(ids) {
        ids.forEach(id => {
            const el = document.getElementById(id);
            if (!el) return;
            if (id === 'book')    el.innerHTML = '<option value="">Cargando...</option>';
            if (id === 'chapter') el.innerHTML = '<option value="">-- Selecciona libro --</option>';
            if (id === 'verse')   el.innerHTML = '<option value="">Todo el capítulo</option>';
            el.disabled = true;
        });
    }

    function showError(msg) {
        content.innerHTML = `<p class="error">❌ ${msg}</p>`;
        if (reference) reference.classList.remove('visible');
    }

    // =====================
    // 8. EVENTOS
    // =====================
    versionSelect.addEventListener('change', onVersionChange);
    bookSelect.addEventListener('change', onBookChange);
    chapterSelect.addEventListener('change', onChapterChange);
    verseSelect.addEventListener('change', onSearch);

    concSearchBtn.addEventListener('click', () => onConcordanciaSearch(1));
    concQuery.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); onConcordanciaSearch(1); } });

    // Sincronizar versión lectura ↔ concordancia
    concVersion.addEventListener('change', () => { versionSelect.value = concVersion.value; });
    versionSelect.addEventListener('change', () => { concVersion.value = versionSelect.value; });

    // Eventos comparación
    compVersionA.addEventListener('change', () => { loadCompBooks(); if (compChapter.value) renderComparison(); });
    compVersionB.addEventListener('change', () => { if (compChapter.value) renderComparison(); });
    compBook.addEventListener('change', loadCompChapters);
    compChapter.addEventListener('change', loadCompVerses);
    compVerse.addEventListener('change', renderComparison);

    // =====================
    // 9. CARGA INICIAL - Versiones dinámicas
    // =====================
    async function loadVersions() {
        try {
            const versions = await fetchJSON(`${API_URL}/api/versions`);

            // Poblar Lectura, Concordancia y Comparación
            [versionSelect, concVersion, compVersionA, compVersionB].forEach((sel, i) => {
                const currentVal = sel.value;
                sel.innerHTML = '';
                versions.forEach((v, j) => {
                    const opt = document.createElement('option');
                    opt.value = v.name;
                    opt.textContent = v.fullName;
                    // compVersionB arranca en la segunda versión por defecto
                    if (sel === compVersionB ? j === 1 : j === 0) opt.selected = true;
                    sel.appendChild(opt);
                });
                if (currentVal) sel.value = currentVal;
            });

            if (versionSelect.value) loadBooks(versionSelect.value);
            if (compVersionA.value) loadCompBooks();

        } catch (e) {
            console.error('Error cargando versiones:', e);
            if (versionSelect.value) loadBooks(versionSelect.value);
        }
    }

    loadVersions();

    // =====================
    // 10. NAVEGACIÓN ENTRE CAPÍTULOS
    // =====================
    function cambiarCapitulo(direccion) {
        const opciones = Array.from(chapterSelect.options).filter(opt => opt.value !== "");
        const indexActual = opciones.findIndex(opt => opt.value === chapterSelect.value);
        if (direccion === 'sig' && indexActual < opciones.length - 1) {
            chapterSelect.value = opciones[indexActual + 1].value;
            onChapterChange();
        } else if (direccion === 'ant' && indexActual > 0) {
            chapterSelect.value = opciones[indexActual - 1].value;
            onChapterChange();
        }
    }

    document.addEventListener('keydown', (e) => {
        if (document.activeElement.tagName === 'INPUT') return;
        if (e.key === 'ArrowRight') cambiarCapitulo('sig');
        if (e.key === 'ArrowLeft')  cambiarCapitulo('ant');
    });

    const swipeArea = document.getElementById('content');
    let touchStartX = 0, touchStartY = 0;
    swipeArea.addEventListener('touchstart', e => {
        touchStartX = e.changedTouches[0].screenX;
        touchStartY = e.changedTouches[0].screenY;
    }, { passive: true });
    swipeArea.addEventListener('touchend', e => {
        const diffX = e.changedTouches[0].screenX - touchStartX;
        const diffY = e.changedTouches[0].screenY - touchStartY;
        if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 80) {
            diffX < 0 ? cambiarCapitulo('sig') : cambiarCapitulo('ant');
        }
    }, { passive: true });

}); // ← fin DOMContentLoaded
