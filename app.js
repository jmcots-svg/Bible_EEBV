// ⚠️ URL de tu backend
const API_URL = 'https://bible-eebv.jmcots-svg.deno.net';

// Helper seguro para fetch
async function fetchJSON(url, signal = null) {
    const res = await fetch(url, { signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
}

// Almacenes de caché para evitar peticiones repetidas a la red
const cache = {
    books: {},
    chapters: {},
    verses: {}
};

document.addEventListener('DOMContentLoaded', () => {

    // 1. SELECCIÓN DE ELEMENTOS
    const versionSelect = document.getElementById('version');
    const bookSelect = document.getElementById('book');
    const chapterSelect = document.getElementById('chapter');
    const verseSelect = document.getElementById('verse');
    const searchBtn = document.getElementById('searchBtn');
    const content = document.getElementById('content');
    const reference = document.getElementById('reference');
    const mainTitle = document.getElementById('mainTitle');
    const themeCheckbox = document.getElementById('themeCheckbox');

    // 2. MODO NOCHE
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

    // 3. FUNCIONES

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

            // Prefetch primer capítulo

            if (data.length > 0) {

                const firstChapterId = data[0].id;

                const cacheKey = `${firstChapterId}-all`;

                if (!cache.verses[cacheKey]) {

                    fetchJSON(`${API_URL}/api/verses?chapterId=${firstChapterId}`)
                        .then(verses => {
                            cache.verses[cacheKey] = verses;
                        })
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

        if (!chId) return;

        searchBtn.disabled = true;

        const cacheKey = `${chId}-all`;

        if (cache.verses[cacheKey]) {

            renderVerseSelect(cache.verses[cacheKey]);

            searchBtn.disabled = false;

            return;

        }

        let originalBtnText;

        try {

            isFetching = true;

            originalBtnText = searchBtn.textContent;

            searchBtn.textContent = '⏱️...';

            if (versesAbort) versesAbort.abort();

            versesAbort = new AbortController();

            const verses = await fetchJSON(
                `${API_URL}/api/verses?chapterId=${chId}`,
                versesAbort.signal
            );

            cache.verses[cacheKey] = verses;

            renderVerseSelect(verses);

        } catch (e) {

            if (e.name === "AbortError") return;

            showError('Error al cargar versículos');

            console.error(e);

        } finally {

            if (originalBtnText) searchBtn.textContent = originalBtnText;

            searchBtn.disabled = false;

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
            ? bookSelect.options[bookSelect.selectedIndex].text
            : '';

        const chNum = chapterSelect.selectedIndex >= 0
            ? chapterSelect.options[chapterSelect.selectedIndex].dataset.number
            : '';

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

    // EVENTOS

    versionSelect.addEventListener('change', onVersionChange);
    bookSelect.addEventListener('change', onBookChange);
    chapterSelect.addEventListener('change', onChapterChange);
    searchBtn.addEventListener('click', onSearch);

    // Carga inicial

    if (versionSelect.value) {
        loadBooks(versionSelect.value);
    }

});
