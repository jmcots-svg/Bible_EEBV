// concordancia.js

import { API_URL } from './config.js';
import { fetchJSON, escapeHtml, highlightText, highlightExactWord, isExactWordMatch } from './utils.js';
import { cache } from './cache.js';
import { t } from './translations.js';

let elements = {};
let callbacks = {};
let searchAbort = null;
let currentSearchPage = 1;
let currentSearchData = null;

// ── Helper para obtener idioma actual ──
function getLang() {
    return localStorage.getItem('appLanguage') || 'es';
}

export function initConcordancia(els, cbs) {
    elements = els;
    callbacks = cbs;

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

export function updateConcordanciaLabels(lang) {
    // ── Labels de los campos ──
    const labels = {
        'concVersion': 'version',
        'concTestament': 'filterBy',
        'concQuery': 'buscarPalabra'
    };

    Object.entries(labels).forEach(([id, key]) => {
        const label = document.querySelector(`label[for="${id}"]`);
        if (label) label.textContent = t(key, lang);
    });

    // ── Opciones de testamento ──
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

    // ── Label del checkbox ──
    const exactLabel = document.querySelector('label.exact-toggle-label');
    if (exactLabel) {
        exactLabel.textContent = t('exactWord', lang);
    }

    // ── Botón de búsqueda ──
    const searchBtn = document.getElementById('concSearchBtn');
    if (searchBtn) {
        searchBtn.textContent = t('search', lang);
    }

    // ── Placeholder del input ──
    const queryInput = document.getElementById('concQuery');
    if (queryInput) {
        queryInput.placeholder = t('placeholderExamples', lang);
    }
}

export async function onConcordanciaSearch(page = 1) {
    const query = elements.concQuery.value.trim();
    const version = elements.concVersion.value;
    const testament = elements.concTestament.value;
    const exact = elements.concExact && elements.concExact.checked;
    const lang = getLang();

    if (!query || query.length < 2) {
        callbacks.showError(t('minCharsSearch', lang));
        return;
    }

    currentSearchPage = page;
    elements.content.innerHTML = `<p class="loading">${t('searchingBible', lang)}</p>`;

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
        callbacks.showError(t('errorSearching', lang));
    } finally {
        elements.concSearchBtn.disabled = false;
        elements.concSearchBtn.textContent = t('search', lang);
    }
}

export function renderSearchResults(data) {
    const lang = getLang();
    const results = data.results;

    // ── Referencia superior ──
    if (elements.reference) {
        const exactText = data.exact ? t('exactSuffix', lang) : '';
        elements.reference.textContent = `${t('resultsForQuery', lang)} "${data.query}"${exactText}`;
        elements.reference.classList.add('visible');
    }

    // ── Sin resultados ──
    if (data.total === 0) {
        elements.content.innerHTML = `
            <div class="search-no-results">
                <p class="search-icon">🔍</p>
                <h3>${t('noResultsFound', lang)}</h3>
            </div>`;
        return;
    }

    // ── Estadísticas ──
    const startResult = (data.page - 1) * data.limit + 1;
    const endResult = Math.min(data.page * data.limit, data.total);
    const exactText = data.exact ? t('exactWordSuffix', lang) : '';

    let html = `
        <div class="search-stats">
            <span class="search-total">
                📊 ${data.total.toLocaleString()} ${t('resultsFor', lang)} "<strong>${escapeHtml(data.query)}</strong>"${exactText}
            </span>
            <span class="search-range">
                ${t('showing', lang)} ${startResult}-${endResult}
            </span>
        </div>`;

    // ── Tarjetas de resultados ──
    results.forEach(r => {
        const highlightedText = data.exact
            ? highlightExactWord(r.text, data.query)
            : highlightText(r.text, data.query);
        const testamentIcon = r.testament === 'OT' ? '📜' : '✝️';

        html += `
            <div class="search-result-card">
                <div class="search-result-header">
                    <a href="#" class="search-result-ref search-nav-link"
                       data-book="${escapeHtml(r.book)}" 
                       data-chapter="${r.chapter}" 
                       data-verse="${r.verse}">
                        ${testamentIcon} ${r.book} ${r.chapter}:${r.verse}
                    </a>
                </div>
                <p class="search-result-text">${highlightedText}</p>
            </div>`;
    });

    // ── Paginación ──
    if (data.totalPages > 1) {
        html += `<div class="search-pagination">`;

        if (data.page > 1) {
            html += `<button class="pagination-btn" data-page="${data.page - 1}">
                ${t('previousPage', lang)}
            </button>`;
        }

        html += `<span class="pagination-info">
            ${t('page', lang)} ${data.page} ${t('pageOf', lang)} ${data.totalPages}
        </span>`;

        if (data.page < data.totalPages) {
            html += `<button class="pagination-btn" data-page="${data.page + 1}">
                ${t('nextPage', lang)}
            </button>`;
        }

        html += `</div>`;
    }

    elements.content.innerHTML = html;

    // ── Eventos de paginación ──
    elements.content.querySelectorAll('.pagination-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            onConcordanciaSearch(parseInt(btn.dataset.page));
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    });

    // ── Eventos de navegación a versículo ──
    elements.content.querySelectorAll('.search-nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            callbacks.navigateToVerse(
                link.dataset.book,
                link.dataset.chapter,
                link.dataset.verse
            );
        });
    });
}

// ================================================
// PANEL IA — Reemplaza TODAS las funciones IA
// anteriores que hayas añadido
// ================================================

export function initIAPanel() {
  const wrapper    = document.getElementById('iaPanelWrapper');
  const triggerBar = document.getElementById('iaTriggerBar');

  if (!wrapper || !triggerBar) return;

  function updatePanelHeight() {
    const header   = document.querySelector('header');
    const modeTabs = document.querySelector('.mode-tabs');
    const headerH  = header   ? header.offsetHeight  : 50;
    const tabsH    = modeTabs ? modeTabs.offsetHeight : 52;
    
    const topPosition = headerH + tabsH;
    wrapper.style.setProperty('--ia-panel-top', `${topPosition}px`);
    
    console.log('IA Panel top:', topPosition);
  }

  updatePanelHeight();
  window.addEventListener('resize', updatePanelHeight);

  triggerBar.addEventListener('click', () => {
    if (wrapper.classList.contains('ia-open')) {
      wrapper.classList.remove('ia-open');
    } else {
      updatePanelHeight();
      wrapper.classList.add('ia-open');
      if (navigator.vibrate) navigator.vibrate([25, 15, 50]);
    }
  });
}

function _openIAPanel(wrapper) {
  wrapper.classList.add('ia-open');
  if (navigator.vibrate) navigator.vibrate([25, 15, 50]);
  try { localStorage.setItem('ia_panel_open', '1'); } catch(e) {}
}

function _closeIAPanel(wrapper) {
  wrapper.classList.remove('ia-open');
  try { localStorage.setItem('ia_panel_open', '0'); } catch(e) {}
}
