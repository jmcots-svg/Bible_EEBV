// ⚠️ URL de tu backend en Deno Deploy
const API_URL = 'https://bible-eebv.jmcots-svg.deno.net';

// Elementos del DOM
const versionSelect = document.getElementById('version'); // Nuevo selector
const bookSelect = document.getElementById('book');
const chapterSelect = document.getElementById('chapter');
const verseSelect = document.getElementById('verse');
const searchBtn = document.getElementById('searchBtn');
const content = document.getElementById('content');
const reference = document.getElementById('reference');
const mainTitle = document.getElementById('mainTitle');

// Estado
let books = [];
let chapters = [];

// Inicialización
document.addEventListener('DOMContentLoaded', init);

async function init() {
  try {
    // Carga inicial (por defecto RV60)
    await loadBooks(versionSelect.value);
    setupEventListeners();
  } catch (error) {
    showError('Error al conectar con el servidor');
    console.error(error);
  }
}

function setupEventListeners() {
  // Escuchar cambio de versión
  versionSelect.addEventListener('change', onVersionChange);
  bookSelect.addEventListener('change', onBookChange);
  chapterSelect.addEventListener('change', onChapterChange);
  searchBtn.addEventListener('click', onSearch);
}

// NUEVO: Al cambiar la versión (RV60 o LBLA)
async function onVersionChange() {
  const selectedVersion = versionSelect.value;
  
  // Actualizar título visualmente
  mainTitle.textContent = `📖 Biblia ${versionSelect.options[versionSelect.selectedIndex].text}`;
  
  // Reset de todos los selectores dependientes
  bookSelect.innerHTML = '<option value="">Cargando libros...</option>';
  bookSelect.disabled = true;
  resetSelects(['chapter', 'verse']);
  searchBtn.disabled = true;
  content.innerHTML = '<p class="placeholder">Cambiando de versión...</p>';
  reference.classList.remove('visible');

  try {
    await loadBooks(selectedVersion);
  } catch (error) {
    showError('Error al cambiar de versión');
  }
}

// Cargar libros filtrados por versión
async function loadBooks(version) {
  // Enviamos el parámetro ?version= a Deno
  const response = await fetch(`${API_URL}/api/books?version=${version}`);
  if (!response.ok) throw new Error('Error cargando libros');
  
  books = await response.json();
  
  bookSelect.innerHTML = '<option value="">-- Selecciona libro --</option>';
  
  const ot = books.filter(b => b.testament === 'OT');
  const nt = books.filter(b => b.testament === 'NT');
  
  const otGroup = document.createElement('optgroup');
  otGroup.label = '📜 Antiguo Testamento';
  ot.forEach(book => {
    const option = document.createElement('option');
    option.value = book.id;
    option.textContent = book.name;
    otGroup.appendChild(option);
  });
  
  const ntGroup = document.createElement('optgroup');
  ntGroup.label = '✝️ Nuevo Testamento';
  nt.forEach(book => {
    const option = document.createElement('option');
    option.value = book.id;
    option.textContent = book.name;
    ntGroup.appendChild(option);
  });
  
  bookSelect.appendChild(otGroup);
  bookSelect.appendChild(ntGroup);
  bookSelect.disabled = false;
}

// Al cambiar libro (Igual que antes, ya que usa bookId único)
async function onBookChange() {
  const bookId = bookSelect.value;
  resetSelects(['chapter', 'verse']);
  searchBtn.disabled = true;
  
  if (!bookId) return;
  
  try {
    chapterSelect.innerHTML = '<option value="">Cargando...</option>';
    const response = await fetch(`${API_URL}/api/chapters?bookId=${bookId}`);
    if (!response.ok) throw new Error('Error cargando capítulos');
    
    chapters = await response.json();
    
    chapterSelect.innerHTML = '<option value="">-- Selecciona capítulo --</option>';
    chapters.forEach(ch => {
      const option = document.createElement('option');
      option.value = ch.id;
      option.textContent = `Capítulo ${ch.number}`;
      option.dataset.number = ch.number;
      chapterSelect.appendChild(option);
    });
    
    chapterSelect.disabled = false;
  } catch (error) {
    showError('Error al cargar capítulos');
  }
}

// Al cambiar capítulo
async function onChapterChange() {
  const chapterId = chapterSelect.value;
  resetSelects(['verse']);
  searchBtn.disabled = true;
  
  if (!chapterId) return;
  
  try {
    const response = await fetch(`${API_URL}/api/verses?chapterId=${chapterId}`);
    if (!response.ok) throw new Error('Error cargando versículos');
    
    const verses = await response.json();
    
    verses.forEach(v => {
      const option = document.createElement('option');
      option.value = v.number;
      option.textContent = `Versículo ${v.number}`;
      verseSelect.appendChild(option);
    });
    
    verseSelect.disabled = false;
    searchBtn.disabled = false;
  } catch (error) {
    showError('Error al cargar versículos');
  }
}

// Buscar y mostrar contenido
async function onSearch() {
  const chapterId = chapterSelect.value;
  const verseNum = verseSelect.value;
  
  if (!chapterId) return;
  
  try {
    content.innerHTML = '<p class="loading">Cargando...</p>';
    let url = `${API_URL}/api/verses?chapterId=${chapterId}`;
    if (verseNum) url += `&verse=${verseNum}`;
    
    const response = await fetch(url);
    const verses = await response.json();
    
    if (verses.length === 0) {
      showError('No se encontraron versículos');
      return;
    }
    
    const bookName = bookSelect.options[bookSelect.selectedIndex].text;
    const chapterNum = chapterSelect.options[chapterSelect.selectedIndex].dataset.number;
    const versionLabel = versionSelect.options[versionSelect.selectedIndex].value;
    
    reference.textContent = `${bookName} ${chapterNum}${verseNum ? ':' + verseNum : ''} (${versionLabel})`;
    reference.classList.add('visible');
    
    content.innerHTML = verses.map(v => `
      <p class="verse">
        <span class="verse-number">${v.number}</span>${v.text}
      </p>
    `).join('');
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
  } catch (error) {
    showError('Error al buscar');
  }
}

// Utilidad para limpiar selectores
function resetSelects(ids) {
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (id === 'chapter') el.innerHTML = '<option value="">-- Selecciona libro --</option>';
    if (id === 'verse') el.innerHTML = '<option value="">Todo el capítulo</option>';
    el.disabled = true;
  });
}

function showError(message) {
  content.innerHTML = `<p class="error">❌ ${message}</p>`;
  reference.classList.remove('visible');
}
