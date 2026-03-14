// concordancia.js

import { API_URL } from './config.js';
import { fetchJSON, escapeHtml, highlightText, highlightExactWord, isExactWordMatch } from './utils.js';
import { cache } from './cache.js';

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

export async function onConcordanciaSearch(page = 1) {
    const query = elements.concQuery.value.trim();
    const version = elements.concVersion.value;
    const testament = elements.concTestament.value;

    if (!query || query.length < 2) {
        callbacks.showError('Escribe al menos 2 caracteres para buscar');
        return;
    }

    currentSearchPage = page;
    elements.content.innerHTML = '<p class="loading">🔍 Buscando en toda la Biblia...</p>';
    if (elements.reference) {
        elements.reference.textContent = '';
        elements.reference.classList.remove('visible');
    }

    elements.concSearchBtn.disabled = true;
    elements.concSearchBtn.textContent = '⏱️...';

    const cacheKey = `${version}-${testament}-${query.toLowerCase()}-p${page}`;
    if (cache.search[cacheKey]) {
        currentSearchData = cache.search[cacheKey];
        renderSearchResults(cache.search[cacheKey]);
        elements.concSearchBtn.disabled = false;
        elements.concSearchBtn.textContent = '🔎 Buscar';
        return;
    }

    try {
        if (searchAbort) searchAbort.abort();
        searchAbort = new AbortController();
        const data = await fetchJSON(
            `${API_URL}/api/search?query=${encodeURIComponent(query)}&version=${version}&testament=${testament}&page=${page}&limit=20`,
            searchAbort.signal
        );
        cache.search[cacheKey] = data;
        currentSearchData = data;
        renderSearchResults(data);
    } catch (e) {
        if (e.name === "AbortError") return;
        callbacks.showError('Error al realizar la búsqueda');
    } finally {
        elements.concSearchBtn.disabled = false;
        elements.concSearchBtn.textContent = '🔎 Buscar';
    }
}

export function renderSearchResults(data) {
    const exactMode = elements.concExact && elements.concExact.checked;
    let results = data.results;

    if (exactMode) {
        results = results.filter(r => isExactWordMatch(r.text, data.query));
    }

    if (elements.reference) {
        elements.reference.textContent = `Resultados para "${data.query}"`;
        elements.reference.classList.add('visible');
    }

    // Sin resultados en absoluto
    if (data.total === 0) {
        elements.content.innerHTML = `<div class="search-no-results"><p class="search-icon">🔍</p><h3>No se encontraron resultados</h3></div>`;
        return;
    }

    // En modo exacto, sin coincidencias en esta página
    if (exactMode && results.length === 0) {
        elements.content.innerHTML = `<div class="search-no-results"><p class="search-icon">🔎</p><h3>Sin coincidencias exactas en esta página</h3></div>`;
        
        // Mostrar paginación para poder navegar
        if (data.totalPages > 1) {
            let paginationHtml = `<div class="search-pagination">`;
            if (data.page > 1) {
                paginationHtml += `<button class="pagination-btn" data-page="${data.page - 1}">⬅ Anterior</button>`;
            }
            paginationHtml += `<span class="pagination-info">Página ${data.page} de ${data.totalPages}</span>`;
            if (data.page < data.totalPages) {
                paginationHtml += `<button class="pagination-btn" data-page="${data.page + 1}">Siguiente ➡</button>`;
            }
            paginationHtml += `</div>`;
            elements.content.innerHTML += paginationHtml;
            
            elements.content.querySelectorAll('.pagination-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    onConcordanciaSearch(parseInt(btn.dataset.page));
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                });
            });
        }
        return;
    }

    // Calcular contadores correctos
    const totalToShow = exactMode ? results.length : data.total;
    const startResult = exactMode ? 1 : (data.page - 1) * data.limit + 1;
    const endResult = exactMode ? results.length : Math.min(data.page * data.limit, data.total);

    let html = `<div class="search-stats">
        <span class="search-total">📊 ${exactMode ? results.length : data.total.toLocaleString()} resultado${totalToShow !== 1 ? 's' : ''} para "<strong>${escapeHtml(data.query)}</strong>"${exactMode ? ' (en esta página)' : ''}</span>
        <span class="search-range">Mostrando ${startResult}-${endResult}</span>
    </div>`;

    results.forEach(r => {
        const highlightedText = exactMode 
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
        html += `<div class="search-pagination">`;
        if (data.page > 1) {
            html += `<button class="pagination-btn" data-page="${data.page - 1}">⬅ Anterior</button>`;
        }
        html += `<span class="pagination-info">Página ${data.page} de ${data.totalPages}</span>`;
        if (data.page < data.totalPages) {
            html += `<button class="pagination-btn" data-page="${data.page + 1}">Siguiente ➡</button>`;
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
