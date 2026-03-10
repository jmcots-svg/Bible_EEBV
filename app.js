// ⚠️ CAMBIA ESTA URL por la URL de tu backend en Deno Deploy
const API_URL = 'https://bible-eebv.jmcots-svg.deno.net';

// Elementos del DOM
const bookSelect = document.getElementById('book');
const chapterSelect = document.getElementById('chapter');
const verseSelect = document.getElementById('verse');
const searchBtn = document.getElementById('searchBtn');
const content = document.getElementById('content');
const reference = document.getElementById('reference');

// Estado
let books = [];
let chapters = [];

// Inicialización
document.addEventListener('DOMContentLoaded', init);

async function init() {
  try {
    await loadBooks();
    setupEventListeners();
  } catch (error) {
    showError('Error al conectar con el servidor');
    console.error(error);
  }
}

function setupEventListeners() {
  bookSelect.addEventListener('change', onBookChange);
  chapterSelect.addEventListener('change', onChapterChange);
  searchBtn.addEventListener('click', onSearch);
}

// Cargar libros
async function loadBooks() {
  const response = await fetch(`${API_URL}/api/books`);
  if (!response.ok) throw new Error('Error cargando libros');
  
  books = await response.json();
  
  bookSelect.innerHTML = '<option value="">-- Selecciona libro --</option>';
  
  // Separar por testamento
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

// Al cambiar libro
async function onBookChange() {
  const bookId = bookSelect.value;
  
  // Reset
  chapterSelect.innerHTML = '<option value="">-- Selecciona capítulo --</option>';
  chapterSelect.disabled = true;
  verseSelect.innerHTML = '<option value="">Todo el capítulo</option>';
  verseSelect.disabled = true;
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
    console.error(error);
  }
}

// Al cambiar capítulo
async function onChapterChange() {
  const chapterId = chapterSelect.value;
  
  verseSelect.innerHTML = '<option value="">Todo el capítulo</option>';
  verseSelect.disabled = true;
  searchBtn.disabled = true;
  
  if (!chapterId) return;
  
  try {
    // Cargar versículos para el selector
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
    console.error(error);
  }
}

// Buscar
async function onSearch() {
  const chapterId = chapterSelect.value;
  const verseNum = verseSelect.value;
  
  if (!chapterId) return;
  
  try {
    content.innerHTML = '<p class="loading">Cargando</p>';
    
    let url = `${API_URL}/api/verses?chapterId=${chapterId}`;
    if (verseNum) {
      url += `&verse=${verseNum}`;
    }
    
    const response = await fetch(url);
    if (!response.ok) throw new Error('Error buscando versículos');
    
    const verses = await response.json();
    
    if (verses.length === 0) {
      showError('No se encontraron versículos');
      return;
    }
    
    // Mostrar referencia
    const bookName = bookSelect.options[bookSelect.selectedIndex].text;
    const chapterNum = chapterSelect.options[chapterSelect.selectedIndex].dataset.number;
    
    let refText = `${bookName} ${chapterNum}`;
    if (verseNum) {
      refText += `:${verseNum}`;
    }
    
    reference.textContent = refText;
    reference.classList.add('visible');
    
    // Mostrar versículos
    content.innerHTML = verses.map(v => `
      <p class="verse">
        <span class="verse-number">${v.number}</span>${v.text}
      </p>
    `).join('');
    
  } catch (error) {
    showError('Error al buscar');
    console.error(error);
  }
}

function showError(message) {
  content.innerHTML = `<p class="error">❌ ${message}</p>`;
  reference.classList.remove('visible');
}