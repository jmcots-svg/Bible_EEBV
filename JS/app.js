// ⚠️ URL de tu backend
import { API_URL } from './config.js';
import { 
    fetchJSON, 
    escapeHtml, 
    escapeRegExp, 
    removeAccents,
    highlightText,
    highlightExactWord,
    isExactWordMatch
} from './utils.js';
import { cache, strongWordsCache } from './cache.js';
import { initTheme, initFontSize, initSettingsPanel, setupCollapsibleFilters } from './ui.js';


document.addEventListener('DOMContentLoaded', () => {


    // =====================
    // INICIALIZAR UI
    // =====================
    initSettingsPanel(
        document.getElementById('settingsBtn'),
        document.getElementById('settingsPanel'),
        document.getElementById('closeSettingsBtn')
    );
    
    initTheme(document.getElementById('themeCheckbox'));
    
    initFontSize(
        document.getElementById('fontKnob'),
        document.getElementById('fontTrack'),
        document.getElementById('content')
    );


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
    const compOrientationHint = document.getElementById('compOrientationHint');

    // Tabs y paneles
    const modeTabs         = document.querySelectorAll('.mode-tab');
    const panelLectura     = document.getElementById('panelLectura');
    const panelConcordancia= document.getElementById('panelConcordancia');
    const panelComparacion = document.getElementById('panelComparacion');

    const copyVersesBtn = document.getElementById('copyVersesBtn');
    const selectedVersesCount = document.getElementById('selectedVersesCount');
    const copyModal = document.getElementById('copyModal');
    const closeCopyModal = document.getElementById('closeCopyModal');
    const selectedVersesTextarea = document.getElementById('selectedVersesTextarea');
    const doCopyBtn = document.getElementById('doCopyBtn');
    const copyFeedback = document.getElementById('copyFeedback');

        // Strong
    const strongVersion  = document.getElementById('strongVersion');
    const strongBook     = document.getElementById('strongBook');
    const strongChapter  = document.getElementById('strongChapter');
    const strongVerse    = document.getElementById('strongVerse');
    const panelStrong    = document.getElementById('panelStrong');

    // Panel inferior Strong
    const strongBottomPanel   = document.getElementById('strongBottomPanel');
    const strongBottomCode    = document.getElementById('strongBottomCode');
    const strongBottomCount   = document.getElementById('strongBottomCount');
    const strongBottomClose   = document.getElementById('strongBottomClose');
    const strongBottomContent = document.getElementById('strongBottomContent');

    // Cache para Strong
    let currentStrongCode = null;
    let strongWordsCache = {}; // chapterId -> data

    let selectedVerses = []; // Array para almacenar los IDs/números de los versículos seleccionados
    let currentVersesData = []; // Para tener acceso a los datos del capítulo actual

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
        panelStrong.style.display       = 'none';
        closeStrongPanel(); // Cerrar panel inferior al cambiar de modo

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
            updateComparisonOrientationHint();

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
                } else if (mode === 'strong') {
            panelStrong.style.display = '';
            if (strongChapter.value) {
                renderStrongChapter();
            } else if (strongBook.value) {
                content.innerHTML = '<p class="placeholder">Selecciona un capítulo</p>';
                if (reference) { reference.textContent = ''; reference.classList.remove('visible'); }
            } else {
                content.innerHTML = '<p class="placeholder">Selecciona un libro para ver los códigos Strong</p>';
                if (reference) { reference.textContent = ''; reference.classList.remove('visible'); }
            }
        }
        updateComparisonOrientationHint();
    });
});

// =====================
// FILTROS PLEGABLES (móvil)
// =====================

const filterToggleLectura = setupCollapsibleFilters(
    'toggleFiltersLectura', 'filtersLectura', 'toggleRefLectura'
);
const filterToggleComp = setupCollapsibleFilters(
    'toggleFiltersComp', 'filtersComp', 'toggleRefComp'
);
const filterToggleConc = setupCollapsibleFilters(
    'toggleFiltersConc', 'filtersConc', 'toggleRefConc'
);
const filterToggleStrong = setupCollapsibleFilters(
    'toggleFiltersStrong', 'filtersStrong', 'toggleRefStrong'
);

// Auto-plegar en móvil al seleccionar capítulo
chapterSelect.addEventListener('change', () => {
    setTimeout(() => {
        if (window.innerWidth <= 600) {
            const ref = reference?.textContent?.trim();
            filterToggleLectura?.updateRef(ref || 'Selecciona un libro');
            filterToggleLectura?.collapse();
        }
    }, 500);
});

// Actualizar ref al cambiar versículo
verseSelect.addEventListener('change', () => {
    setTimeout(() => {
        const ref = reference?.textContent?.trim();
        filterToggleLectura?.updateRef(ref || 'Selecciona un libro');
    }, 200);
});

// Auto-plegar comparación al cargar resultados
compChapter.addEventListener('change', () => {
    setTimeout(() => {
        if (window.innerWidth <= 600) {
            const ref = reference?.textContent?.trim();
            filterToggleComp?.updateRef(ref || 'Selecciona versiones');
            filterToggleComp?.collapse();
        }
    }, 500);
});

// Auto-plegar concordancia al buscar
concSearchBtn.addEventListener('click', () => {
    setTimeout(() => {
        if (window.innerWidth <= 600) {
            const query = concQuery.value.trim();
            filterToggleConc?.updateRef(query ? '"' + query + '"' : 'Buscar palabra');
            filterToggleConc?.collapse();
        }
    }, 300);
});
strongChapter.addEventListener('change', () => {
    setTimeout(() => {
        if (window.innerWidth <= 600) {
            const ref = reference?.textContent?.trim();
            filterToggleStrong?.updateRef(ref || 'Selecciona un libro');
            filterToggleStrong?.collapse();
        }
    }, 500);
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

                // Guardar los datos de los versículos actuales para poder acceder a ellos al seleccionar
        currentVersesData = verses; 

        content.innerHTML = verses.map(v => `
            <p class="verse">
                <span class="verse-number" data-verse-number="${v.number}">${v.number}</span>${v.text}
            </p>
        `).join('');
        
        // AÑADIDO: Añadir listeners a los números de versículo
        content.querySelectorAll('.verse-number').forEach(span => {
            span.addEventListener('click', toggleVerseSelection);
        });

        window.scrollTo({ top: 0, behavior: 'smooth' });
        updateCopyButtonVisibility(); // AÑADIDO: Actualizar el estado del botón de copiar
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

        // ✅ Obtener bookOrder del libro seleccionado
        let booksA = cache.books[versionA];
        if (!booksA) {
            booksA = await fetchJSON(`${API_URL}/api/books?version=${versionA}`);
            cache.books[versionA] = booksA;
        }
        const bookA = booksA.find(b => String(b.id) === String(compBook.value));
        const bookOrder = bookA?.bookOrder;
        if (!bookOrder) throw new Error(`No se encontró bookOrder para el libro seleccionado`);

        // ✅ Buscar libro en versión B por bookOrder en vez de por nombre
        let booksB = cache.books[versionB];
        if (!booksB) {
            booksB = await fetchJSON(`${API_URL}/api/books?version=${versionB}`);
            cache.books[versionB] = booksB;
        }
        const bookB = booksB.find(b => b.bookOrder === bookOrder); // ← bookOrder en vez de name
        if (!bookB) throw new Error(`No se encontró el libro equivalente en ${versionB}`);

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
        updateComparisonOrientationHint();
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
    function updateComparisonOrientationHint() {
        if (!compOrientationHint) return;
    
        const isComparisonMode = currentMode === 'comparacion';
        const isNarrowScreen = window.innerWidth <= 600; // Define 'estrecha' como <= 600px (como en tus media queries)
    
        // La pista solo se muestra si estamos en modo comparación y la pantalla es estrecha
        if (isComparisonMode && isNarrowScreen) {
            compOrientationHint.style.display = 'flex';
        } else {
            compOrientationHint.style.display = 'none';
        }
    }

        function toggleVerseSelection(event) {
        const verseNumberSpan = event.target;
        const verseNumber = parseInt(verseNumberSpan.dataset.verseNumber);

        const index = selectedVerses.indexOf(verseNumber);
        if (index > -1) {
            // Deseleccionar
            selectedVerses.splice(index, 1);
            verseNumberSpan.classList.remove('selected');
        } else {
            // Seleccionar
            selectedVerses.push(verseNumber);
            verseNumberSpan.classList.add('selected');
        }
        // Ordenar para mantener la secuencia y facilitar el copiado
        selectedVerses.sort((a, b) => a - b);
        updateCopyButtonVisibility();
    }

    function updateCopyButtonVisibility() {
        if (selectedVerses.length > 0) {
            copyVersesBtn.style.display = 'flex'; // O 'block' si no usas flex para el botón
            selectedVersesCount.textContent = selectedVerses.length;
        } else {
            copyVersesBtn.style.display = 'none';
        }
    }

    function showCopyModal() {
        if (selectedVerses.length === 0) return;

        const bookName = bookSelect.options[bookSelect.selectedIndex]?.text;
        const chapterNum = chapterSelect.options[chapterSelect.selectedIndex]?.dataset.number;
        const versionName = versionSelect.options[versionSelect.selectedIndex]?.text;

        // Determinar el rango de versículos seleccionados
        let versesRange = '';
        if (selectedVerses.length === 1) {
            versesRange = selectedVerses[0]; // Si es solo un versículo
        } else if (selectedVerses.length > 1) {
            // Asegúrate de que los versículos estén ordenados
            const sortedVerses = [...selectedVerses].sort((a, b) => a - b);
            const firstVerse = sortedVerses[0];
            const lastVerse = sortedVerses[sortedVerses.length - 1];

            // Comprueba si la selección es consecutiva
            let isConsecutive = true;
            for (let i = 0; i < sortedVerses.length - 1; i++) {
                if (sortedVerses[i+1] !== sortedVerses[i] + 1) {
                    isConsecutive = false;
                    break;
                }
            }

            if (isConsecutive) {
                versesRange = `${firstVerse}-${lastVerse}`; // Si es un rango consecutivo
            } else {
                // Si no es consecutivo, listar los versículos separados por comas
                versesRange = sortedVerses.join(', ');
            }
        }

        // Formato de la cabecera: "Levítico 4:1-3 (LBLA)"
        let headerText = `${bookName} ${chapterNum}`;
        if (versesRange) {
            headerText += `:${versesRange}`;
        }
        headerText += ` (${versionName}):\n\n`; // Nueva línea doble al final

        let textToCopy = headerText;

        selectedVerses.forEach(vNum => {
            const verse = currentVersesData.find(v => v.number === vNum);
            if (verse) {
                textToCopy += `${verse.number}. ${verse.text}\n`;
            }
        });

        selectedVersesTextarea.value = textToCopy.trim();
        copyFeedback.textContent = '';
        copyModal.style.display = 'flex';
    }

    function hideCopyModal() {
        copyModal.style.display = 'none';
        copyFeedback.textContent = ''; // Limpiar feedback al cerrar
    }

    async function copySelectedVersesToClipboard() {
        try {
            await navigator.clipboard.writeText(selectedVersesTextarea.value);
            copyFeedback.textContent = '¡Copiado al portapapeles!';
            // Opcional: Cerrar el modal automáticamente después de un tiempo
            // setTimeout(hideCopyModal, 2000); 
        } catch (err) {
            console.error('Error al copiar:', err);
            copyFeedback.textContent = 'Error al copiar. Por favor, intenta de nuevo.';
        }
    }

    function clearSelections() {
        selectedVerses = [];
        content.querySelectorAll('.verse-number.selected').forEach(span => {
            span.classList.remove('selected');
        });
        updateCopyButtonVisibility();
        hideCopyModal(); // Asegurarse de que el modal también se oculte
    }

    // AÑADIDO: Limpiar selecciones al cambiar de capítulo o libro
    // (Opcional, pero mejora la UX para evitar selecciones "fantasmas")
    chapterSelect.addEventListener('change', clearSelections);
    bookSelect.addEventListener('change', clearSelections);
    versionSelect.addEventListener('change', clearSelections);


    // =====================
    // FUNCIONES MODO STRONG
    // =====================

    async function loadStrongVersions() {
        try {
            const versions = await fetchJSON(`${API_URL}/api/versions/strongs`);
            strongVersion.innerHTML = '';
            versions.forEach((v, i) => {
                const opt = document.createElement('option');
                opt.value = v.name;
                opt.textContent = v.fullName;
                opt.dataset.lang = v.language;  // 👈 guardar idioma en el option
                if (i === 0) opt.selected = true;
                strongVersion.appendChild(opt);
            });
            strongVersion.disabled = false;
            if (versions.length > 0) {
                loadStrongBooks(versions[0].name);
            }
        } catch (e) {
            console.error('Error cargando versiones Strong:', e);
            strongVersion.innerHTML = '<option value="">Error al cargar</option>';
        }
    }

        // Obtener el idioma de definiciones según la versión Strong seleccionada
    function getStrongDefLang() {
        try {
        const opt = strongVersion?.options?.[strongVersion.selectedIndex];
        const lang = opt?.dataset?.lang?.trim()?.toLowerCase();

            // Aceptamos solo idiomas válidos según la DB
            if (lang === "en" || lang === "es") {
                return lang;
            }
        
            // Fallback seguro
            return "en";
        } catch {
            return "en";
        }
    }
    async function loadStrongBooks(version) {
        if (!version) return;
        let books = cache.books[version];
        if (!books) {
            books = await fetchJSON(`${API_URL}/api/books?version=${version}`);
            cache.books[version] = books;
        }
        strongBook.innerHTML = '<option value="">-- Selecciona libro --</option>';
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
        strongBook.appendChild(createGroup('📜 Antiguo Testamento', ot));
        strongBook.appendChild(createGroup('✝️ Nuevo Testamento', nt));
        strongBook.disabled = false;
        strongChapter.innerHTML = '<option value="">-- Selecciona capítulo --</option>';
        strongChapter.disabled = true;
        strongVerse.innerHTML = '<option value="">Todo el capítulo</option>';
        strongVerse.disabled = true;
    }

    async function loadStrongChapters() {
        const bookId = strongBook.value;
        if (!bookId) return;
        let chapters = cache.chapters[bookId];
        if (!chapters) {
            chapters = await fetchJSON(`${API_URL}/api/chapters?bookId=${bookId}`);
            cache.chapters[bookId] = chapters;
        }
        strongChapter.innerHTML = '<option value="">-- Selecciona capítulo --</option>';
        chapters.forEach(ch => {
            const opt = document.createElement('option');
            opt.value = ch.id;
            opt.textContent = `Capítulo ${ch.number}`;
            opt.dataset.number = ch.number;
            strongChapter.appendChild(opt);
        });
        strongChapter.disabled = false;
        strongVerse.innerHTML = '<option value="">Todo el capítulo</option>';
        strongVerse.disabled = true;
    }

    async function onStrongChapterChange() {
        const chId = strongChapter.value;
        if (!chId) {
            content.innerHTML = '<p class="placeholder">Selecciona un capítulo</p>';
            if (reference) reference.classList.remove('visible');
            return;
        }
        strongVerse.innerHTML = '<option value="">Todo el capítulo</option>';
        strongVerse.disabled = true;
        content.innerHTML = '<p class="loading">🔤 Cargando palabras con Strong...</p>';

        try {
            let wordsData = strongWordsCache[chId];
            if (!wordsData) {
                wordsData = await fetchJSON(`${API_URL}/api/words?chapterId=${chId}`);
                strongWordsCache[chId] = wordsData;
            }

            // Poblar selector de versículo
            wordsData.forEach(v => {
                const opt = document.createElement('option');
                opt.value = v.verseNumber;
                opt.textContent = `Versículo ${v.verseNumber}`;
                strongVerse.appendChild(opt);
            });
            strongVerse.disabled = false;

            renderStrongVerses(wordsData);
        } catch (e) {
            showError('Error al cargar palabras Strong');
        }
    }

    function renderStrongChapter() {
        const chId = strongChapter.value;
        if (!chId) return;
        const wordsData = strongWordsCache[chId];
        if (wordsData) {
            renderStrongVerses(wordsData);
        } else {
            onStrongChapterChange();
        }
    }

    function renderStrongVerses(versesData) {
        const bName = strongBook.selectedIndex >= 0 ? strongBook.options[strongBook.selectedIndex].text : '';
        const chNum = strongChapter.selectedIndex >= 0 ? strongChapter.options[strongChapter.selectedIndex].dataset.number : '';
        const vNum = strongVerse.value;

        let dataToRender = versesData;
        if (vNum) {
            dataToRender = versesData.filter(v => String(v.verseNumber) === String(vNum));
        }

        if (reference) {
            reference.textContent = `${bName} ${chNum}${vNum ? ':' + vNum : ''} (Strong)`;
            reference.classList.add('visible');
        }

        let html = '';
        dataToRender.forEach(verseData => {
            html += `<p class="strong-verse"><span class="verse-number">${verseData.verseNumber}</span>`;

            verseData.words.forEach(word => {
                if (word.strong) {
                    html += `<span class="strong-word-wrap">` +
                            `<span class="strong-code" data-strong="${word.strong}" title="Strong ${word.strong}">${word.strong}</span>` +
                            `<span class="strong-word-text">${escapeHtml(word.text)}</span>` +
                            `</span> `;
                } else {
                    html += `<span class="strong-plain-word">${escapeHtml(word.text)}</span> `;
                }
            });

            html += `</p>`;
        });

        content.innerHTML = html;

        // Añadir event listeners a los códigos Strong
        content.querySelectorAll('.strong-code').forEach(el => {
            el.addEventListener('click', (e) => {
                const code = e.target.dataset.strong;
                onStrongCodeClick(code, e.target);
            });
        });

        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // =====================
    // PANEL INFERIOR STRONG
    // =====================


async function onStrongCodeClick(strongCode, clickedEl) {
    if (currentStrongCode === strongCode && strongBottomPanel.classList.contains('open')) {
        closeStrongPanel();
        return;
    }

    content.querySelectorAll('.strong-code.active').forEach(el => el.classList.remove('active'));
    clickedEl.classList.add('active');

    currentStrongCode = strongCode;
    strongBottomCode.textContent = strongCode;
    strongBottomCount.textContent = 'Cargando...';

    // ── HTML con tabs ──────────────────────────────────────────────
    strongBottomContent.innerHTML = `
        <div class="strong-tabs">
            <button class="strong-tab active" data-tab="dict">📖 Diccionario</button>
            <button class="strong-tab" data-tab="refs">🔍 Referencias</button>
        </div>
        <div class="strong-tab-panel" id="strongTabDict">
            <div class="strong-bottom-loading">📖 Cargando diccionario...</div>
        </div>
        <div class="strong-tab-panel" id="strongTabRefs" style="display:none">
            <div class="strong-bottom-loading">🔍 Buscando referencias...</div>
        </div>
    `;
    // ──────────────────────────────────────────────────────────────

    strongBottomPanel.classList.add('open');

    // Event listeners tabs
    strongBottomContent.querySelectorAll('.strong-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            strongBottomContent.querySelectorAll('.strong-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            const tabName = tab.dataset.tab;
            document.getElementById('strongTabDict').style.display = tabName === 'dict' ? '' : 'none';
            document.getElementById('strongTabRefs').style.display = tabName === 'refs' ? '' : 'none';
        });
    });

    // Cargar ambos en paralelo
    loadStrongDict(strongCode);
    loadStrongRefs(strongCode, 1);
}

async function loadStrongRefs(strongCode, page) {
    const lang = getStrongDefLang(); 
    const panel = document.getElementById('strongTabRefs') || strongBottomContent;

    try {
        const limit = 50;
        const data = await fetchJSON(
            `${API_URL}/api/strong-refs?strong=${encodeURIComponent(strongCode)}&page=${page}&limit=${limit}&lang=${lang}`
        );

        strongBottomCount.textContent = `${data.total.toLocaleString()} referencia${data.total !== 1 ? 's' : ''}`;

        let html = '<div class="strong-ref-list-detailed">';

        if (data.total === 0) {
            html = '<div class="search-no-results"><h3>No se encontraron referencias</h3></div>';
        } else {
            data.results.forEach(ref => {
                const icon = ref.testament === 'OT' ? '📜' : '✝️';
                
                // Procesamos el texto con resaltado si matched_words existe
                let highlightedText = ref.text ? escapeHtml(ref.text) : '<em>Texto no disponible</em>';
                
                if (ref.matched_words && Array.isArray(ref.matched_words)) {
                    // Ordenamos de mayor a menor longitud para un resaltado limpio
                    const sortedWords = [...ref.matched_words].sort((a, b) => b.length - a.length);
                    sortedWords.forEach(word => {
                        if (word) highlightedText = highlightText(highlightedText, word);
                    });
                }

                html += `
                <div class="search-result-card">
                    <div class="search-result-header">
                        <a href="#" class="strong-ref-item search-nav-link"
                           data-book="${escapeHtml(ref.book)}"
                           data-chapter="${ref.chapter}"
                           data-verse="${ref.verse}">
                            ${icon} ${ref.book} ${ref.chapter}:${ref.verse}
                        </a>
                    </div>
                    <p class="search-result-text">${highlightedText}</p>
                </div>`;
            });
        }
        
        html += '</div>';

        if (data.totalPages > 1) {
            html += `<div class="search-pagination">`;
            if (data.page > 1) html += `<button class="pagination-btn" data-page="${data.page - 1}">⬅ Ant</button>`;
            html += `<span class="pagination-info">Pág ${data.page}/${data.totalPages}</span>`;
            if (data.page < data.totalPages) html += `<button class="pagination-btn" data-page="${data.page + 1}">Sig ➡</button>`;
            html += `</div>`;
        }

        panel.innerHTML = html;

        // Eventos de navegación
        panel.querySelectorAll('.strong-ref-item').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                navigateToVerseFromStrong(link.dataset.book, link.dataset.chapter, link.dataset.verse);
            });
        });

        // Eventos de paginación
        panel.querySelectorAll('.pagination-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                panel.innerHTML = '<div class="strong-bottom-loading">🔍 Cargando...</div>';
                loadStrongRefs(strongCode, parseInt(btn.dataset.page));
                panel.scrollTo({ top: 0, behavior: 'smooth' });
            });
        });

    } catch (e) {
        panel.innerHTML = `<p class="error">❌ Error al cargar referencias</p>`;
    }
}


    async function loadStrongDict(strongCode) {
    const panel = document.getElementById('strongTabDict');
    if (!panel) return;
    const lang = getStrongDefLang(); 
    try {
            const data = await fetchJSON(
        `${API_URL}/api/strong-dict/${encodeURIComponent(strongCode)}?lang=${lang}`
    );

        if (!data || data.error) {
            panel.innerHTML = `<p class="strong-dict-empty">Sin información del diccionario para <strong>${strongCode}</strong>.</p>`;
            return;
        }

        const isHebrew = data.language === 'H';
        const langLabel = isHebrew ? '🔤 Hebreo' : '🔤 Griego';

        let html = `<div class="strong-dict-entry">`;

        // ── Cabecera ────────────────────────────────────────────────
        html += `<div class="strong-dict-header">`;
        if (data.lemma) {
            html += `<span class="strong-dict-lemma" dir="${isHebrew ? 'rtl' : 'ltr'}">${escapeHtml(data.lemma)}</span>`;
        }
        if (data.translit) {
            html += `<span class="strong-dict-translit">${escapeHtml(data.translit)}</span>`;
        }
        if (data.pronunciation) {
            html += `<span class="strong-dict-pronun">/${escapeHtml(data.pronunciation)}/</span>`;
        }
        html += `</div>`; // .strong-dict-header

        // ── Badges ──────────────────────────────────────────────────
        html += `<div class="strong-dict-badges">`;
        html += `<span class="strong-dict-badge lang">${langLabel}</span>`;
        if (data.morphology) {
            html += `<span class="strong-dict-badge morph">${escapeHtml(data.morphology)}</span>`;
        }
        if (data.speechLang) {
            html += `<span class="strong-dict-badge speech">${escapeHtml(data.speechLang)}</span>`;
        }
        html += `</div>`; // .strong-dict-badges

        // ── KJV ─────────────────────────────────────────────────────
        if (data.kjvDefinition) {
            html += `<div class="strong-dict-section kjv">
                        <span class="strong-dict-label">KJV</span>
                        <p>${escapeHtml(data.kjvDefinition)}</p>
                     </div>`;
        }

        // ── Definición ──────────────────────────────────────────────
        if (data.definition) {
            html += `<div class="strong-dict-section">
                        <span class="strong-dict-label">Definición</span>
                        <p>${escapeHtml(data.definition)}</p>
                     </div>`;
        }

        // ── Strong's Def (griego) ────────────────────────────────────
        if (data.strongsDef) {
            html += `<div class="strong-dict-section">
                        <span class="strong-dict-label">Strong's Definition</span>
                        <p>${escapeHtml(data.strongsDef)}</p>
                     </div>`;
        }

        // ── Derivación (griego) ──────────────────────────────────────
        if (data.strongsDerivation) {
            html += `<div class="strong-dict-section">
                        <span class="strong-dict-label">Derivación</span>
                        <p>${escapeHtml(data.strongsDerivation)}</p>
                     </div>`;
        }

        // ── Exégesis (hebreo) ────────────────────────────────────────
        if (data.exegesis) {
            html += `<div class="strong-dict-section exegesis">
                        <span class="strong-dict-label">Exégesis</span>
                        <p>${escapeHtml(data.exegesis)}</p>
                     </div>`;
        }

        // ── Explicación (hebreo) ─────────────────────────────────────
        if (data.explanation) {
            html += `<div class="strong-dict-section">
                        <span class="strong-dict-label">Explicación</span>
                        <p>${escapeHtml(data.explanation)}</p>
                     </div>`;
        }

        // ── Relaciones ───────────────────────────────────────────────
        if (data.relations && data.relations.length > 0) {
            html += `<div class="strong-dict-section">
                        <span class="strong-dict-label">Ver también</span>
                        <div class="strong-dict-relations">`;
            data.relations.forEach(rel => {
                const label = {
                    see_also:     'ver también',
                    derives_from: 'deriva de',
                    greek_equiv:  'equiv. griego',
                    related:      'relacionado'
                }[rel.relationType] ?? rel.relationType;

                html += `<button class="strong-dict-rel-btn" data-strong="${escapeHtml(rel.toStrong)}"
                                  title="${escapeHtml(rel.to?.kjvDefinition || '')}">
                            <span class="rel-code">${escapeHtml(rel.toStrong)}</span>
                            ${rel.to?.translit ? `<span class="rel-translit">${escapeHtml(rel.to.translit)}</span>` : ''}
                            <span class="rel-type">${label}</span>
                         </button>`;
            });
            html += `</div></div>`; // .strong-dict-relations + .strong-dict-section
        }

        html += `</div>`; // .strong-dict-entry
        panel.innerHTML = html;

        // Click en relaciones → cargar ese Strong
        panel.querySelectorAll('.strong-dict-rel-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const code = btn.dataset.strong;
                // Actualizar cabecera del panel
                strongBottomCode.textContent = code;
                currentStrongCode = code;
                // Resetear tabs a diccionario
                strongBottomContent.querySelectorAll('.strong-tab').forEach(t => {
                    t.classList.toggle('active', t.dataset.tab === 'dict');
                });
                document.getElementById('strongTabDict').style.display = '';
                document.getElementById('strongTabRefs').style.display = 'none';
                // Recargar
                document.getElementById('strongTabDict').innerHTML =
                    '<div class="strong-bottom-loading">📖 Cargando diccionario...</div>';
                strongBottomCount.textContent = 'Cargando...';
                loadStrongDict(code);
                loadStrongRefs(code, 1);
            });
        });

    } catch (e) {
        panel.innerHTML = `<p class="error">❌ Error al cargar el diccionario</p>`;
        console.error('Error loadStrongDict:', e);
    }
}

    function closeStrongPanel() {
        strongBottomPanel.classList.remove('open');
        currentStrongCode = null;
        content.querySelectorAll('.strong-code.active').forEach(el => el.classList.remove('active'));
    }

    async function navigateToVerseFromStrong(bookName, chapterNum, verseNum) {
        // Navegar al panel de lectura sin perder contexto de Strong
        const version = strongVersion.value;

        try {
            // Asegurar que tenemos la versión Strong seleccionada en lectura
            // Primero verificar si esta versión existe en el selector de lectura
            let lecturaVersion = version;
            const lecturaOptions = Array.from(versionSelect.options).map(o => o.value);
            if (!lecturaOptions.includes(version)) {
                // Usar la primera versión disponible en lectura
                lecturaVersion = versionSelect.options[0]?.value || version;
            }

            versionSelect.value = lecturaVersion;

            if (!cache.books[lecturaVersion]) {
                const data = await fetchJSON(`${API_URL}/api/books?version=${lecturaVersion}`);
                cache.books[lecturaVersion] = data;
            }
            renderBooks(cache.books[lecturaVersion]);

            const book = cache.books[lecturaVersion].find(b => b.name === bookName);
            if (!book) {
                showError(`No se encontró el libro "${bookName}" en ${lecturaVersion}`);
                return;
            }

            bookSelect.value = book.id;

            if (!cache.chapters[book.id]) {
                const chaptersData = await fetchJSON(`${API_URL}/api/chapters?bookId=${book.id}`);
                cache.chapters[book.id] = chaptersData;
            }
            renderChapters(cache.chapters[book.id]);

            const chapter = cache.chapters[book.id].find(ch => String(ch.number) === String(chapterNum));
            if (!chapter) {
                showError(`No se encontró el capítulo ${chapterNum}`);
                return;
            }

            chapterSelect.value = chapter.id;

            const cacheKey = `${chapter.id}-all`;
            if (!cache.verses[cacheKey]) {
                const versesData = await fetchJSON(`${API_URL}/api/verses?chapterId=${chapter.id}`);
                cache.verses[cacheKey] = versesData;
            }
            renderVerseSelect(cache.verses[cacheKey]);
            verseSelect.value = String(verseNum);

            // Cambiar a modo lectura
            currentMode = 'lectura';
            modeTabs.forEach(t => t.classList.toggle('active', t.dataset.mode === 'lectura'));
            panelLectura.style.display = '';
            panelConcordancia.style.display = 'none';
            panelComparacion.style.display = 'none';
            panelStrong.style.display = 'none';
            closeStrongPanel();

            onSearch();

        } catch (e) {
            showError('Error al navegar al versículo');
        }
    }

    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
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

        // Eventos para selección y copiado
    copyVersesBtn.addEventListener('click', showCopyModal);
    closeCopyModal.addEventListener('click', hideCopyModal);
    doCopyBtn.addEventListener('click', copySelectedVersesToClipboard);

        // Eventos Strong
    strongVersion.addEventListener('change', () => {
        loadStrongBooks(strongVersion.value);
        strongChapter.innerHTML = '<option value="">-- Selecciona capítulo --</option>';
        strongChapter.disabled = true;
        strongVerse.innerHTML = '<option value="">Todo el capítulo</option>';
        strongVerse.disabled = true;
    });
    strongBook.addEventListener('change', loadStrongChapters);
    strongChapter.addEventListener('change', onStrongChapterChange);
    strongVerse.addEventListener('change', () => {
        if (strongWordsCache[strongChapter.value]) {
            renderStrongVerses(strongWordsCache[strongChapter.value]);
        }
    });
    strongBottomClose.addEventListener('click', closeStrongPanel);
    
    // Opcional: Cerrar el modal si se hace clic fuera de él
    window.addEventListener('click', (event) => {
        if (event.target === copyModal) {
            hideCopyModal();
        }
    });

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
    loadStrongVersions();

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

    updateComparisonOrientationHint(); // Llamada inicial al cargar la página.
    window.addEventListener('resize', updateComparisonOrientationHint); // Escucha cambios de tamaño/orientación.


}); // ← fin DOMContentLoaded
