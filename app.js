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

    // 1. Intentar Memoria RAM
    if (cache.chapters[bookId]) {
        renderChapters(cache.chapters[bookId]);
        return;
    }

    // 2. Intentar Memoria DISCO (LocalStorage)
    const localData = localStorage.getItem(`chapters_${bookId}`);
    if (localData) {
        const parsed = JSON.parse(localData);
        cache.chapters[bookId] = parsed; // Subimos a RAM para la próxima
        renderChapters(parsed);
        return;
    }

    try {
        // 3. Solo si no hay nada, vamos a la red
        const res = await fetch(`${API_URL}/api/chapters?bookId=${bookId}`);
        const data = await res.json();
        
        // Guardamos en ambos sitios
        cache.chapters[bookId] = data;
        localStorage.setItem(`chapters_${bookId}`, JSON.stringify(data));
        
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
    if (isFetching) return; 
    
    const chId = chapterSelect.value;
    resetSelects(['verse']);
    if (!chId) return;

    // 1. Bloqueo preventivo: Mientras cargamos los versículos para el selector, 
    // desactivamos el botón de búsqueda para evitar el "doble fetch".
    searchBtn.disabled = true;

    // USAR CACHÉ PRIMERO
    const cacheKey = `${chId}-all`;
    if (cache.verses[cacheKey]) {
        renderVerseSelect(cache.verses[cacheKey]);
        searchBtn.disabled = false; // Rehabilitar si ya estaba en caché
        return;
    }

    try {
        isFetching = true;
        // Cambiamos el texto del botón para dar feedback visual
        const originalBtnText = searchBtn.textContent;
        searchBtn.textContent = '⏱️...';

        const res = await fetch(`${API_URL}/api/verses?chapterId=${chId}`);
        const verses = await res.json();
        
        // Guardar en caché: Esto es vital para que cuando luego se pulse 'onSearch',
        // no se dispare otro fetch, sino que use estos datos.
        cache.verses[cacheKey] = verses; 
        
        renderVerseSelect(verses);
        
        // Devolvemos el botón a su estado normal
        searchBtn.textContent = originalBtnText;
        searchBtn.disabled = false;
    } catch (e) {
        showError('Error al cargar versículos');
        console.error(e);
    } finally {
        isFetching = false;
    }
}

// Función auxiliar para mantener el código limpio (asegúrate de tenerla)
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
