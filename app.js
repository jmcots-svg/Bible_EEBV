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
                content.innerHTML = '<p class="placeholder">Selecciona una versión y libro para comenzar</p>';
            } else {
                panelLectura.style.display = 'none';
                panelConcordancia.style.display = '';
                content.innerHTML = '<p class="placeholder">Escribe una palabra o frase para buscar en toda la Biblia</p>';
            }

            if (reference) {
                reference.textContent = '';
                reference.classList.remove('visible');
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
        if (mainTitle && versionSelect.selectedIndex >= 0) {
            mainTitle.textContent = `📖 Biblia ${versionSelect.options[versionSelect.selectedIndex].text}`;
        }
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

        if (vNum) {
            const btn = document.createElement('button');
            btn.textContent = '🔄 Comparar versiones';
            btn.className = 'btn-search';
            btn.style.marginTop = '20px';
            btn.onclick = () => showComparison(bName, chNum, vNum);
            content.appendChild(btn);
        }

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

        // Show loading
        content.innerHTML = '<p class="loading">🔍 Buscando en toda la Biblia...</p>';
        if (reference) {
            reference.textContent = '';
            reference.classList.remove('visible');
        }

        // Disable button
        concSearchBtn.disabled = true;
        concSearchBtn.textContent = '⏱️...';

        // Cache key
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
            console.error(e);
        } finally {
            concSearchBtn.disabled = false;
            concSearchBtn.textContent = '🔎 Buscar';
        }
    }

    function renderSearchResults(data) {
        if (reference) {
            reference.textContent = `Resultados para "${data.query}"`;
            reference.classList.add('visible');
        }

        if (data.total === 0) {
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

        // Stats bar
        const startResult = (data.page - 1) * data.limit + 1;
        const endResult = Math.min(data.page * data.limit, data.total);

        let html = `
            <div class="search-stats">
                <span class="search-total">📊 ${data.total.toLocaleString()} resultado${data.total !== 1 ? 's' : ''} para "<strong>${escapeHtml(data.query)}</strong>"</span>
                <span class="search-range">Mostrando ${startResult}-${endResult}</span>
            </div>
        `;

        // Results
        data.results.forEach(r => {
            const highlightedText = highlightText(r.text, data.query);
            const testamentIcon = r.testament === 'OT' ? '📜' : '✝️';

            html += `
                <div class="search-result-card">
                    <div class="search-result-header">
                        <span class="search-result-ref">${testamentIcon} ${r.book} ${r.chapter}:${r.verse}</span>
                    </div>
                    <p class="search-result-text">${highlightedText}</p>
                </div>
            `;
        });

        // Pagination
        if (data.totalPages > 1) {
            html += `<div class="search-pagination">`;

            // Previous
            if (data.page > 1) {
                html += `<button class="pagination-btn" data-page="${data.page - 1}">⬅ Anterior</button>`;
            }

            // Page numbers
            html += `<span class="pagination-info">Página ${data.page} de ${data.totalPages}</span>`;

            // Next
            if (data.page < data.totalPages) {
                html += `<button class="pagination-btn" data-page="${data.page + 1}">Siguiente ➡</button>`;
            }

            html += `</div>`;
        }

        content.innerHTML = html;

        // Bind pagination events
        content.querySelectorAll('.pagination-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const page = parseInt(btn.dataset.page);
                onConcordanciaSearch(page);
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });
        });
    }

function removeAccents(str) {
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
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
        if (mainTitle && concVersion.selectedIndex >= 0) {
            mainTitle.textContent = `📖 Biblia ${concVersion.options[concVersion.selectedIndex].text}`;
        }
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

// --- Soporte para Gestos (Swipe) ---
let touchStartX = 0;
let touchEndX = 0;

// Escuchamos el toque en el contenedor de la biblia
const swipeArea = document.querySelector('.container');

swipeArea.addEventListener('touchstart', e => {
    touchStartX = e.changedTouches[0].screenX;
});

swipeArea.addEventListener('touchend', e => {
    touchEndX = e.changedTouches[0].screenX;
    handleSwipe();
});

function handleSwipe() {
    const umbral = 70; // Sensibilidad: distancia mínima para que cuente como swipe
    if (touchEndX < touchStartX - umbral) cambiarCapitulo('sig'); // Deslizar a la izquierda -> siguiente
    if (touchEndX > touchStartX + umbral) cambiarCapitulo('ant'); // Deslizar a la derecha -> anterior
}


});
