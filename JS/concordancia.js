// concordancia.js

import { API_URL } from './config.js';
import { fetchJSON, escapeHtml, highlightText, highlightExactWord, isExactWordMatch } from './utils.js';
import { cache } from './cache.js';
import { t } from './translations.js';  // 🆕 AGREGAR

let elements = {};
let callbacks = {};
let searchAbort = null;
let currentSearchPage = 1;
let currentSearchData = null;

export function initConcordancia(els, cbs) {
    elements = els;
    callbacks = cbs;

    // Eventos
    elements.concSearchBtn.addEventListener('click', () => onConcordanciaSearch(1));
    elements.concQuery.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            onConcordanciaSearch(1);
        }
    });
}

export function getCurrentSearchData() {
    return currentSearchData;
}

// 🆕 AGREGAR ESTA FUNCIÓN
export function updateConcordanciaLabels(lang) {
    const labels = {
        'concVersion': 'version',
        'concTestament': 'filterBy',
        'concQuery': 'buscarPalabra'
    };
    
    Object.entries(labels).forEach(([id, key]) => {
        const label = document.querySelector(`label[for="${id}"]`);
        if (label) label.textContent = t(key, lang);
    });
    
    // Actualizar opciones de testamento
    const testamentSelect = document.getElementById('concTestament');
    if (testamentSelect) {
        const opts = {
            'ALL': t('allBible', lang),
            'OT': t('oldTest', lang),
            'NT': t('newTest', lang)
        };
        Array.from(testamentSelect.options).forEach(opt => {
            if (opts[opt.value]) opt.textContent = opts[opt.value];
        });
    }
    
    // Actualizar label checkbox
    const exactLabel = document.querySelector('label.exact-toggle-label');
    if (exactLabel) {
        exactLabel.textContent = t('exactWord', lang);
    }
    
    // Actualizar botón de búsqueda
    const searchBtn = document.getElementById('concSearchBtn');
    if (searchBtn) {
        searchBtn.textContent = t('search', lang);
    }
    
    // Actualizar placeholder
    const queryInput = document.getElementById('concQuery');
    if (queryInput) {
        queryInput.placeholder = lang === 'ca' ? 'Ej: amor, fe, esperança...' : 
                                 lang === 'en' ? 'Ex: love, faith, hope...' : 
                                 'Ej: amor, fe, esperanza...';
    }
}

export async function onConcordanciaSearch(page = 1) {
    const query = elements.concQuery.value.trim();
    const version = elements.concVersion.value;
    const testament = elements.concTestament.value;
    const exact = elements.concExact && elements.concExact.checked;
    const lang = localStorage.getItem('appLanguage') || 'es';

    const errorMsg = lang === 'ca' ? 'Escriu almenys 2 caràcters per cercar' : 
                     lang === 'en' ? 'Write at least 2 characters to search' : 
                     'Escribe al menos 2 caracteres para buscar';
    const searchingMsg = lang === 'ca' ? '🔍 Cercant a tota la Bíblia...' : 
                         lang === 'en' ? '🔍 Searching entire Bible...' : 
                         '🔍 Buscando en toda la Biblia...';

    if (!query || query.length < 2) {
        callbacks.showError(errorMsg);
        return;
    }

    currentSearchPage = page;
    elements.content.innerHTML = `<p class="loading">${searchingMsg}</p>`;
    if (elements.reference) {
        elements.reference.textContent = '';
        elements.reference.classList.remove('visible');
    }

    elements.concSearchBtn.disabled = true;
    elements.concSearchBtn.textContent = '⏱️...';

    const cacheKey = `${version}-${testament}-${query.toLowerCase()}-exact${exact}-p${page}`;
    if (cache.search[cacheKey]) {
        currentSearchData = cache.search[cacheKey];
        renderSearchResults(cache.search[cacheKey]);
        elements.concSearchBtn.disabled = false;
        elements.concSearchBtn.textContent = t('search', lang);
        return;
    }

    try {
        if (searchAbort) searchAbort.abort();
        searchAbort = new AbortController();
        const data = await fetchJSON(
            `${API_URL}/api/search?query=${encodeURIComponent(query)}&version=${version}&testament=${testament}&exact=${exact}&page=${page}&limit=20`,
            searchAbort.signal
        );
        cache.search[cacheKey] = data;
        currentSearchData = data;
        renderSearchResults(data);
    } catch (e) {
        if (e.name === "AbortError") return;
        const errorMsg = lang === 'ca' ? 'Error al fer la cerca' : 
                        lang === 'en' ? 'Error performing search' : 
                        'Error al realizar la búsqueda';
        callbacks.showError(errorMsg);
    } finally {
        elements.concSearchBtn.disabled = false;
        elements.concSearchBtn.textContent = t('search', lang);
    }
}

export function renderSearchResults(data) {
    const lang = localStorage.getItem('appLanguage') || 'es';
    const results = data.results;

    if (elements.reference) {
        const exactText = data.exact ? 
            (lang === 'ca' ? ' (exacta)' : lang === 'en' ? ' (exact)' : ' (exacta)') : '';
        elements.reference.textContent = `Resultados para "${data.query}"${exactText}`;
        elements.reference.classList.add('visible');
    }

    if (data.total === 0) {
        const noResultsMsg = lang === 'ca' ? 'No s\'han trobat resultats' : 
                            lang === 'en' ? 'No results found' : 
                            'No se encontraron resultados';
        elements.content.innerHTML = `<div class="search-no-results"><p class="search-icon">🔍</p><h3>${noResultsMsg}</h3></div>`;
        return;
    }

    const startResult = (data.page - 1) * data.limit + 1;
    const endResult = Math.min(data.page * data.limit, data.total);
    const resultText = lang === 'ca' ? 'resultats' : lang === 'en' ? 'results' : 'resultados';
    const showingText = lang === 'ca' ? 'Mostrant' : lang === 'en' ? 'Showing' : 'Mostrando';
    const exactText = data.exact ? 
        (lang === 'ca' ? ' (paraula exacta)' : lang === 'en' ? ' (exact word)' : ' (palabra exacta)') : '';

    let html = `<div class="search-stats">
        <span class="search-total">📊 ${data.total.toLocaleString()} ${resultText} para "<strong>${escapeHtml(data.query)}</strong>"${exactText}</span>
        <span class="search-range">${showingText} ${startResult}-${endResult}</span>
    </div>`;

    results.forEach(r => {
        const highlightedText = data.exact 
            ? highlightExactWord(r.text, data.query) 
            : highlightText(r.text, data.query);
        const testamentIcon = r.testament === 'OT' ? '📜' : '✝️';

        html += `<div class="search-result-card">
            <div class="search-result-header">
                <a href="#" class="search-result-ref search-nav-link"
                   data-book="${escapeHtml(r.book)}" data-chapter="${r.chapter}" data-verse="${r.verse}">
                    ${testamentIcon} ${r.book} ${r.chapter}:${r.verse}
                </a>
            </div>
            <p class="search-result-text">${highlightedText}</p>
        </div>`;
    });

    if (data.totalPages > 1) {
        const prevText = lang === 'ca' ? '⬅ Anterior' : lang === 'en' ? '⬅ Previous' : '⬅ Anterior';
        const nextText = lang === 'ca' ? 'Següent ➡' : lang === 'en' ? 'Next ➡' : 'Siguiente ➡';
        const pageText = lang === 'ca' ? 'Pàgina' : lang === 'en' ? 'Page' : 'Página';
        
        html += `<div class="search-pagination">`;
        if (data.page > 1) {
            html += `<button class="pagination-btn" data-page="${data.page - 1}">${prevText}</button>`;
        }
        html += `<span class="pagination-info">${pageText} ${data.page} de ${data.totalPages}</span>`;
        if (data.page < data.totalPages) {
            html += `<button class="pagination-btn" data-page="${data.page + 1}">${nextText}</button>`;
        }
        html += `</div>`;
    }

    elements.content.innerHTML = html;

    // Eventos de paginación
    elements.content.querySelectorAll('.pagination-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            onConcordanciaSearch(parseInt(btn.dataset.page));
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    });

    // Eventos de navegación a versículo
    elements.content.querySelectorAll('.search-nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            callbacks.navigateToVerse(link.dataset.book, link.dataset.chapter, link.dataset.verse);
        });
    });
}
