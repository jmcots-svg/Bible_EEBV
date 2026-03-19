// ⚠️ URL de tu backend
import { API_URL } from './config.js';
import { translations, t } from './translations.js';
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
import { initComparacion, loadCompBooks, renderComparison, getCurrentCompData, updateComparacionLabels } from './comparacion.js';
import { initConcordancia, getCurrentSearchData, renderSearchResults, updateConcordanciaLabels, initIAPanel } from './concordancia.js';
import { initCommentary, openCommentaryForReference, closeCommentaryPanel } from './commentary.js';
import { initStrong, loadStrongVersions, renderStrongChapter, closeStrongPanel, updateStrongLabels, reloadCurrentStrongIfOpen } from './strong.js';
import { loadSavedSkin, initSkinSelector } from './themes.js';
import { initBibleLinks, parseVerseData } from './bible-links.js';

document.addEventListener('DOMContentLoaded', () => {

    // =====================
    // 0. SKIN / TEMA
    // =====================
    loadSavedSkin();
    initSkinSelector();

    // =====================
    // 1. DECLARACIONES DOM
    // =====================
    const versionSelect       = document.getElementById('version');
    const bookSelect          = document.getElementById('book');
    const chapterSelect       = document.getElementById('chapter');
    const verseSelect         = document.getElementById('verse');
    const content             = document.getElementById('content');
    const reference           = document.getElementById('reference');
    const mainTitle           = document.getElementById('mainTitle');
    const themeCheckbox       = document.getElementById('themeCheckbox');
    const languageSelect      = document.getElementById('languageSelect');

    // Comparación
    const compOrientationHint = document.getElementById('compOrientationHint');
    const compChapter         = document.getElementById('compChapter');
    const compVersionA        = document.getElementById('compVersionA');
    const compVersionB        = document.getElementById('compVersionB');

    // Tabs y paneles
    const modeTabs            = document.querySelectorAll('.mode-tab');
    const panelLectura        = document.getElementById('panelLectura');
    const panelConcordancia   = document.getElementById('panelConcordancia');
    const panelComparacion    = document.getElementById('panelComparacion');
    const panelStrong         = document.getElementById('panelStrong');

    // Copiar versículos
    const copyVersesBtn          = document.getElementById('copyVersesBtn');
    const selectedVersesCount    = document.getElementById('selectedVersesCount');
    const copyModal              = document.getElementById('copyModal');
    const closeCopyModal         = document.getElementById('closeCopyModal');
    const selectedVersesTextarea = document.getElementById('selectedVersesTextarea');
    const doCopyBtn              = document.getElementById('doCopyBtn');
    const copyFeedback           = document.getElementById('copyFeedback');

    // Strong
    const strongChapter       = document.getElementById('strongChapter');
    const strongVerse         = document.getElementById('strongVerse');
    const strongVersion       = document.getElementById('strongVersion');
    const strongBook          = document.getElementById('strongBook');
    const strongBottomPanel   = document.getElementById('strongBottomPanel');
    const strongBottomCode    = document.getElementById('strongBottomCode');
    const strongBottomCount   = document.getElementById('strongBottomCount');
    const strongBottomClose   = document.getElementById('strongBottomClose');
    const strongBottomContent = document.getElementById('strongBottomContent');

    // Concordancia
    const concVersion   = document.getElementById('concVersion');
    const concTestament = document.getElementById('concTestament');
    const concQuery     = document.getElementById('concQuery');
    const concSearchBtn = document.getElementById('concSearchBtn');
    const concExact     = document.getElementById('concExact');

    // =====================
    // 2. VARIABLES DE ESTADO
    // =====================
    let selectedVerses    = [];
    let currentVersesData = [];
    let currentMode       = 'lectura';
    let versesAbort       = null;
    let isFetching        = false;

    // =====================
    // 3. INICIALIZAR UI
    // =====================
    initSettingsPanel(
        document.getElementById('settingsBtn'),
        document.getElementById('settingsPanel'),
        document.getElementById('closeSettingsBtn')
    );

    initTheme(themeCheckbox);

    initFontSize(
        document.getElementById('fontKnob'),
        document.getElementById('fontTrack'),
        content
    );

    // =====================
    // 4. INICIALIZAR STRONG
    // =====================
    initStrong({
        strongVersion,
        strongBook,
        strongChapter,
        strongVerse,
        strongBottomPanel,
        strongBottomCode,
        strongBottomCount,
        strongBottomClose,
        strongBottomContent,
        content,
        reference
    }, {
        showError,
        navigateToVerseFromStrong
    });

    // =====================
    // 5. INICIALIZAR COMPARACIÓN
    // =====================
    initComparacion({
        compVersionA,
        compVersionB,
        compBook: document.getElementById('compBook'),
        compChapter,
        compVerse: document.getElementById('compVerse'),
        content,
        reference
    }, {
        updateComparisonOrientationHint
    });

    // =====================
    // 6. INICIALIZAR CONCORDANCIA
    // =====================
    initConcordancia({
        concVersion,
        concTestament,
        concQuery,
        concSearchBtn,
        concExact,
        content,
        reference
    }, {
        showError,
        navigateToVerse
    });
    initIAPanel();

    // =====================
    // 7. MODO NOCHE E IDIOMA
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

    // IDIOMA
    const savedLanguage = localStorage.getItem('appLanguage') || 'es';
    if (languageSelect) {
        languageSelect.value = savedLanguage;
        languageSelect.addEventListener('change', async (e) => {
            const newLanguage = e.target.value;
            localStorage.setItem('appLanguage', newLanguage);
            applyTranslations(newLanguage);
            content.innerHTML = `<p class="loading">${t('changingVersion', newLanguage)}</p>`;
            await loadVersions();
            reloadCurrentStrongIfOpen();
        });
    }
    applyTranslations(savedLanguage);

    // =====================
    // 8. TABS - CAMBIO DE MODO
    // =====================
    modeTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const mode = tab.dataset.mode;
            if (mode === currentMode) return;

            currentMode = mode;
            modeTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            panelLectura.style.display      = 'none';
            panelConcordancia.style.display = 'none';
            panelComparacion.style.display  = 'none';
            panelStrong.style.display       = 'none';
            closeStrongPanel();
            closeCommentaryPanel();

            if (mode === 'lectura') {
                panelLectura.style.display = '';
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
                const searchData = getCurrentSearchData();
                if (searchData) {
                    renderSearchResults(searchData);
                } else {
                    content.innerHTML = '<p class="placeholder">Escribe una palabra o frase para buscar en toda la Biblia</p>';
                    if (reference) { reference.textContent = ''; reference.classList.remove('visible'); }
                }
            } else if (mode === 'comparacion') {
                panelComparacion.style.display = '';
                updateComparisonOrientationHint();
                const compData = getCurrentCompData();
                if (compData) {
                    renderComparison();
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
    // 9. FILTROS PLEGABLES
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

    // ⚠️ SOLO actualizamos el texto de referencia en el botón
    // El colapso lo gestiona autoCollapseFilters() más abajo
    verseSelect.addEventListener('change', () => {
        setTimeout(() => {
            const ref = reference?.textContent?.trim();
            filterToggleLectura?.updateRef(ref || 'Selecciona un libro');
        }, 200);
    });

    concSearchBtn.addEventListener('click', () => {
        setTimeout(() => {
            const query = concQuery.value.trim();
            filterToggleConc?.updateRef(query ? '"' + query + '"' : 'Buscar palabra');
        }, 300);
    });

    // =====================
    // 10. FUNCIONES MODO LECTURA
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
        const lang = localStorage.getItem('appLanguage') || 'es';
        const version = versionSelect.value;
        
        const currentBookName = bookSelect.selectedIndex > 0 
            ? bookSelect.options[bookSelect.selectedIndex].text 
            : null;
        const currentChapterNum = chapterSelect.selectedIndex > 0 
            ? chapterSelect.options[chapterSelect.selectedIndex].dataset.number 
            : null;
        const currentVerseNum = verseSelect.value;

        content.innerHTML = `<p class="loading">${t('changingVersion', lang)}</p>`;
        await loadBooks(version);

        if (currentBookName) {
            const bookOption = Array.from(bookSelect.options)
                .find(opt => opt.text === currentBookName);
            
            if (bookOption) {
                bookSelect.value = bookOption.value;
                await onBookChange();
                
                if (currentChapterNum) {
                    const chapterOption = Array.from(chapterSelect.options)
                        .find(opt => opt.dataset.number === String(currentChapterNum));
                    
                    if (chapterOption) {
                        chapterSelect.value = chapterOption.value;
                        await onChapterChange();
                        
                        if (currentVerseNum) {
                            verseSelect.value = currentVerseNum;
                            await onSearch();
                        }
                        return;
                    }
                }
            }
            content.innerHTML = `<p class="placeholder">${t('placeholder', lang)}</p>`;
        } else {
            content.innerHTML = `<p class="placeholder">${t('placeholder', lang)}</p>`;
        }
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

    async function onChapterChange() {
        const lang = localStorage.getItem('appLanguage') || 'es';
        if (isFetching) return;
        const chId = chapterSelect.value;
        resetSelects(['verse']);
        if (!chId) {
            content.innerHTML = `<p class="placeholder">${t('placeholderChapter', lang)}</p>`;
            if (reference) reference.classList.remove('visible');
            return;
        }
        const cacheKey = `${chId}-all`;
        if (cache.verses[cacheKey]) { renderVerseSelect(cache.verses[cacheKey]); onSearch(); return; }
        try {
            isFetching = true;
            content.innerHTML = `<p class="loading">${t('loadingChapter', lang)}</p>`;
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
        const lang = localStorage.getItem('appLanguage') || 'es';
        const chId = chapterSelect.value;
        const vNum = verseSelect.value;
        if (!chId) return;
        content.innerHTML = `<p class="loading">${t('loadingContent', lang)}</p>`;
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
        const bName = bookSelect.selectedIndex >= 0
            ? bookSelect.options[bookSelect.selectedIndex].text : '';
        const chNum = chapterSelect.selectedIndex >= 0
            ? chapterSelect.options[chapterSelect.selectedIndex].dataset.number : '';

        if (reference) {
            reference.textContent = `${bName} ${chNum}${vNum ? ':' + vNum : ''}`;
            reference.classList.add('visible');
        }

        currentVersesData = verses;

        content.innerHTML = verses.map(v => `
            <p class="verse">
                <span class="verse-number" data-verse-number="${v.number}">${v.number}</span>${v.text}
            </p>
        `).join('');

        content.querySelectorAll('.verse-number').forEach(span => {
            span.addEventListener('click', toggleVerseSelection);
        });

        // ✅ Actualizamos el texto del botón de filtros al terminar de renderizar
        setTimeout(() => {
            const ref = reference?.textContent?.trim();
            filterToggleLectura?.updateRef(ref || 'Selecciona un libro');
        }, 100);

        window.scrollTo({ top: 0, behavior: 'smooth' });
        updateCopyButtonVisibility();
    }

    // =====================
    // 11. NAVEGACIÓN CONCORDANCIA → LECTURA
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
            const chapter = cache.chapters[book.id].find(
                ch => String(ch.number) === String(chapterNum)
            );
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
            panelLectura.style.display      = '';
            panelConcordancia.style.display = 'none';
            panelComparacion.style.display  = 'none';
            onSearch();
        } catch (e) { showError('Error al navegar al versículo'); }
    }

    // =====================
    // 12. NAVEGACIÓN STRONG → LECTURA
    // =====================
    async function navigateToVerseFromStrong(bookName, chapterNum, verseNum) {
        const version = strongVersion.value;
        try {
            let lecturaVersion = version;
            const lecturaOptions = Array.from(versionSelect.options).map(o => o.value);
            if (!lecturaOptions.includes(version)) {
                lecturaVersion = versionSelect.options[0]?.value || version;
            }
            versionSelect.value = lecturaVersion;
            if (!cache.books[lecturaVersion]) {
                const data = await fetchJSON(`${API_URL}/api/books?version=${lecturaVersion}`);
                cache.books[lecturaVersion] = data;
            }
            renderBooks(cache.books[lecturaVersion]);
            const book = cache.books[lecturaVersion].find(b => b.name === bookName);
            if (!book) { showError(`No se encontró el libro "${bookName}" en ${lecturaVersion}`); return; }
            bookSelect.value = book.id;
            if (!cache.chapters[book.id]) {
                const chaptersData = await fetchJSON(`${API_URL}/api/chapters?bookId=${book.id}`);
                cache.chapters[book.id] = chaptersData;
            }
            renderChapters(cache.chapters[book.id]);
            const chapter = cache.chapters[book.id].find(
                ch => String(ch.number) === String(chapterNum)
            );
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
            panelLectura.style.display      = '';
            panelConcordancia.style.display = 'none';
            panelComparacion.style.display  = 'none';
            panelStrong.style.display       = 'none';
            closeStrongPanel();
            onSearch();
        } catch (e) { showError('Error al navegar al versículo'); }
    }

    // =====================
    // 13. UTILIDADES
    // =====================
    function resetSelects(ids) {
        const lang = localStorage.getItem('appLanguage') || 'es';
        ids.forEach(id => {
            const el = document.getElementById(id);
            if (!el) return;
            if (id === 'book')    el.innerHTML = `<option value="">${t('loadingBooks', lang)}</option>`;
            if (id === 'chapter') el.innerHTML = `<option value="">${t('selectBook', lang)}</option>`;
            if (id === 'verse')   el.innerHTML = `<option value="">${t('allChapter', lang)}</option>`;
            el.disabled = true;
        });
    }

    function showError(msg) {
        content.innerHTML = `<p class="error">❌ ${msg}</p>`;
        if (reference) reference.classList.remove('visible');
    }

    function updateComparisonOrientationHint() {
        if (!compOrientationHint) return;
        const show = currentMode === 'comparacion' && window.innerWidth <= 600;
        compOrientationHint.style.display = show ? 'flex' : 'none';
    }

    function applyTranslations(lang) {
        const titleEl = document.getElementById('mainTitle');
        if (titleEl) titleEl.textContent = t('mainTitle', lang);
    
        const settingsHeader = document.querySelector('.settings-panel-header h3');
        if (settingsHeader) settingsHeader.textContent = t('settingsTitle', lang);
    
        const labels = { 'version': 'version', 'book': 'book', 'chapter': 'chapter', 'verse': 'verse' };
        Object.entries(labels).forEach(([id, key]) => {
            const label = document.querySelector(`label[for="${id}"]`);
            if (label) label.textContent = t(key, lang);
        });
    
        const langLabel = document.querySelector(`label[for="languageSelect"]`);
        if (langLabel) langLabel.textContent = t('language', lang);
    
        const tabs = document.querySelectorAll('.tab-text');
        const tabKeys = ['lectura', 'comparacion', 'concordancia', 'strong'];
        tabs.forEach((tab, i) => { if (tabKeys[i]) tab.textContent = t(tabKeys[i], lang); });
    
        updateComparacionLabels(lang);
        updateConcordanciaLabels(lang);
        updateStrongLabels(lang);
        updatePlaceholders(lang);
    }

    function updatePlaceholders(lang) {

        if (!content) return; 
        
        if (!chapterSelect.value && !bookSelect.value) {
            content.innerHTML = `<p class="placeholder">${t('placeholder', lang)}</p>`;
        } else if (!chapterSelect.value && bookSelect.value) {
            content.innerHTML = `<p class="placeholder">${t('placeholderChapter', lang)}</p>`;
        }
    
        const compPlaceholder = document.querySelector('[data-mode="comparacion"] .placeholder');
        if (compPlaceholder) compPlaceholder.textContent = t('selectVersions', lang);
    
        const concPlaceholder = document.querySelector('[data-mode="concordancia"] .placeholder');
        if (concPlaceholder) concPlaceholder.textContent = t('placeholderSearch', lang);
    
        const strongPlaceholder = document.querySelector('[data-mode="strong"] .placeholder');
        if (strongPlaceholder) strongPlaceholder.textContent = t('placeholderStrong', lang);
    
        const bookOption = document.querySelector('#book option:first-child');
        if (bookOption) bookOption.textContent = t('selectBook', lang);
    
        const chapterOption = document.querySelector('#chapter option:first-child');
        if (chapterOption) chapterOption.textContent = t('selectChapter', lang);
    
        const verseOption = document.querySelector('#verse option:first-child');
        if (verseOption) verseOption.textContent = t('allChapter', lang);
    }

    // =====================
    // 14. SELECCIÓN Y COPIA DE VERSÍCULOS
    // =====================
    function toggleVerseSelection(event) {
        const verseNumberSpan = event.target;
        const verseNumber = parseInt(verseNumberSpan.dataset.verseNumber);
        const index = selectedVerses.indexOf(verseNumber);
        if (index > -1) {
            selectedVerses.splice(index, 1);
            verseNumberSpan.classList.remove('selected');
        } else {
            selectedVerses.push(verseNumber);
            verseNumberSpan.classList.add('selected');
        }
        selectedVerses.sort((a, b) => a - b);
        updateCopyButtonVisibility();
    }

    function updateCopyButtonVisibility() {
        if (selectedVerses.length > 0) {
            copyVersesBtn.style.display = 'flex';
            selectedVersesCount.textContent = selectedVerses.length;
        } else {
            copyVersesBtn.style.display = 'none';
        }
    }

    function showCopyModal() {
        if (selectedVerses.length === 0) return;
        const bookName    = bookSelect.options[bookSelect.selectedIndex]?.text;
        const chapterNum  = chapterSelect.options[chapterSelect.selectedIndex]?.dataset.number;
        const versionName = versionSelect.options[versionSelect.selectedIndex]?.text;
        let versesRange = '';
        if (selectedVerses.length === 1) {
            versesRange = selectedVerses[0];
        } else {
            const sorted = [...selectedVerses].sort((a, b) => a - b);
            let isConsecutive = true;
            for (let i = 0; i < sorted.length - 1; i++) {
                if (sorted[i + 1] !== sorted[i] + 1) { isConsecutive = false; break; }
            }
            versesRange = isConsecutive
                ? `${sorted[0]}-${sorted[sorted.length - 1]}`
                : sorted.join(', ');
        }
        let textToCopy = `${bookName} ${chapterNum}:${versesRange} (${versionName}):\n\n`;
        selectedVerses.forEach(vNum => {
            const verse = currentVersesData.find(v => v.number === vNum);
            if (verse) textToCopy += `${verse.number}. ${verse.text}\n`;
        });
        selectedVersesTextarea.value = textToCopy.trim();
        copyFeedback.textContent = '';
        copyModal.style.display = 'flex';
    }

    function hideCopyModal() {
        copyModal.style.display = 'none';
        copyFeedback.textContent = '';
    }

    async function copySelectedVersesToClipboard() {
        try {
            await navigator.clipboard.writeText(selectedVersesTextarea.value);
            copyFeedback.textContent = '¡Copiado al portapapeles!';
        } catch (err) {
            copyFeedback.textContent = 'Error al copiar. Por favor, intenta de nuevo.';
        }
    }

    function clearSelections() {
        selectedVerses = [];
        content.querySelectorAll('.verse-number.selected').forEach(span => {
            span.classList.remove('selected');
        });
        updateCopyButtonVisibility();
        hideCopyModal();
    }

    // =====================
    // 15. EVENTOS
    // =====================

    // ✅ LISTENERS UNIFICADOS - un solo listener por elemento
    versionSelect.addEventListener('change', () => {
        clearSelections();
        concVersion.value = versionSelect.value; // sincronizar concordancia
        onVersionChange();
    });

    bookSelect.addEventListener('change', () => {
        clearSelections();
        onBookChange();
    });

    chapterSelect.addEventListener('change', () => {
        clearSelections();
        onChapterChange();
    });

    verseSelect.addEventListener('change', onSearch);

    // Sincronización concordancia ↔ lectura (solo en una dirección para evitar loop)
    concVersion.addEventListener('change', () => {
        versionSelect.value = concVersion.value;
    });

    copyVersesBtn.addEventListener('click', showCopyModal);
    closeCopyModal.addEventListener('click', hideCopyModal);
    doCopyBtn.addEventListener('click', copySelectedVersesToClipboard);
    window.addEventListener('click', (event) => {
        if (event.target === copyModal) hideCopyModal();
    });

    // =====================
    // AUTO-COLAPSAR AL EMPEZAR A LEER
    // =====================
    function autoCollapseFilters() {
        if (currentMode === 'lectura')      filterToggleLectura?.collapse();
        if (currentMode === 'comparacion')  filterToggleComp?.collapse();
        if (currentMode === 'concordancia') filterToggleConc?.collapse();
        if (currentMode === 'strong')       filterToggleStrong?.collapse();
    }

    content.addEventListener('mousedown', autoCollapseFilters);
    content.addEventListener('touchstart', autoCollapseFilters, { passive: true });
    window.addEventListener('wheel', autoCollapseFilters, { passive: true });
    window.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowDown' || e.key === 'PageDown') autoCollapseFilters();
    });

    // =====================
    // 16. CARGA INICIAL
    // =====================
    async function loadVersions() {
        try {
            const currentLang = localStorage.getItem('appLanguage') || 'es';
            const allVersions = await fetchJSON(`${API_URL}/api/versions`);
            let versions = allVersions.filter(v => v.language === currentLang);
            if (versions.length === 0) versions = allVersions;

            [versionSelect, concVersion, compVersionA, compVersionB].forEach((sel) => {
                const currentVal = sel.value;
                sel.innerHTML = '';
                versions.forEach((v, j) => {
                    const opt = document.createElement('option');
                    opt.value = v.name;
                    opt.textContent = v.fullName;
                    if (sel === compVersionB && versions.length > 1 ? j === 1 : j === 0) {
                        opt.selected = true;
                    }
                    sel.appendChild(opt);
                });
                if (currentVal && Array.from(sel.options).some(opt => opt.value === currentVal)) {
                    sel.value = currentVal;
                }
            });

            if (versionSelect.value) loadBooks(versionSelect.value);
            if (compVersionA.value && currentMode === 'comparacion') loadCompBooks();
            
        } catch (e) {
            console.error('Error cargando versiones:', e);
            if (versionSelect.value) loadBooks(versionSelect.value);
        }
    }

    loadVersions();
    loadStrongVersions();

    // =====================
    // 17. NAVEGACIÓN ENTRE CAPÍTULOS
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

    updateComparisonOrientationHint();
    window.addEventListener('resize', updateComparisonOrientationHint);

    // =====================
    // 18. INICIALIZAR COMENTARIOS
    // =====================

    // Nueva función que simula el comportamiento de Concordancia y Strong
    async function navigateToCommentaryReference(bookName, chapterNum, verseNum) {
        const version = versionSelect.value; // Usamos la versión de lectura actual
        content.innerHTML = '<p class="loading">📖 Abriendo en modo lectura...</p>';
        
        try {
            // 1. Cargar libros si no están en caché
            if (!cache.books[version]) {
                const data = await fetchJSON(`${API_URL}/api/books?version=${version}`);
                cache.books[version] = data;
            }
            renderBooks(cache.books[version]);
            
            // 2. Buscar y seleccionar el libro
            const book = cache.books[version].find(b => b.name === bookName);
            if (!book) { showError(`No se encontró el libro "${bookName}"`); return; }
            bookSelect.value = book.id;
            
            // 3. Cargar capítulos del libro
            if (!cache.chapters[book.id]) {
                const chaptersData = await fetchJSON(`${API_URL}/api/chapters?bookId=${book.id}`);
                cache.chapters[book.id] = chaptersData;
            }
            renderChapters(cache.chapters[book.id]);
            
            // 4. Buscar y seleccionar el capítulo
            const chapter = cache.chapters[book.id].find(ch => String(ch.number) === String(chapterNum));
            if (!chapter) { showError(`No se encontró el capítulo ${chapterNum}`); return; }
            chapterSelect.value = chapter.id;
            
            // 5. Cargar versículos
            const cacheKey = `${chapter.id}-all`;
            if (!cache.verses[cacheKey]) {
                const versesData = await fetchJSON(`${API_URL}/api/verses?chapterId=${chapter.id}`);
                cache.verses[cacheKey] = versesData;
            }
            renderVerseSelect(cache.verses[cacheKey]);
            
            // 6. Seleccionar versículo si hay uno, sino, cargar todo el capítulo
            verseSelect.value = verseNum ? String(verseNum) : "";
            
            // 7. Cambiar la interfaz al modo "lectura"
            currentMode = 'lectura';
            modeTabs.forEach(t => t.classList.toggle('active', t.dataset.mode === 'lectura'));
            panelLectura.style.display      = '';
            panelConcordancia.style.display = 'none';
            panelComparacion.style.display  = 'none';
            panelStrong.style.display       = 'none';
            
            // 8. Cargar el texto en pantalla
            onSearch();
            
        } catch (e) { 
            showError('Error al navegar a la referencia del comentario'); 
        }
    }

    // Inicializamos inyectando el callback
    initCommentary({
        commentaryBottomPanel:   document.getElementById('commentaryBottomPanel'),
        commentaryBottomRef:     document.getElementById('commentaryBottomRef'),
        commentaryBottomClose:   document.getElementById('commentaryBottomClose'),
        commentaryBottomContent: document.getElementById('commentaryBottomContent')
    }, {
        onLoadReference: (book, chapter, verse) => {
            navigateToCommentaryReference(book, chapter, verse);
            
            // Opcional: Si quieres que el panel de comentarios se cierre automáticamente
            // al hacer clic para que tengas toda la pantalla para leer, descomenta la siguiente línea:
            // closeCommentaryPanel();
        }
    });

    // =====================
    // 20. NAVEGACIÓN DESDE CITAS EN COMENTARIOS
    // =====================
    
    /**
     * Navega a una referencia bíblica desde un enlace en el texto del comentario.
     * Soporta:
     *   - Versículo simple:  Juan 3:16
     *   - Solo capítulo:     2 Pedro 2
     *   - Rango:             Lucas 15:28-32
     *   - Lista:             1 Co 16:1,2
     */
    async function navigateFromBibleLink(book, chapter, verseData) {
        const version = versionSelect.value;
    
        // ── 1. Resolver qué versículos mostrar ──────────────────
        const verseNumbers = parseVerseData(verseData); 
        // null → todo el capítulo
        // [5]  → solo el 5
        // [28,29,30,31,32] → rango
        // [1,2] → lista
    
        content.innerHTML = '<p class="loading">📖 Cargando referencia...</p>';
    
        try {
            // ── 2. Cargar libros ────────────────────────────────
            if (!cache.books[version]) {
                const data = await fetchJSON(`${API_URL}/api/books?version=${version}`);
                cache.books[version] = data;
            }
            renderBooks(cache.books[version]);
    
            // ── 3. Buscar el libro ──────────────────────────────
            // Búsqueda flexible: exacta primero, luego insensible a acentos
            let book_ = cache.books[version].find(
                b => b.name.toLowerCase() === book.toLowerCase()
            );
            if (!book_) {
                book_ = cache.books[version].find(
                    b => removeAccents(b.name).toLowerCase() 
                      === removeAccents(book).toLowerCase()
                );
            }
            if (!book_) {
                showError(`No se encontró el libro "${book}"`);
                return;
            }
            bookSelect.value = book_.id;
    
            // ── 4. Cargar capítulos ─────────────────────────────
            if (!cache.chapters[book_.id]) {
                const chaptersData = await fetchJSON(
                    `${API_URL}/api/chapters?bookId=${book_.id}`
                );
                cache.chapters[book_.id] = chaptersData;
                localStorage.setItem(
                    `chapters_${book_.id}`, 
                    JSON.stringify(chaptersData)
                );
            }
            renderChapters(cache.chapters[book_.id]);
    
            // ── 5. Seleccionar capítulo ─────────────────────────
            const chapterObj = cache.chapters[book_.id].find(
                ch => String(ch.number) === String(chapter)
            );
            if (!chapterObj) {
                showError(`No se encontró el capítulo ${chapter}`);
                return;
            }
            chapterSelect.value = chapterObj.id;
    
            // ── 6. Cargar versículos ────────────────────────────
            const cacheKey = `${chapterObj.id}-all`;
            if (!cache.verses[cacheKey]) {
                const versesData = await fetchJSON(
                    `${API_URL}/api/verses?chapterId=${chapterObj.id}`
                );
                cache.verses[cacheKey] = versesData;
            }
    
            const allVerses = cache.verses[cacheKey];
            renderVerseSelect(allVerses);
    
            // ── 7. Cambiar a modo lectura ───────────────────────
            currentMode = 'lectura';
            modeTabs.forEach(t => 
                t.classList.toggle('active', t.dataset.mode === 'lectura')
            );
            panelLectura.style.display      = '';
            panelConcordancia.style.display = 'none';
            panelComparacion.style.display  = 'none';
            panelStrong.style.display       = 'none';
    
            // ── 8. Renderizar ───────────────────────────────────
    
            if (!verseNumbers) {
                // Todo el capítulo
                verseSelect.value = '';
                renderVerses(allVerses, '');
    
            } else if (verseNumbers.length === 1) {
                // Versículo simple — usa el select normal
                verseSelect.value = String(verseNumbers[0]);
                const filtered = allVerses.filter(
                    v => v.number === verseNumbers[0]
                );
                renderVerses(filtered, verseNumbers[0]);
    
            } else {
                // ✅ RANGO o LISTA — no existe en el select, renderizamos directamente
                verseSelect.value = ''; // dejamos en "todo el capítulo" visualmente
                const filtered = allVerses.filter(
                    v => verseNumbers.includes(v.number)
                );
                renderVersesRange(filtered, verseNumbers, book_.name, chapterObj.number);
            }
    
        } catch (e) {
            console.error(e);
            showError('Error al navegar a la referencia');
        }
    }
    
    
    /**
     * Igual que renderVerses() pero para rangos/listas desde citas.
     * Muestra los versículos resaltados con una etiqueta indicativa.
     */
    function renderVersesRange(verses, verseNumbers, bookName, chapterNum) {
    
        // Etiqueta de rango para el reference
        let rangeLabel;
        const sorted = [...verseNumbers].sort((a, b) => a - b);
    
        // ¿Son consecutivos?
        const isConsecutive = sorted.every(
            (v, i) => i === 0 || v === sorted[i - 1] + 1
        );
    
        if (isConsecutive) {
            rangeLabel = sorted.length === 1
                ? `${sorted[0]}`
                : `${sorted[0]}-${sorted[sorted.length - 1]}`;
        } else {
            rangeLabel = sorted.join(',');
        }
    
        if (reference) {
            reference.textContent = `${bookName} ${chapterNum}:${rangeLabel}`;
            reference.classList.add('visible');
        }
    
        currentVersesData = verses;
    
        // Renderiza con resaltado especial en los versículos del rango
        content.innerHTML = verses.map(v => `
            <p class="verse verse-highlighted">
                <span class="verse-number" data-verse-number="${v.number}">${v.number}</span>
                ${v.text}
            </p>
        `).join('');
    
        content.querySelectorAll('.verse-number').forEach(span => {
            span.addEventListener('click', toggleVerseSelection);
        });
    
        // Actualizar botón de filtros
        setTimeout(() => {
            const ref = reference?.textContent?.trim();
            filterToggleLectura?.updateRef(ref || 'Selecciona un libro');
        }, 100);
    
        // Scroll al inicio
        window.scrollTo({ top: 0, behavior: 'smooth' });
        updateCopyButtonVisibility();
    }

    // =====================
    // 19. REFERENCE CLICKEABLE → COMENTARIOS
    // =====================
    if (reference) {
        reference.style.cursor = 'pointer';
        reference.title = 'Click para ver comentarios';
        reference.addEventListener('click', () => {
            if (currentMode !== 'lectura') return;
            const refText = reference.textContent?.trim();
            if (!refText) return;
            openCommentaryForReference(refText, versionSelect.value);
        });
    }

    // =====================
    // 20. INICIALIZAR ENLACES DE CITAS BÍBLICAS
    // =====================
    initBibleLinks((book, chapter, verseData) => {
        navigateFromBibleLink(book, chapter, verseData);
    });

}); // ← fin DOMContentLoaded
