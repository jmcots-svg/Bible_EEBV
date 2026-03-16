// JS/commentary.js

import { API_URL } from './config.js';
import { fetchJSON, escapeHtml } from './utils.js';
import { translateCommentaryBatch, initTranslationService } from './translationService.js'; // ✅ CAMBIO: Importar

// Estado del módulo
let currentReference = null;
let currentSourceId = null;
let navigationStack = [];
let elements = {};
let callbacks = {};

export function initCommentary(els, cbs) {
    elements = els;
    callbacks = cbs;
    
    // ✅ CAMBIO: Inicializar servicio de traducción
    const keys = window.GEMINI_API_KEYS || [];
    initTranslationService(keys);
    
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

function getCommentaryLanguage() {
    const savedLang = localStorage.getItem('appLanguage');
    if (savedLang === 'es') return 'es';
    if (savedLang === 'en') return 'en';
    if (savedLang === 'ca') return 'ca'; // ✅ CAMBIO: Soportar catalán
    return 'en'; // Default
}

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
    
    currentReference = {
        ...parsed,
        bookOrder,
        versionName,
        language: getCommentaryLanguage(),
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
    const lang = getCommentaryLanguage();
    
    content.innerHTML = '<div class="commentary-loading">📚 Buscando comentarios disponibles...</div>';
    
    try {
        const params = new URLSearchParams({
            bookOrder: currentReference.bookOrder,
            chapter: currentReference.chapter,
            language: lang
        });
        
        if (currentReference.verse) {
            params.append('verse', currentReference.verse);
        }
        
        console.log(`[Commentary] Buscando fuentes: ${params.toString()}`);
        
        const sources = await fetchJSON(`${API_URL}/api/commentary/sources?${params}`);
        
        if (!sources || sources.length === 0) {
            content.innerHTML = `
                <div class="commentary-empty">
                    <p>📭 No hay comentarios disponibles para esta referencia.</p>
                    <p class="commentary-empty-hint">Idioma: ${lang === 'en' ? 'English' : lang === 'es' ? 'Español' : lang === 'ca' ? 'Català' : lang}</p>
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

// ✅ CAMBIO: Función ACTUALIZADA con traducción on-the-fly
async function loadCommentaryEntries(sourceId) {
    currentSourceId = sourceId;
    const content = elements.commentaryBottomContent;
    const lang = getCommentaryLanguage();
    
    content.innerHTML = '<div class="commentary-loading">📖 Cargando comentario...</div>';
    
    try {
        const params = new URLSearchParams({
            bookOrder: currentReference.bookOrder,
            chapter: currentReference.chapter,
            language: lang,
            sourceId: sourceId
        });
        
        if (currentReference.verse) {
            params.append('verse', currentReference.verse);
        }
        
        console.log(`[Commentary] Cargando entradas: ${params.toString()}`);
        
        let data = await fetchJSON(`${API_URL}/api/commentary?${params}`);
        
        // ✅ CAMBIO: Si no hay en el idioma deseado Y no es inglés, buscar en inglés y traducir
        if ((!data.entries || data.entries.length === 0) && lang !== 'en') {
            console.log(`📚 No hay comentarios en ${lang}, buscando en inglés para traducir...`);
            
            // Buscar en inglés
            const paramsEn = new URLSearchParams({
                bookOrder: currentReference.bookOrder,
                chapter: currentReference.chapter,
                language: 'en',
                sourceId: sourceId
            });
            
            if (currentReference.verse) {
                paramsEn.append('verse', currentReference.verse);
            }
            
            const dataEn = await fetchJSON(`${API_URL}/api/commentary?${paramsEn}`);
            
            // Si encontramos en inglés, traducir
            if (dataEn.entries && dataEn.entries.length > 0) {
                console.log(`🔄 Traduciendo ${dataEn.entries.length} entradas a ${lang}...`);
                content.innerHTML = '<div class="commentary-loading">✨ Traduciendo con IA (Gemini)...</div>';
                
                // Llamar al servicio de traducción (Gemini + fallback a GT)
                const translatedEntries = await translateCommentaryBatch(dataEn.entries, lang);
                data = { entries: translatedEntries, wasTranslated: true };
                
                // Guardar en DB en background (no esperar)
                saveTranslatedEntries(translatedEntries, lang);
            }
        }
        
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

// ✅ CAMBIO: Nueva función para guardar traducciones en la BD
async function saveTranslatedEntries(entries, lang) {
    try {
        const response = await fetch(`${API_URL}/api/commentary/save`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ entries, language: lang })
        });
        
        if (response.ok) {
            console.log(`💾 ${entries.length} entradas guardadas en BD (${lang})`);
        } else {
            console.error("Error guardando:", response.statusText);
        }
    } catch (error) {
        console.error("⚠️ Error guardando traducciones:", error);
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
    
    // ✅ CAMBIO: Mostrar badge si fue traducido
    if (data.wasTranslated) {
        html += `<div style="font-size: 0.8rem; color: #888; padding: 8px 12px; background: #f0f0f0; border-radius: 4px; margin-bottom: 12px; text-align: center;">✨ Traducido automáticamente con IA</div>`;
    }
    
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
