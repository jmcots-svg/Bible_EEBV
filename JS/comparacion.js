// comparacion.js

import { API_URL } from './config.js';
import { fetchJSON, escapeHtml } from './utils.js';
import { cache } from './cache.js';

let elements = {};
let callbacks = {};
let currentCompData = null;

export function initComparacion(els, cbs) {
    elements = els;
    callbacks = cbs;

    // Eventos
    elements.compVersionA.addEventListener('change', () => {
        loadCompBooks();
        if (elements.compChapter.value) renderComparison();
    });
    elements.compVersionB.addEventListener('change', () => {
        if (elements.compChapter.value) renderComparison();
    });
    elements.compBook.addEventListener('change', loadCompChapters);
    elements.compChapter.addEventListener('change', loadCompVerses);
    elements.compVerse.addEventListener('change', renderComparison);
}

export function getCurrentCompData() {
    return currentCompData;
}

export async function loadCompBooks() {
    const version = elements.compVersionA.value;
    if (!version) return;
    let books = cache.books[version];
    if (!books) {
        books = await fetchJSON(`${API_URL}/api/books?version=${version}`);
        cache.books[version] = books;
    }
    elements.compBook.innerHTML = '<option value="">-- Selecciona libro --</option>';
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

    elements.compBook.appendChild(createGroup('📜 Antiguo Testamento', ot));
    elements.compBook.appendChild(createGroup('✝️ Nuevo Testamento', nt));
    elements.compBook.disabled = false;
    elements.compChapter.innerHTML = '<option value="">-- Selecciona capítulo --</option>';
    elements.compChapter.disabled = true;
    elements.compVerse.innerHTML = '<option value="">Todo el capítulo</option>';
    elements.compVerse.disabled = true;
}

async function loadCompChapters() {
    const bookId = elements.compBook.value;
    if (!bookId) return;
    let chapters = cache.chapters[bookId];
    if (!chapters) {
        chapters = await fetchJSON(`${API_URL}/api/chapters?bookId=${bookId}`);
        cache.chapters[bookId] = chapters;
    }
    elements.compChapter.innerHTML = '<option value="">-- Selecciona capítulo --</option>';
    chapters.forEach(ch => {
        const opt = document.createElement('option');
        opt.value = ch.id;
        opt.textContent = `Capítulo ${ch.number}`;
        opt.dataset.number = ch.number;
        elements.compChapter.appendChild(opt);
    });
    elements.compChapter.disabled = false;
    elements.compVerse.innerHTML = '<option value="">Todo el capítulo</option>';
    elements.compVerse.disabled = true;
}

async function loadCompVerses() {
    const chId = elements.compChapter.value;
    if (!chId) return;
    const cacheKey = `${chId}-all`;
    let verses = cache.verses[cacheKey];
    if (!verses) {
        verses = await fetchJSON(`${API_URL}/api/verses?chapterId=${chId}`);
        cache.verses[cacheKey] = verses;
    }
    elements.compVerse.innerHTML = '<option value="">Todo el capítulo</option>';
    verses.forEach(v => {
        const opt = document.createElement('option');
        opt.value = v.number;
        opt.textContent = `Versículo ${v.number}`;
        elements.compVerse.appendChild(opt);
    });
    elements.compVerse.disabled = false;
    renderComparison();
}

export async function renderComparison() {
    const versionA = elements.compVersionA.value;
    const versionB = elements.compVersionB.value;
    const chIdA = elements.compChapter.value;
    const vNum = elements.compVerse.value;
    if (!versionA || !versionB || !chIdA) return;
    if (versionA === versionB) {
        elements.content.innerHTML = '<p class="error">❌ Selecciona dos versiones diferentes</p>';
        return;
    }
    elements.content.innerHTML = '<p class="loading">⚖️ Comparando versiones...</p>';
    try {
        const bookName = elements.compBook.options[elements.compBook.selectedIndex]?.text;
        const chNum = elements.compChapter.options[elements.compChapter.selectedIndex]?.dataset.number;

        // Obtener bookOrder del libro seleccionado
        let booksA = cache.books[versionA];
        if (!booksA) {
            booksA = await fetchJSON(`${API_URL}/api/books?version=${versionA}`);
            cache.books[versionA] = booksA;
        }
        const bookA = booksA.find(b => String(b.id) === String(elements.compBook.value));
        const bookOrder = bookA?.bookOrder;
        if (!bookOrder) throw new Error(`No se encontró bookOrder para el libro seleccionado`);

        // Buscar libro en versión B por bookOrder
        let booksB = cache.books[versionB];
        if (!booksB) {
            booksB = await fetchJSON(`${API_URL}/api/books?version=${versionB}`);
            cache.books[versionB] = booksB;
        }
        const bookB = booksB.find(b => b.bookOrder === bookOrder);
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
        elements.content.innerHTML = `<p class="error">❌ ${e.message}</p>`;
    }
}

function renderComparisonView(versesA, versesB, versionA, versionB, bookName, chNum, vNum) {
    if (elements.reference) {
        elements.reference.textContent = `${bookName} ${chNum}${vNum ? ':' + vNum : ''}`;
        elements.reference.classList.add('visible');
    }

    currentCompData = { versesA, versesB, versionA, versionB, bookName, chNum, vNum };

    const rowsHtml = versesA.map(vA => {
        const vB = versesB.find(v => v.number === vA.number);
        return `<div class="comp-row">
            <div class="comp-cell"><span class="verse-number">${vA.number}</span>${vA.text}</div>
            <div class="comp-cell"><span class="verse-number">${vB?.number ?? vA.number}</span>${vB?.text ?? '<em>No disponible</em>'}</div>
        </div>`;
    }).join('');

    elements.content.innerHTML = `
        <div class="comp-header">
            <div class="comp-version-badge">${versionA}</div>
            <div class="comp-version-badge">${versionB}</div>
        </div>
        <div class="comp-container">${rowsHtml}</div>`;

    callbacks.updateComparisonOrientationHint();
}
