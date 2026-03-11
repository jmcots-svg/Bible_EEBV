// ⚠️ URL de tu backend
const API_URL = 'https://bible-eebv.jmcots-svg.deno.net';

// Almacenes de caché para evitar peticiones repetidas a la red
const cache = {
    books: {},     // { 'RV60': [...] }
    chapters: {},  // { 'bookId': [...] }
    verses: {}     // { 'chapterId-verseNum': [...] }
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

    // 2. LÓGICA MODO NOCHE
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

    // 3. FUNCIONES DE CARGA Y RENDERIZADO
    async function loadBooks(version) {
        // Si ya están en caché, los cargamos al instante
        if (cache.books[version]) {
            renderBooks(cache.books[version]);
            return;
        }

        try {
            const res = await fetch(`${API_URL}/api/books?version=${version}`);
            const data = await res.json();
            cache.books[version] = data; // Guardamos en caché
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
        if(mainTitle) mainTitle.textContent = `📖 Biblia ${versionSelect.options[versionSelect.selectedIndex].text}`;
        resetSelects(['book', 'chapter', 'verse']);
        content.innerHTML = '<p class="placeholder">Cambiando de versión...</p>';
        await loadBooks(version);
    }

    async function onBookChange() {
        const bookId = bookSelect.value;
        resetSelects(['chapter', 'verse']);
        if (!bookId) return;

        // Uso de caché para capítulos
        if (cache.chapters[bookId]) {
            renderChapters(cache.chapters[bookId]);
            return;
        }

        try {
            const res = await fetch(`${API_URL}/api/chapters?bookId=${bookId}`);
            const data = await res.json();
            cache.chapters[bookId] = data; 
            renderChapters(data);
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

// Variable para evitar colisiones
let isFetching = false;

async function onChapterChange() {
    if (isFetching) return; // Si ya hay una carga en curso, no hagas nada
    
    const chId = chapterSelect.value;
    resetSelects(['verse']);
    if (!chId) return;

    // USAR CACHÉ PRIMERO
    if (cache.verses[`${chId}-all`]) {
        renderVerseSelect(cache.verses[`${chId}-all`]);
        return;
    }

    try {
        isFetching = true;
        const res = await fetch(`${API_URL}/api/verses?chapterId=${chId}`);
        const verses = await res.json();
        
        cache.verses[`${chId}-all`] = verses; // Guardar en caché
        renderVerseSelect(verses);
    } catch (e) {
        showError('Error al cargar versículos');
    } finally {
        isFetching = false;
    }
}

    async function onSearch() {
        const chId = chapterSelect.value;
        const vNum = verseSelect.value;
        if (!chId) return;

        // LIMPIEZA INMEDIATA para evitar el efecto "Nahum 3"
        content.innerHTML = '<p class="loading">Cargando contenido...</p>';
        if (reference) {
            reference.textContent = ''; 
            reference.classList.remove('visible');
        }

        const cacheKey = `${chId}-${vNum || 'all'}`;

        // Uso de caché para versículos
        if (cache.verses[cacheKey]) {
            renderVerses(cache.verses[cacheKey], vNum);
            return;
        }

        try {
            const res = await fetch(`${API_URL}/api/verses?chapterId=${chId}${vNum ? '&verse='+vNum : ''}`);
            const data = await res.json();
            cache.verses[cacheKey] = data;
            renderVerses(data, vNum);
        } catch (e) { 
            showError('Error al buscar el contenido'); 
        }
    }

    function renderVerses(verses, vNum) {
        const bName = bookSelect.options[bookSelect.selectedIndex].text;
        const chNum = chapterSelect.options[chapterSelect.selectedIndex].dataset.number;
        
        if (reference) {
            reference.textContent = `${bName} ${chNum}${vNum ? ':' + vNum : ''}`;
            reference.classList.add('visible');
        }

        content.innerHTML = verses.map(v => `
            <p class="verse"><span class="verse-number">${v.number}</span>${v.text}</p>
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
            const res = await fetch(`${API_URL}/api/compare?bookName=${encodeURIComponent(bookName)}&chapter=${chapter}&verse=${verse}`);
            const data = await res.json();

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
        } catch (e) { showError('Error en la comparación'); }
    }

    function resetSelects(ids) {
        ids.forEach(id => {
            const el = document.getElementById(id);
            if (!el) return;
            if (id === 'book') el.innerHTML = '<option value="">Cargando...</option>';
            if (id === 'chapter') el.innerHTML = '<option value="">-- Selecciona libro --</option>';
            if (id === 'verse') el.innerHTML = '<option value="">Todo el capítulo</option>';
            el.disabled = true;
        });
    }

    function showError(msg) {
        content.innerHTML = `<p class="error">❌ ${msg}</p>`;
        if(reference) reference.classList.remove('visible');
    }

    // 4. EVENT LISTENERS
    versionSelect.addEventListener('change', onVersionChange);
    bookSelect.addEventListener('change', onBookChange);
    chapterSelect.addEventListener('change', onChapterChange);
    searchBtn.addEventListener('click', onSearch);

    // Carga inicial
    loadBooks(versionSelect.value);
});
