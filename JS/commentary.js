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

    // ── Nuevos botones ──
    const minimizeBtn = document.getElementById('commentaryBottomMinimize');
    const maximizeBtn = document.getElementById('commentaryBottomMaximize');

    if (minimizeBtn) {
        minimizeBtn.addEventListener('click', toggleMinimize);
    }
    if (maximizeBtn) {
        maximizeBtn.addEventListener('click', toggleMaximize);
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
    if (savedLang === 'ca') return 'ca';
    return 'en';
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
    elements.commentaryBottomPanel.classList.remove('minimized');
    elements.commentaryBottomPanel.classList.remove('maximized');
    elements.commentaryBottomPanel.classList.add('open');
    updateHeader();
    updateMaximizeIcon(false);
}

export function closeCommentaryPanel() {
    elements.commentaryBottomPanel.classList.remove('open');
    elements.commentaryBottomPanel.classList.remove('minimized');
    elements.commentaryBottomPanel.classList.remove('maximized');
    currentReference = null;
    currentSourceId = null;
    navigationStack = [];
    updateMaximizeIcon(false);
}

function updateHeader() {
    if (!currentReference) return;
    
    const verseText = currentReference.verse ? `:${currentReference.verse}` : '';
    elements.commentaryBottomRef.textContent = `${currentReference.book} ${currentReference.chapter}${verseText}`;
}

// =====================================================
// MINIMIZAR / MAXIMIZAR / RESTAURAR
// =====================================================

function toggleMinimize() {
    const panel = elements.commentaryBottomPanel;
    
    if (panel.classList.contains('minimized')) {
        // Restaurar desde minimizado
        panel.classList.remove('minimized');
        updateMaximizeIcon(panel.classList.contains('maximized'));
    } else {
        // Minimizar
        panel.classList.remove('maximized');
        panel.classList.add('minimized');
        updateMaximizeIcon(false);
    }
}

function toggleMaximize() {
    const panel = elements.commentaryBottomPanel;
    
    panel.classList.remove('minimized');
    
    if (panel.classList.contains('maximized')) {
        panel.classList.remove('maximized');
        updateMaximizeIcon(false);
    } else {
        // Solo medir el <header>, NO los .mode-tabs
        const appHeader = document.querySelector('header');
        
        let topOffset = 0;
        if (appHeader) topOffset += appHeader.offsetHeight;
        
        panel.style.setProperty('--app-header-height', topOffset + 'px');
        
        panel.classList.add('maximized');
        updateMaximizeIcon(true);
    }
}

function updateMaximizeIcon(isMaximized) {
    const btn = document.getElementById('commentaryBottomMaximize');
    if (!btn) return;
    
    if (isMaximized) {
        // Restaurar: flechas apuntando hacia DENTRO (se acercan)
        btn.innerHTML = `
            <svg width="14" height="14" viewBox="0 0 14 14">
                <polyline points="1,5 5,5 5,1" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                <line x1="5" y1="5" x2="1" y2="1" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
                <polyline points="13,9 9,9 9,13" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                <line x1="9" y1="9" x2="13" y2="13" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
            </svg>
        `;
        btn.setAttribute('aria-label', 'Restaurar');
        btn.setAttribute('title', 'Restaurar');
    } else {
        // Maximizar: flechas apuntando hacia FUERA (se alejan)
        btn.innerHTML = `
            <svg width="14" height="14" viewBox="0 0 14 14">
                <polyline points="1,5 1,1 5,1" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                <line x1="1" y1="1" x2="6" y2="6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
                <polyline points="13,9 13,13 9,13" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                <line x1="13" y1="13" x2="8" y2="8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
            </svg>
        `;
        btn.setAttribute('aria-label', 'Maximizar');
        btn.setAttribute('title', 'Maximizar');
    }
}

// =====================================================
// CARGA DE COMENTARIOS
// =====================================================

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
        
        const sources = await fetchJSON(`${API_URL}/api/commentary/sources?${params}`);
        
        if (!sources || sources.length === 0) {
            content.innerHTML = `
                <div class="commentary-empty">
                    <p>📭 No hay comentarios disponibles para esta referencia.</p>
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
    const lang = getCommentaryLanguage();
    const needsTranslation = sources.some(s => s.needsTranslation);
    
    let html = `
        <div class="commentary-sources-header">
            <h4>📚 Comentarios disponibles (${sources.length})</h4>
            ${needsTranslation ? `<span class="translation-hint">🌐 Se traducirán automáticamente</span>` : ''}
        </div>
        <div class="commentary-sources-list">
    `;
    
    sources.forEach(source => {
        html += `
            <button class="commentary-source-btn" 
                    data-source-id="${source.id}"
                    data-needs-translation="${source.needsTranslation || false}">
                <div class="source-info">
                    <span class="source-name">${escapeHtml(source.fullName)}</span>
                    <span class="source-author">${escapeHtml(source.author)}</span>
                </div>
                <span class="source-count">${source.entry_count} entrada${source.entry_count !== 1 ? 's' : ''}</span>
                ${source.needsTranslation ? '<span class="translate-icon">🌐</span>' : ''}
                <span class="source-arrow">→</span>
            </button>
        `;
    });
    
    html += '</div>';
    
    elements.commentaryBottomContent.innerHTML = html;
    
    elements.commentaryBottomContent.querySelectorAll('.commentary-source-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const sourceId = parseInt(btn.dataset.sourceId);
            const needsTranslation = btn.dataset.needsTranslation === 'true';
            navigationStack.push('sources');
            loadCommentaryEntries(sourceId, needsTranslation);
        });
    });
}

async function loadCommentaryEntries(sourceId, needsTranslation = false) {
    currentSourceId = sourceId;
    const content = elements.commentaryBottomContent;
    const lang = getCommentaryLanguage();
    
    content.innerHTML = `<div class="commentary-loading">📖 Cargando comentario...</div>`;
    
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
        
        // Traducir las entradas que lo necesitan
        const entriesToTranslate = data.entries.filter(e => e.needsTranslation);
        
        if (entriesToTranslate.length > 0 && lang !== 'en') {
            content.innerHTML = `<div class="commentary-loading">🌐 Traduciendo ${entriesToTranslate.length} entrada(s)...</div>`;
            
            let translationMethod = null;
            
            for (let i = 0; i < data.entries.length; i++) {
                const entry = data.entries[i];
                if (entry.needsTranslation) {
                    try {
                        const translated = await translateEntry(entry, sourceId, lang);
                        data.entries[i] = {
                            ...entry,
                            title: translated.entry.title || entry.title,
                            content: translated.entry.content || entry.content,
                            contentHtml: translated.entry.contentHtml || entry.contentHtml,
                            needsTranslation: false,
                            wasTranslated: true
                        };
                        translationMethod = translated.method;
                    } catch (e) {
                        console.warn(`Error traduciendo entrada ${entry.id}:`, e);
                        data.entries[i].translationFailed = true;
                    }
                }
            }
            
            renderCommentaryEntries(data, translationMethod);
        } else {
            renderCommentaryEntries(data, null);
        }
        
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

async function loadAndTranslateEntries(sourceId, targetLang) {
    const params = new URLSearchParams({
        bookOrder: currentReference.bookOrder,
        chapter: currentReference.chapter,
        language: 'en',
        sourceId: sourceId
    });
    
    if (currentReference.verse) {
        params.append('verse', currentReference.verse);
    }
    
    const enData = await fetchJSON(`${API_URL}/api/commentary?${params}`);
    
    if (!enData.entries || enData.entries.length === 0) {
        return { entries: [], translationMethod: null };
    }
    
    const translatedEntries = [];
    let lastMethod = null;
    
    for (const entry of enData.entries) {
        try {
            const translated = await translateEntry(entry, sourceId, targetLang);
            translatedEntries.push(translated.entry);
            lastMethod = translated.method;
        } catch (e) {
            console.warn(`[Commentary] Error traduciendo entrada ${entry.id}, saltando...`);
        }
    }
    
    return {
        ...enData,
        entries: translatedEntries,
        translationMethod: lastMethod
    };
}

async function translateEntry(entry, sourceId, targetLang) {
    const divId = entry.divId || `${sourceId}-${entry.verseStart || 0}-${entry.id}`;
    
    const response = await fetch(`${API_URL}/api/translate-commentary`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            sourceId: sourceId,
            divId: divId,
            targetLang: targetLang
        })
    });
    
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Translation failed');
    }
    
    const data = await response.json();
    
    return {
        entry: {
            ...entry,
            title: data.entry.title || entry.title,
            content: data.entry.content || entry.content,
            contentHtml: data.entry.contentHtml || entry.contentHtml
        },
        method: data.method,
        cached: data.cached
    };
}

function renderCommentaryEntries(data, translationMethod = null) {
    const firstEntry = data.entries[0];
    const lang = getCommentaryLanguage();
    
    let translationBadge = '';
    if (translationMethod) {
        const methodLabel = translationMethod === 'gemini' ? '✨ Gemini' : '🌐 Google';
        translationBadge = `<span class="translation-badge">Traducido con ${methodLabel}</span>`;
    }
    
    let html = `
        <div class="commentary-nav-bar">
            <button class="commentary-back-btn" id="commentaryBackBtn">← Volver</button>
            <span class="commentary-source-title">${escapeHtml(firstEntry.source_full_name)}</span>
            ${translationBadge}
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
