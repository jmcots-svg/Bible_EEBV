// ⚠️ URL de tu backend
const API_URL = 'https://bible-eebv.jmcots-svg.deno.net';

// Helper seguro para fetch
async function fetchJSON(url, signal = null) {
    const res = await fetch(url, { signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
}

// Almacenes de caché
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
    const versionSelect = document.getElementById('version');
    const bookSelect = document.getElementById('book');
    const chapterSelect = document.getElementById('chapter');
    const verseSelect = document.getElementById('verse');
    
    const content = document.getElementById('content');
    const reference = document.getElementById('reference');
    const mainTitle = document.getElementById('mainTitle');
    const themeCheckbox = document.getElementById('themeCheckbox');

    // Concordancia
    const concVersion = document.getElementById('concVersion');
    const concTestament = document.getElementById('concTestament');
    const concQuery = document.getElementById('concQuery');
    const concSearchBtn = document.getElementById('concSearchBtn');
    const concExact = document.getElementById('concExact');

    // Tabs
    const modeTabs = document.querySelectorAll('.mode-tab');
    const panelLectura = document.getElementById('panelLectura');
    const panelConcordancia = document.getElementById('panelConcordancia');

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

// =====================
// 3. TABS - CAMBIO DE MODO
// =====================
modeTabs.forEach(tab => {
    tab.addEventListener('click', () => {
        const mode = tab.dataset.mode;
        if (mode === currentMode) return;

        currentMode = mode;

        // Actualizar tabs activos
        modeTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        // Mostrar/ocultar paneles
        if (mode === 'lectura') {
            panelLectura.style.display = '';
            panelConcordancia.style.display = 'none';

            // ✅ Restaurar contenido de Lectura desde caché
            if (chapterSelect.value) {
                onSearch(); // Re-renderiza capítulo/versículo actual desde caché
            } else if (bookSelect.value) {
                content.innerHTML = '<p class="placeholder">Selecciona un capítulo</p>';
                if (reference) {
                    reference.textContent = '';
                    reference.classList.remove('visible');
                }
            } else {
                content.innerHTML = '<p class="placeholder">Selecciona una versión y libro para comenzar</p>';
                if (reference) {
                    reference.textContent = '';
                    reference.classList.remove('visible');
                }
            }

        } else if (mode === 'concordancia') {
            panelLectura.style.display = 'none';
            panelConcordancia.style.display = '';

            // ✅ Restaurar resultados de Concordancia desde caché
            if (currentSearchData) {
                renderSearchResults(currentSearchData);
            } else {
                content.innerHTML = '<p class="placeholder">Escribe una palabra o frase para buscar en toda la Biblia</p>';
                if (reference) {
                    reference.textContent = '';
                    reference.classList.remove('visible');
                }
            }
        }
    });
});

    // =====================
    // 4. FUNCIONES MODO LECTURA
    // =====================
    async function loadBooks(version) {
        if (!version) return;
        if (cache.books[version]) {
            renderBooks(cache.books[version]);
            return;
        }
        try {
            const data = await fetchJSON(`${API_URL}/api/books?version=${version}`);
            cache.books[version] = data;
            renderBooks(data);
        } catch (e) {
            showError('Error al cargar libros');
        }
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

        if (cache.chapters[bookId]) {
            renderChapters(cache.chapters[bookId]);
            return;
        }

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
        } catch (e) {
            showError('Error al cargar capítulos');
        }
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

        if (cache.verses[cacheKey]) {
            renderVerseSelect(cache.verses[cacheKey]);
            onSearch(); // <-- Disparar búsqueda automática
            return;
        }

        try {
            isFetching = true;
            content.innerHTML = '<p class="loading">Cargando capítulo...</p>'; // Feedback visual

            if (versesAbort) versesAbort.abort();
            versesAbort = new AbortController();

            const verses = await fetchJSON(
                `${API_URL}/api/verses?chapterId=${chId}`,
                versesAbort.signal
            );
            cache.verses[cacheKey] = verses;
            renderVerseSelect(verses);
            onSearch(); // <-- Disparar búsqueda automática tras cargar
            
        } catch (e) {
            if (e.name === "AbortError") return;
            showError('Error al cargar versículos');
            console.error(e);
        } finally {
            isFetching = false;
        }
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
        if (reference) {
            reference.textContent = '';
            reference.classList.remove('visible');
        }

        const cacheKeyAll = `${chId}-all`;
        let versesToRender = [];

        try {
            if (cache.verses[cacheKeyAll]) {
                versesToRender = cache.verses[cacheKeyAll];
            } else {
                if (versesAbort) versesAbort.abort();
                versesAbort = new AbortController();
                versesToRender = await fetchJSON(
                    `${API_URL}/api/verses?chapterId=${chId}`,
                    versesAbort.signal
                );
                cache.verses[cacheKeyAll] = versesToRender;
            }

            if (vNum) {
                versesToRender = versesToRender.filter(
                    v => String(v.number) === String(vNum)
                );
            }
            renderVerses(versesToRender, vNum);
        } catch (e) {
            if (e.name === "AbortError") return;
            showError('Error al buscar el contenido');
            console.error(e);
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

        content.innerHTML = verses.map(v => `
            <p class="verse">
                <span class="verse-number">${v.number}</span>${v.text}
            </p>
        `).join('');

        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    async function showComparison(bookName, chapter, verse) {
        try {
            content.innerHTML = '<p class="loading">Comparando versiones...</p>';
            const data = await fetchJSON(
                `${API_URL}/api/compare?bookName=${encodeURIComponent(bookName)}&chapter=${chapter}&verse=${verse}`
            );

            content.innerHTML = `<h3 style="margin-bottom:20px">📍 ${bookName} ${chapter}:${verse}</h3>`;
            data.forEach(c => {
                const card = document.createElement('div');
                card.className = 'comparison-card';
                card.innerHTML = `
                    <small class="version-badge">${c.version}</small>
                    <p class="verse-text">${c.text}</p>
                `;
                content.appendChild(card);
            });

            const backBtn = document.createElement('button');
            backBtn.textContent = '⬅ Volver';
            backBtn.className = 'back-btn';
            backBtn.onclick = onSearch;
            content.appendChild(backBtn);
        } catch (e) {
            showError('Error en la comparación');
        }
    }

    // =====================
    // 5. FUNCIONES MODO CONCORDANCIA
    // =====================
    let searchAbort = null;
    let currentSearchPage = 1;
    let currentSearchData = null;

    async function onConcordanciaSearch(page = 1) {
        const query = concQuery.value.trim();
        const version = concVersion.value;
        const testament = concTestament.value;

        if (!query || query.length < 2) {
            showError('Escribe al menos 2 caracteres para buscar');
            return;
        }

        currentSearchPage = page;

        content.innerHTML = '<p class="loading">🔍 Buscando en toda la Biblia...</p>';
        if (reference) {
            reference.textContent = '';
            reference.classList.remove('visible');
        }

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
            renderSearchResults(data);  // ✅ Sin nada extra aquí

        } catch (e) {
            if (e.name === "AbortError") return;
            showError('Error al realizar la búsqueda');
            console.error(e);
        } finally {
            concSearchBtn.disabled = false;
            concSearchBtn.textContent = '🔎 Buscar';
        }
    }

    function isExactWordMatch(text, query) {
        const normalized = removeAccents(text.toLowerCase());
        const normalizedQ = removeAccents(query.toLowerCase().trim());
        const escaped = escapeRegExp(normalizedQ);
        const regex = new RegExp(`\\b${escaped}\\b`, 'i');
        return regex.test(normalized);
    }

function renderSearchResults(data) {
    const exactMode = concExact && concExact.checked;
    let results = data.results;

    // ✅ Filtrar por palabra exacta si está activado
    if (exactMode) {
        results = results.filter(r => isExactWordMatch(r.text, data.query));
    }

    if (reference) {
        reference.textContent = `Resultados para "${data.query}"`;
        reference.classList.add('visible');
    }

    // Si no hay resultados (ni antes ni después de filtrar)
    if (data.total === 0 || (exactMode && results.length === 0 && data.results.length === 0)) {
        content.innerHTML = `
            <div class="search-no-results">
                <p class="search-icon">🔍</p>
                <h3>No se encontraron resultados</h3>
                <p>No hay coincidencias para "<strong>${escapeHtml(data.query)}</strong>" 
                en ${data.testament === 'ALL' ? 'toda la Biblia' : data.testament === 'OT' ? 'el Antiguo Testamento' : 'el Nuevo Testamento'}
                (${data.version})</p>
            </div>
        `;
        return;
    }

    // Si se filtró todo en esta página pero hay más páginas
    if (exactMode && results.length === 0) {
        content.innerHTML = `
            <div class="search-no-results">
                <p class="search-icon">🔎</p>
                <h3>Sin coincidencias exactas en esta página</h3>
                <p>Los ${data.results.length} resultados de esta página contienen "<strong>${escapeHtml(data.query)}</strong>" 
                como parte de otra palabra. Prueba en las siguientes páginas.</p>
            </div>
        `;

        // Aún mostrar paginación
        if (data.totalPages > 1) {
            let pagHtml = `<div class="search-pagination">`;
            if (data.page > 1) {
                pagHtml += `<button class="pagination-btn" data-page="${data.page - 1}">⬅ Anterior</button>`;
            }
            pagHtml += `<span class="pagination-info">Página ${data.page} de ${data.totalPages}</span>`;
            if (data.page < data.totalPages) {
                pagHtml += `<button class="pagination-btn" data-page="${data.page + 1}">Siguiente ➡</button>`;
            }
            pagHtml += `</div>`;
            content.innerHTML += pagHtml;

            content.querySelectorAll('.pagination-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    onConcordanciaSearch(parseInt(btn.dataset.page));
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                });
            });
        }
        return;
    }

    // Stats bar
    const startResult = (data.page - 1) * data.limit + 1;
    const endResult = Math.min(data.page * data.limit, data.total);

    let html = `
        <div class="search-stats">
            <span class="search-total">📊 ${data.total.toLocaleString()} resultado${data.total !== 1 ? 's' : ''} para "<strong>${escapeHtml(data.query)}</strong>"
                ${exactMode ? `<span class="search-exact-badge">Palabra exacta: ${results.length} en esta página</span>` : ''}
            </span>
            <span class="search-range">Mostrando ${startResult}-${endResult}</span>
        </div>
    `;

    // Results (usar 'results' filtrado)
    results.forEach(r => {
        const highlightedText = exactMode
            ? highlightExactWord(r.text, data.query)
            : highlightText(r.text, data.query);
        const testamentIcon = r.testament === 'OT' ? '📜' : '✝️';

        html += `
            <div class="search-result-card">
                <div class="search-result-header">
                    <a href="#" class="search-result-ref search-nav-link"
                       data-book="${escapeHtml(r.book)}"
                       data-chapter="${r.chapter}"
                       data-verse="${r.verse}">
                        ${testamentIcon} ${r.book} ${r.chapter}:${r.verse}
                    </a>
                </div>
                <p class="search-result-text">${highlightedText}</p>
            </div>
        `;
    });

    // Pagination
    if (data.totalPages > 1) {
        html += `<div class="search-pagination">`;
        if (data.page > 1) {
            html += `<button class="pagination-btn" data-page="${data.page - 1}">⬅ Anterior</button>`;
        }
        html += `<span class="pagination-info">Página ${data.page} de ${data.totalPages}</span>`;
        if (data.page < data.totalPages) {
            html += `<button class="pagination-btn" data-page="${data.page + 1}">Siguiente ➡</button>`;
        }
        html += `</div>`;
    }

    content.innerHTML = html;

    // Bind pagination events
    content.querySelectorAll('.pagination-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            onConcordanciaSearch(parseInt(btn.dataset.page));
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    });

    // Bind navigation events
    content.querySelectorAll('.search-nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            navigateToVerse(link.dataset.book, link.dataset.chapter, link.dataset.verse);
        });
    });
}

    

function removeAccents(str) {
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function highlightExactWord(text, query) {
    if (!query) return escapeHtml(text);

    const normalizedText = removeAccents(text.toLowerCase());
    const normalizedQuery = removeAccents(query.toLowerCase().trim());

    // Buscar solo coincidencias de palabra completa
    const regex = new RegExp(`\\b${escapeRegExp(normalizedQuery)}\\b`, 'gi');
    const matches = [];
    let match;

    while ((match = regex.exec(normalizedText)) !== null) {
        matches.push({ start: match.index, end: match.index + normalizedQuery.length });
    }

    if (matches.length === 0) return escapeHtml(text);

    let result = '';
    let lastEnd = 0;

    for (const m of matches) {
        result += escapeHtml(text.substring(lastEnd, m.start));
        result += `<mark class="search-highlight">${escapeHtml(text.substring(m.start, m.end))}</mark>`;
        lastEnd = m.end;
    }

    result += escapeHtml(text.substring(lastEnd));
    return result;
}
    
function highlightText(text, query) {
    if (!query) return escapeHtml(text);
    
    // Trabajar sobre el texto ORIGINAL (sin escapar) para posiciones correctas
    const normalizedText = removeAccents(text.toLowerCase());
    const normalizedQuery = removeAccents(query.toLowerCase());
    
    // Encontrar todas las posiciones en el texto original
    const matches = [];
    let searchFrom = 0;
    
    while (searchFrom < normalizedText.length) {
        const index = normalizedText.indexOf(normalizedQuery, searchFrom);
        if (index === -1) break;
        matches.push({ start: index, end: index + normalizedQuery.length });
        searchFrom = index + 1;
    }
    
    if (matches.length === 0) return escapeHtml(text);
    
    // Construir resultado escapando cada fragmento individualmente
    let result = '';
    let lastEnd = 0;
    
    for (const match of matches) {
        // Escapar la parte antes del match
        result += escapeHtml(text.substring(lastEnd, match.start));
        // El match va dentro del <mark>, también escapado
        result += `<mark class="search-highlight">${escapeHtml(text.substring(match.start, match.end))}</mark>`;
        lastEnd = match.end;
    }
    
    // Escapar lo que queda después del último match
    result += escapeHtml(text.substring(lastEnd));
    
    return result;
}

    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    function escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }


    // =====================
// 5b. NAVEGACIÓN DESDE CONCORDANCIA A LECTURA
// =====================
async function navigateToVerse(bookName, chapterNum, verseNum) {
    const version = concVersion.value || versionSelect.value;

    // Feedback visual
    content.innerHTML = '<p class="loading">📖 Abriendo en modo lectura...</p>';

    try {
        // 1. Asegurar versión correcta en Lectura
        versionSelect.value = version;
        if (mainTitle && versionSelect.selectedIndex >= 0) {
            mainTitle.textContent = `📖 Biblia ${versionSelect.options[versionSelect.selectedIndex].text}`;
        }

        // 2. Cargar libros si no están en caché
        if (!cache.books[version]) {
            const data = await fetchJSON(`${API_URL}/api/books?version=${version}`);
            cache.books[version] = data;
        }
        renderBooks(cache.books[version]);

        // 3. Encontrar el libro por nombre
        const book = cache.books[version].find(b => b.name === bookName);
        if (!book) {
            showError(`No se encontró el libro "${bookName}"`);
            return;
        }
        bookSelect.value = book.id;

        // 4. Cargar capítulos si no están en caché
        if (!cache.chapters[book.id]) {
            const chaptersData = await fetchJSON(`${API_URL}/api/chapters?bookId=${book.id}`);
            cache.chapters[book.id] = chaptersData;
            localStorage.setItem(`chapters_${book.id}`, JSON.stringify(chaptersData));
        }
        renderChapters(cache.chapters[book.id]);

        // 5. Encontrar el capítulo por número
        const chapter = cache.chapters[book.id].find(
            ch => String(ch.number) === String(chapterNum)
        );
        if (!chapter) {
            showError(`No se encontró el capítulo ${chapterNum}`);
            return;
        }
        chapterSelect.value = chapter.id;

        // 6. Cargar versículos si no están en caché
        const cacheKey = `${chapter.id}-all`;
        if (!cache.verses[cacheKey]) {
            const versesData = await fetchJSON(`${API_URL}/api/verses?chapterId=${chapter.id}`);
            cache.verses[cacheKey] = versesData;
        }
        renderVerseSelect(cache.verses[cacheKey]);

        // 7. Seleccionar el versículo
        verseSelect.value = String(verseNum);

        // 8. Cambiar a pestaña Lectura (visual)
        currentMode = 'lectura';
        modeTabs.forEach(t => {
            if (t.dataset.mode === 'lectura') {
                t.classList.add('active');
            } else {
                t.classList.remove('active');
            }
        });
        panelLectura.style.display = '';
        panelConcordancia.style.display = 'none';

        // 9. Renderizar el contenido
        onSearch();

    } catch (e) {
        showError('Error al navegar al versículo');
        console.error(e);
    }
}

    // =====================
    // 6. UTILIDADES COMPARTIDAS
    // =====================
    function resetSelects(ids) {
        ids.forEach(id => {
            const el = document.getElementById(id);
            if (!el) return;
            if (id === 'book')
                el.innerHTML = '<option value="">Cargando...</option>';
            if (id === 'chapter')
                el.innerHTML = '<option value="">-- Selecciona libro --</option>';
            if (id === 'verse')
                el.innerHTML = '<option value="">Todo el capítulo</option>';
            el.disabled = true;
        });
    }

    function showError(msg) {
        content.innerHTML = `<p class="error">❌ ${msg}</p>`;
        if (reference) reference.classList.remove('visible');
    }

    // =====================
    // 7. EVENTOS
    // =====================

    // Modo Lectura
    versionSelect.addEventListener('change', onVersionChange);
    bookSelect.addEventListener('change', onBookChange);
    chapterSelect.addEventListener('change', onChapterChange);
    verseSelect.addEventListener('change', onSearch); // <-- NUEVO: Buscar al cambiar el versículo


    // Modo Concordancia
    concSearchBtn.addEventListener('click', () => onConcordanciaSearch(1));

    concQuery.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            onConcordanciaSearch(1);
        }
    });

    // Sincronizar versión entre ambos modos
    concVersion.addEventListener('change', () => {
        versionSelect.value = concVersion.value;
    });

    versionSelect.addEventListener('change', () => {
        concVersion.value = versionSelect.value;
    });

    // =====================
    // 8. CARGA INICIAL
    // =====================
    if (versionSelect.value) {
        loadBooks(versionSelect.value);
    }

// =====================
// 8. CARGA INICIAL - Versiones dinámicas
// =====================
async function loadVersions() {
    try {
        const versions = await fetchJSON(`${API_URL}/api/versions`);
        
        // Limpiar y rellenar ambos selects
        [versionSelect, concVersion].forEach(sel => {
            sel.innerHTML = '';
            versions.forEach((v, i) => {
                const opt = document.createElement('option');
                opt.value = v.name;          // 'RV60', 'LBLA', 'BEC'...
                opt.textContent = v.fullName; // nombre completo
                if (i === 0) opt.selected = true;
                sel.appendChild(opt);
            });
        });

        // Cargar libros de la versión por defecto
        if (versionSelect.value) {
            loadBooks(versionSelect.value);
        }

    } catch (e) {
        console.error('Error cargando versiones:', e);
        // Fallback: si falla la API, dejamos las opciones hardcodeadas
    }
}

loadVersions();
    
// =====================
// NAVEGACIÓN ENTRE CAPÍTULOS
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

// --- Soporte para Teclado (Flechas) ---
document.addEventListener('keydown', (e) => {
    // Solo si no estamos escribiendo en el buscador de concordancia
    if (document.activeElement.tagName === 'INPUT') return;

    if (e.key === 'ArrowRight') cambiarCapitulo('sig');
    if (e.key === 'ArrowLeft') cambiarCapitulo('ant');
});

// --- Soporte para Gestos (Swipe) Mejorado ---
let touchStartX = 0;
let touchStartY = 0; // Añadimos Y para evitar conflictos con el scroll

// Aplicamos el listener a todo el cuerpo o al contenedor principal
const swipeArea = document.getElementById('content'); 

swipeArea.addEventListener('touchstart', e => {
    touchStartX = e.changedTouches[0].screenX;
    touchStartY = e.changedTouches[0].screenY;
}, { passive: true });

swipeArea.addEventListener('touchend', e => {
    const touchEndX = e.changedTouches[0].screenX;
    const touchEndY = e.changedTouches[0].screenY;
    
    const diffX = touchEndX - touchStartX;
    const diffY = touchEndY - touchStartY;

    const umbral = 80; // Píxeles mínimos para el swipe
    
    // Verificamos que el movimiento sea mayormente horizontal y no vertical
    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > umbral) {
        if (diffX < 0) {
            cambiarCapitulo('sig'); // Deslizar a la izquierda
        } else {
            cambiarCapitulo('ant'); // Deslizar a la derecha
        }
    }
}, { passive: true });


});
