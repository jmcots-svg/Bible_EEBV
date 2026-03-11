// ⚠️ URL de tu backend
const API_URL = 'https://bible-eebv.jmcots-svg.deno.net';

const versionSelect = document.getElementById('version');
const bookSelect = document.getElementById('book');
const chapterSelect = document.getElementById('chapter');
const verseSelect = document.getElementById('verse');
const searchBtn = document.getElementById('searchBtn');
const content = document.getElementById('content');
const reference = document.getElementById('reference');
const mainTitle = document.getElementById('mainTitle');

let books = [];

document.addEventListener('DOMContentLoaded', () => {
  loadBooks(versionSelect.value);
  setupEventListeners();
});

function setupEventListeners() {
  versionSelect.addEventListener('change', onVersionChange);
  bookSelect.addEventListener('change', onBookChange);
  chapterSelect.addEventListener('change', onChapterChange);
  searchBtn.addEventListener('click', onSearch);
}

// Cambiar de versión (RV60 <-> LBLA)
async function onVersionChange() {
  const version = versionSelect.value;
  mainTitle.textContent = `📖 Biblia ${versionSelect.options[versionSelect.selectedIndex].text}`;
  resetSelects(['book', 'chapter', 'verse']);
  content.innerHTML = '<p class="placeholder">Cambiando de versión...</p>';
  await loadBooks(version);
}

async function loadBooks(version) {
  try {
    const res = await fetch(`${API_URL}/api/books?version=${version}`);
    books = await res.json();
    
    bookSelect.innerHTML = '<option value="">-- Selecciona libro --</option>';
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

    bookSelect.appendChild(createGroup('📜 Antiguo Testamento', ot));
    bookSelect.appendChild(createGroup('✝️ Nuevo Testamento', nt));
    bookSelect.disabled = false;
  } catch (e) { showError('Error al cargar libros'); }
}

async function onBookChange() {
  const bookId = bookSelect.value;
  resetSelects(['chapter', 'verse']);
  if (!bookId) return;
  try {
    const res = await fetch(`${API_URL}/api/chapters?bookId=${bookId}`);
    const chapters = await res.json();
    chapterSelect.innerHTML = '<option value="">-- Selecciona capítulo --</option>';
    chapters.forEach(ch => {
      const opt = document.createElement('option');
      opt.value = ch.id;
      opt.textContent = `Capítulo ${ch.number}`;
      opt.dataset.number = ch.number;
      chapterSelect.appendChild(opt);
    });
    chapterSelect.disabled = false;
  } catch (e) { showError('Error al cargar capítulos'); }
}

async function onChapterChange() {
  const chId = chapterSelect.value;
  resetSelects(['verse']);
  if (!chId) return;
  try {
    const res = await fetch(`${API_URL}/api/verses?chapterId=${chId}`);
    const verses = await res.json();
    verses.forEach(v => {
      const opt = document.createElement('option');
      opt.value = v.number;
      opt.textContent = `Versículo ${v.number}`;
      verseSelect.appendChild(opt);
    });
    verseSelect.disabled = false;
    searchBtn.disabled = false;
  } catch (e) { showError('Error al cargar versículos'); }
}

async function onSearch() {
  const chId = chapterSelect.value;
  const vNum = verseSelect.value;
  try {
    content.innerHTML = '<p class="loading">Cargando...</p>';
    const res = await fetch(`${API_URL}/api/verses?chapterId=${chId}${vNum ? '&verse='+vNum : ''}`);
    const verses = await res.json();
    
    const bName = bookSelect.options[bookSelect.selectedIndex].text;
    const chNum = chapterSelect.options[chapterSelect.selectedIndex].dataset.number;
    reference.textContent = `${bName} ${chNum}${vNum ? ':' + vNum : ''}`;
    reference.classList.add('visible');

    content.innerHTML = verses.map(v => `
      <p class="verse"><span class="verse-number">${v.number}</span>${v.text}</p>
    `).join('');

    // MOSTRAR BOTÓN COMPARAR si hay un versículo único
    if (vNum) {
      const btn = document.createElement('button');
      btn.textContent = '🔄 Comparar versiones';
      btn.style.marginTop = '20px';
      btn.onclick = () => showComparison(bName, chNum, vNum);
      content.appendChild(btn);
    }
  } catch (e) { showError('Error al buscar'); }
}

// NUEVA FUNCIÓN: Comparar el mismo versículo en todas las biblias
async function showComparison(bookName, chapter, verse) {
  try {
    content.innerHTML = '<p class="loading">Comparando...</p>';
    const res = await fetch(`${API_URL}/api/compare?bookName=${bookName}&chapter=${chapter}&verse=${verse}`);
    const data = await res.json();

    content.innerHTML = `<h3>Comparación: ${bookName} ${chapter}:${verse}</h3>`;
    data.forEach(c => {
      content.innerHTML += `
        <div style="background:#f4f4f4; padding:10px; margin:10px 0; border-left:4px solid #333">
          <small style="color:blue; font-weight:bold">${c.version}</small>
          <p>${c.text}</p>
        </div>`;
    });

    const backBtn = document.createElement('button');
    backBtn.textContent = '⬅ Volver';
    backBtn.onclick = onSearch;
    content.appendChild(backBtn);
  } catch (e) { showError('Error en la comparación'); }
}

function resetSelects(ids) {
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (id === 'book') el.innerHTML = '<option value="">Cargando...</option>';
    if (id === 'chapter') el.innerHTML = '<option value="">-- Selecciona libro --</option>';
    if (id === 'verse') el.innerHTML = '<option value="">Todo el capítulo</option>';
    el.disabled = true;
  });
}

function showError(msg) {
  content.innerHTML = `<p style="color:red">❌ ${msg}</p>`;
  reference.classList.remove('visible');
}

// Lógica de Modo Noche
const themeToggle = document.getElementById('themeToggle');
const currentTheme = localStorage.getItem('theme') || 'light';

// Aplicar el tema guardado al cargar
if (currentTheme === 'dark') {
  document.documentElement.setAttribute('data-theme', 'dark');
  themeToggle.textContent = '☀️';
}

themeToggle.addEventListener('click', () => {
  let theme = document.documentElement.getAttribute('data-theme');
  
  if (theme === 'dark') {
    document.documentElement.setAttribute('data-theme', 'light');
    themeToggle.textContent = '🌙';
    localStorage.setItem('theme', 'light');
  } else {
    document.documentElement.setAttribute('data-theme', 'dark');
    themeToggle.textContent = '☀️';
    localStorage.setItem('theme', 'dark');
  }
});
