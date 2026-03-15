// commentary.js

import { API_URL } from './config.js';
import { fetchJSON, escapeHtml } from './utils.js';

// Estado del módulo
let currentReference = null;
let currentSourceId = null;
let navigationStack = [];
let elements = {};
let callbacks = {};

export function initCommentary(els, cbs) {
    elements = els;
    callbacks = cbs;
    
    if (elements.commentaryBottomClose) {
        elements.commentaryBottomClose.addEventListener('click', closeCommentaryPanel);
    }
}

function parseReference(refText) {
    if (!refText) return null;
    
    const cleaned = refText.replace(/\s*\(.*?\)\s*$/, '').trim();
    const match = cleaned.match(/^(.+?)\s+(\d+)(?::(\d+))?$/);
    
    if (!match) return null;
    
    return {
        book: match[1].trim(),
        chapter: parseInt(match[2]),
        verse: match[3] ? parseInt(match[3]) : null
    };
}

async function getBookOrder(bookName, versionName) {
    try {
        const books = await fetchJSON(`${API_URL}/api/books?version=${versionName}`);
        const book = books.find(b => b.name.toLowerCase() === bookName.toLowerCase());
        return book ? book.bookOrder : null;
    } catch (e) {
        console.error('Error obteniendo bookOrder:', e);
        return null;
    }
}

// ✅ NUEVA FUNCIÓN: Obtener idioma desde localStorage (Ajustes)
function getCommentaryLanguage() {
    const savedLang = localStorage.getItem('appLanguage');
    // Mapear a los códigos que usa tu API
    if (savedLang === 'es') return 'es';
    if (savedLang === 'en') return 'en';
    return 'en'; // Default
}

// ✅ FUNCIÓN ACTUALIZADA
export async function openCommentaryForReference(refText, versionName) {
    const parsed = parseReference(refText);
    if (!parsed) {
        console.error('No se pudo parsear la referencia:', refText);
        return;
    }
    
    const bookOrder = await getBookOrder(parsed.book, versionName);
    if (!bookOrder) {
        console.error('No se encontró el libro:', parsed.book);
        return;
    }
    
    // ✅ CAMBIO CLAVE: Usar el idioma de los Ajustes, no de la versión
    currentReference = {
        ...parsed,
        bookOrder,
        versionName,
        language: getCommentaryLanguage(), // ← CAMBIO AQUÍ
        displayText: refText
    };
    
    navigationStack = [];
    currentSourceId = null;
    
    showPanel();
    await loadCommentarySources();
}

function showPanel() {
    elements.commentaryBottomPanel.classList.add('open');
    updateHeader();
}

export function closeCommentaryPanel() {
    elements.commentaryBottomPanel.classList.remove('open');
    currentReference = null;
    currentSourceId = null;
    navigationStack = [];
}

function updateHeader() {
    if (!currentReference) return;
    
    const verseText = currentReference.verse ? `:${currentReference.verse}` : '';
    elements.commentaryBottomRef.textContent = `${currentReference.book} ${currentReference.chapter}${verseText}`;
}

async function loadCommentarySources() {
    const content = elements.commentaryBottomContent;
    const lang = getCommentaryLanguage(); // ✅ Obtener idioma actual
    
    content.innerHTML = '<div class="commentary-loading">📚 Buscando comentarios disponibles...</div>';
    
    try {
        const params = new URLSearchParams({
            bookOrder: currentReference.bookOrder,
            chapter: currentReference.chapter,
            language: lang // ✅ Usar idioma de Ajustes
        });
        
        if (currentReference.verse) {
            params.append('verse', currentReference.verse);
        }
        
        console.log(`[Commentary] Buscando fuentes: ${params.toString()}`); // Debug
        
        const sources = await fetchJSON(`${API_URL}/api/commentary/sources?${params}`);
        
        if (!sources || sources.length === 0) {
            content.innerHTML = `
                <div class="commentary-empty">
                    <p>📭 No hay comentarios disponibles para esta referencia.</p>
                    <p class="commentary-empty-hint">Idioma: ${lang === 'en' ? 'English' : 'Español'}</p>
                </div>
            `;
            return;
        }
        
        renderSourcesList(sources);
        
    } catch (e) {
        console.error('Error cargando fuentes:', e);
        content.innerHTML = '<p class="error">❌ Error al cargar comentarios</p>';
    }
}

function renderSourcesList(sources) {
    let html = `
        <div class="commentary-sources-header">
            <h4>📚 Comentarios disponibles (${sources.length})</h4>
        </div>
        <div class="commentary-sources-list">
    `;
    
    sources.forEach(source => {
        html += `
            <button class="commentary-source-btn" data-source-id="${source.id}">
                <div class="source-info">
                    <span class="source-name">${escapeHtml(source.fullName)}</span>
                    <span class="source-author">${escapeHtml(source.author)}</span>
                </div>
                <span class="source-count">${source.entry_count} entrada${source.entry_count !== 1 ? 's' : ''}</span>
                <span class="source-arrow">→</span>
            </button>
        `;
    });
    
    html += '</div>';
    
    elements.commentaryBottomContent.innerHTML = html;
    
    elements.commentaryBottomContent.querySelectorAll('.commentary-source-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const sourceId = parseInt(btn.dataset.sourceId);
            navigationStack.push('sources');
            loadCommentaryEntries(sourceId);
        });
    });
}

async function loadCommentaryEntries(sourceId) {
    currentSourceId = sourceId;
    const content = elements.commentaryBottomContent;
    const lang = getCommentaryLanguage(); // ✅ Obtener idioma actual
    
    content.innerHTML = '<div class="commentary-loading">📖 Cargando comentario...</div>';
    
    try {
        const params = new URLSearchParams({
            bookOrder: currentReference.bookOrder,
            chapter: currentReference.chapter,
            language: lang, // ✅ Usar idioma de Ajustes
            sourceId: sourceId
        });
        
        if (currentReference.verse) {
            params.append('verse', currentReference.verse);
        }
        
        console.log(`[Commentary] Cargando entradas: ${params.toString()}`); // Debug
        
        const data = await fetchJSON(`${API_URL}/api/commentary?${params}`);
        
        if (!data.entries || data.entries.length === 0) {
            content.innerHTML = `
                <div class="commentary-nav-bar">
                    <button class="commentary-back-btn" id="commentaryBackBtn">← Volver</button>
                </div>
                <div class="commentary-empty">
                    <p>📭 No hay entradas para esta sección.</p>
                </div>
            `;
            setupBackButton();
            return;
        }
        
        renderCommentaryEntries(data);
        
    } catch (e) {
        console.error('Error cargando entradas:', e);
        content.innerHTML = `
            <div class="commentary-nav-bar">
                <button class="commentary-back-btn" id="commentaryBackBtn">← Volver</button>
            </div>
            <p class="error">❌ Error al cargar el comentario</p>
        `;
        setupBackButton();
    }
}

function renderCommentaryEntries(data) {
    const firstEntry = data.entries[0];
    
    let html = `
        <div class="commentary-nav-bar">
            <button class="commentary-back-btn" id="commentaryBackBtn">← Volver</button>
            <span class="commentary-source-title">${escapeHtml(firstEntry.source_full_name)}</span>
        </div>
        <div class="commentary-entries">
    `;
    
    data.entries.forEach(entry => {
        const verseRange = formatVerseRange(entry.verseStart, entry.verseEnd);
        
        html += `
            <article class="commentary-entry">
                ${entry.title ? `<h4 class="commentary-entry-title">${escapeHtml(entry.title)}</h4>` : ''}
                ${verseRange ? `<div class="commentary-verse-range">Versículos ${verseRange}</div>` : ''}
                <div class="commentary-entry-content">
                    ${entry.contentHtml || escapeHtml(entry.content)}
                </div>
            </article>
        `;
    });
    
    html += '</div>';
    
    elements.commentaryBottomContent.innerHTML = html;
    setupBackButton();
}

function formatVerseRange(start, end) {
    if (!start) return null;
    if (!end || start === end) return String(start);
    return `${start}-${end}`;
}

function setupBackButton() {
    const backBtn = document.getElementById('commentaryBackBtn');
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            if (navigationStack.length > 0) {
                navigationStack.pop();
                loadCommentarySources();
            }
        });
    }
}

export { parseReference };
