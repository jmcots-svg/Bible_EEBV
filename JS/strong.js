// strong.js

import { API_URL } from './config.js';
import { fetchJSON, escapeHtml, highlightText } from './utils.js';
import { cache, strongWordsCache } from './cache.js';
import { t } from './translations.js';

// Variables de estado del módulo
let currentStrongCode = null;
let elements = {};
let callbacks = {};

// ── Helper para obtener idioma actual ──
function getLang() {
    return localStorage.getItem('appLanguage') || 'es';
}

export function initStrong(els, cbs) {
    elements = els;
    callbacks = cbs;

    elements.strongVersion.addEventListener('change', () => {
        const lang = getLang();
        loadStrongBooks(elements.strongVersion.value);
        elements.strongChapter.innerHTML = `<option value="">${t('selectChapter', lang)}</option>`;
        elements.strongChapter.disabled = true;
        elements.strongVerse.innerHTML = `<option value="">${t('allChapter', lang)}</option>`;
        elements.strongVerse.disabled = true;
    });

    elements.strongBook.addEventListener('change', loadStrongChapters);
    elements.strongChapter.addEventListener('change', onStrongChapterChange);

    elements.strongVerse.addEventListener('change', () => {
        if (strongWordsCache[elements.strongChapter.value]) {
            renderStrongVerses(strongWordsCache[elements.strongChapter.value]);
        }
    });

    elements.strongBottomClose.addEventListener('click', closeStrongPanel);

    // ── Nuevos botones ──
    const minimizeBtn = document.getElementById('strongBottomMinimize');
    const maximizeBtn = document.getElementById('strongBottomMaximize');

    if (minimizeBtn) {
        minimizeBtn.addEventListener('click', toggleStrongMinimize);
    }
    if (maximizeBtn) {
        maximizeBtn.addEventListener('click', toggleStrongMaximize);
    }
}

// =====================================================
// MINIMIZAR / MAXIMIZAR / RESTAURAR
// =====================================================

function toggleStrongMinimize() {
    const panel = elements.strongBottomPanel;

    if (panel.classList.contains('minimized')) {
        panel.classList.remove('minimized');
        updateStrongMaximizeIcon(panel.classList.contains('maximized'));
    } else {
        panel.classList.remove('maximized');
        panel.classList.add('minimized');
        updateStrongMaximizeIcon(false);
    }
}

function toggleStrongMaximize() {
    const panel = elements.strongBottomPanel;
    
    // Si está minimizado, primero restaurar
    panel.classList.remove('minimized');
    
    if (panel.classList.contains('maximized')) {
        // Restaurar desde maximizado
        panel.classList.remove('maximized');
        updateStrongMaximizeIcon(false);
    } else {
        // Calcular altura de cabecera + tabs dinámicamente
        const appHeader = document.querySelector('header');
        const modeTabs  = document.querySelector('.mode-tabs');
        
        let topOffset = 0;
        if (appHeader) topOffset += appHeader.offsetHeight;
        if (modeTabs)  topOffset += modeTabs.offsetHeight;
        
        // Guardar como variable CSS
        panel.style.setProperty('--app-header-height', topOffset + 'px');
        
        panel.classList.add('maximized');
        updateStrongMaximizeIcon(true);
    }
}

function updateStrongMaximizeIcon(isMaximized) {
    const btn = document.getElementById('strongBottomMaximize');
    if (!btn) return;

    if (isMaximized) {
        // Restaurar: flechas apuntando hacia DENTRO
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
        // Maximizar: flechas apuntando hacia FUERA
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
// FUNCIONES EXISTENTES (sin cambios)
// =====================================================

export function updateStrongLabels(lang) {
    const labels = {
        'strongVersion': 'version',
        'strongBook': 'book',
        'strongChapter': 'chapter',
        'strongVerse': 'verse'
    };

    Object.entries(labels).forEach(([id, key]) => {
        const label = document.querySelector(`label[for="${id}"]`);
        if (label) label.textContent = t(key, lang);
    });

    updateStrongSelectPlaceholders(lang);
}

function updateStrongSelectPlaceholders(lang) {
    const updateFirstOption = (selectEl, translationKey) => {
        if (selectEl && selectEl.options.length > 0 && selectEl.options[0].value === '') {
            selectEl.options[0].textContent = t(translationKey, lang);
        }
    };

    updateFirstOption(elements.strongBook, 'selectBook');
    updateFirstOption(elements.strongChapter, 'selectChapter');
    updateFirstOption(elements.strongVerse, 'allChapter');
}

export async function loadStrongVersions() {
    const lang = getLang();

    try {
        const versions = await fetchJSON(`${API_URL}/api/versions/strongs`);
        elements.strongVersion.innerHTML = '';
        versions.forEach((v, i) => {
            const opt = document.createElement('option');
            opt.value = v.name;
            opt.textContent = v.fullName;
            opt.dataset.lang = v.language;
            if (i === 0) opt.selected = true;
            elements.strongVersion.appendChild(opt);
        });
        elements.strongVersion.disabled = false;
        if (versions.length > 0) {
            loadStrongBooks(versions[0].name);
        }
    } catch (e) {
        console.error('Error loading Strong versions:', e);
        elements.strongVersion.innerHTML = `<option value="">${t('errorLoading', lang)}</option>`;
    }
}

function getStrongDefLang() {
    return getLang();
}

async function loadStrongBooks(version) {
    if (!version) return;
    const lang = getLang();

    let books = cache.books[version];
    if (!books) {
        books = await fetchJSON(`${API_URL}/api/books?version=${version}`);
        cache.books[version] = books;
    }

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

    elements.strongBook.innerHTML = `<option value="">${t('selectBook', lang)}</option>`;
    elements.strongBook.appendChild(createGroup(t('oldTestament', lang), ot));
    elements.strongBook.appendChild(createGroup(t('newTestament', lang), nt));
    elements.strongBook.disabled = false;

    elements.strongChapter.innerHTML = `<option value="">${t('selectChapter', lang)}</option>`;
    elements.strongChapter.disabled = true;

    elements.strongVerse.innerHTML = `<option value="">${t('allChapter', lang)}</option>`;
    elements.strongVerse.disabled = true;
}

async function loadStrongChapters() {
    const bookId = elements.strongBook.value;
    if (!bookId) return;

    const lang = getLang();

    let chapters = cache.chapters[bookId];
    if (!chapters) {
        chapters = await fetchJSON(`${API_URL}/api/chapters?bookId=${bookId}`);
        cache.chapters[bookId] = chapters;
    }

    elements.strongChapter.innerHTML = `<option value="">${t('selectChapter', lang)}</option>`;
    chapters.forEach(ch => {
        const opt = document.createElement('option');
        opt.value = ch.id;
        opt.textContent = `${t('chapter', lang)} ${ch.number}`;
        opt.dataset.number = ch.number;
        elements.strongChapter.appendChild(opt);
    });
    elements.strongChapter.disabled = false;

    elements.strongVerse.innerHTML = `<option value="">${t('allChapter', lang)}</option>`;
    elements.strongVerse.disabled = true;
}

async function onStrongChapterChange() {
    const chId = elements.strongChapter.value;
    const lang = getLang();

    if (!chId) {
        elements.content.innerHTML = `<p class="placeholder">${t('placeholderStrong', lang)}</p>`;
        if (elements.reference) elements.reference.classList.remove('visible');
        return;
    }

    elements.strongVerse.innerHTML = `<option value="">${t('allChapter', lang)}</option>`;
    elements.strongVerse.disabled = true;
    elements.content.innerHTML = `<p class="loading">${t('loadingStrongWords', lang)}</p>`;

    try {
        let wordsData = strongWordsCache[chId];
        if (!wordsData) {
            wordsData = await fetchJSON(`${API_URL}/api/words?chapterId=${chId}`);
            strongWordsCache[chId] = wordsData;
        }

        const verseLabel = t('verse', lang).replace(/\s*\(.*?\)\s*/g, '');

        wordsData.forEach(v => {
            const opt = document.createElement('option');
            opt.value = v.verseNumber;
            opt.textContent = `${verseLabel} ${v.verseNumber}`;
            elements.strongVerse.appendChild(opt);
        });
        elements.strongVerse.disabled = false;

        renderStrongVerses(wordsData);
    } catch (e) {
        callbacks.showError(t('errorLoadingStrongWords', lang));
    }
}

export function renderStrongChapter() {
    const chId = elements.strongChapter.value;
    if (!chId) return;
    const wordsData = strongWordsCache[chId];
    if (wordsData) {
        renderStrongVerses(wordsData);
    } else {
        onStrongChapterChange();
    }
}

function renderStrongVerses(versesData) {
    const bName = elements.strongBook.selectedIndex >= 0
        ? elements.strongBook.options[elements.strongBook.selectedIndex].text : '';
    const chNum = elements.strongChapter.selectedIndex >= 0
        ? elements.strongChapter.options[elements.strongChapter.selectedIndex].dataset.number : '';
    const vNum = elements.strongVerse.value;

    let dataToRender = versesData;
    if (vNum) {
        dataToRender = versesData.filter(v => String(v.verseNumber) === String(vNum));
    }

    if (elements.reference) {
        elements.reference.textContent = `${bName} ${chNum}${vNum ? ':' + vNum : ''} (Strong)`;
        elements.reference.classList.add('visible');
    }

    let html = '';
    dataToRender.forEach(verseData => {
        html += `<p class="strong-verse"><span class="verse-number">${verseData.verseNumber}</span>`;

        verseData.words.forEach(word => {
            if (word.strong) {
                html += `<span class="strong-word-wrap">` +
                    `<span class="strong-code" data-strong="${word.strong}" title="Strong ${word.strong}">${word.strong}</span>` +
                    `<span class="strong-word-text">${escapeHtml(word.text)}</span>` +
                    `</span> `;
            } else {
                html += `<span class="strong-plain-word">${escapeHtml(word.text)}</span> `;
            }
        });

        html += `</p>`;
    });

    elements.content.innerHTML = html;

    elements.content.querySelectorAll('.strong-code').forEach(el => {
        el.addEventListener('click', (e) => {
            const code = e.target.dataset.strong;
            onStrongCodeClick(code, e.target);
        });
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function onStrongCodeClick(strongCode, clickedEl) {
    const lang = getLang();

    if (currentStrongCode === strongCode && elements.strongBottomPanel.classList.contains('open')) {
        closeStrongPanel();
        return;
    }

    elements.content.querySelectorAll('.strong-code.active').forEach(el => el.classList.remove('active'));
    clickedEl.classList.add('active');

    currentStrongCode = strongCode;
    elements.strongBottomCode.textContent = strongCode;
    elements.strongBottomCount.textContent = `${t('loading', lang)}`;

    elements.strongBottomContent.innerHTML = `
        <div class="strong-tabs">
            <button class="strong-tab active" data-tab="dict">${t('dictionary', lang)}</button>
            <button class="strong-tab" data-tab="refs">${t('references', lang)}</button>
        </div>
        <div class="strong-tab-panel" id="strongTabDict">
            <div class="strong-bottom-loading">${t('loadingDictionary', lang)}</div>
        </div>
        <div class="strong-tab-panel" id="strongTabRefs" style="display:none">
            <div class="strong-bottom-loading">${t('loadingReferences', lang)}</div>
        </div>
    `;

    // Abrir en estado normal
    elements.strongBottomPanel.classList.remove('minimized');
    elements.strongBottomPanel.classList.remove('maximized');
    elements.strongBottomPanel.classList.add('open');
    updateStrongMaximizeIcon(false);

    elements.strongBottomContent.querySelectorAll('.strong-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            elements.strongBottomContent.querySelectorAll('.strong-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            const tabName = tab.dataset.tab;
            document.getElementById('strongTabDict').style.display = tabName === 'dict' ? '' : 'none';
            document.getElementById('strongTabRefs').style.display = tabName === 'refs' ? '' : 'none';
        });
    });

    loadStrongDict(strongCode);
    loadStrongRefs(strongCode, 1);
}

async function loadStrongRefs(strongCode, page) {
    const lang = getLang();
    const defLang = getStrongDefLang();
    const panel = document.getElementById('strongTabRefs') || elements.strongBottomContent;

    try {
        const limit = 50;
        const data = await fetchJSON(
            `${API_URL}/api/strong-refs?strong=${encodeURIComponent(strongCode)}&page=${page}&limit=${limit}&lang=${defLang}`
        );

        const countLabel = data.total !== 1 ? t('referencesPlural', lang) : t('reference', lang);
        elements.strongBottomCount.textContent = `${data.total.toLocaleString()} ${countLabel}`;

        let html = '<div class="strong-ref-list-detailed">';

        if (data.total === 0) {
            html = `<div class="search-no-results"><h3>${t('noReferencesFound', lang)}</h3></div>`;
        } else {
            data.results.forEach(ref => {
                const icon = ref.testament === 'OT' ? '📜' : '✝️';
                let highlightedText = ref.text
                    ? escapeHtml(ref.text)
                    : `<em>${t('textNotAvailable', lang)}</em>`;

                if (ref.matched_words && Array.isArray(ref.matched_words)) {
                    const sortedWords = [...ref.matched_words].sort((a, b) => b.length - a.length);
                    sortedWords.forEach(word => {
                        if (word) highlightedText = highlightText(highlightedText, word);
                    });
                }

                html += `
                    <div class="search-result-card">
                        <div class="search-result-header">
                            <a href="#" class="strong-ref-item search-nav-link"
                               data-book="${escapeHtml(ref.book)}"
                               data-chapter="${ref.chapter}"
                               data-verse="${ref.verse}">
                                ${icon} ${ref.book} ${ref.chapter}:${ref.verse}
                            </a>
                        </div>
                        <p class="search-result-text">${highlightedText}</p>
                    </div>`;
            });
        }

        html += '</div>';

        if (data.totalPages > 1) {
            html += `<div class="search-pagination">`;
            if (data.page > 1) {
                html += `<button class="pagination-btn" data-page="${data.page - 1}">${t('prevShort', lang)}</button>`;
            }
            html += `<span class="pagination-info">${t('pageShort', lang)} ${data.page}/${data.totalPages}</span>`;
            if (data.page < data.totalPages) {
                html += `<button class="pagination-btn" data-page="${data.page + 1}">${t('nextShort', lang)}</button>`;
            }
            html += `</div>`;
        }

        panel.innerHTML = html;

        panel.querySelectorAll('.strong-ref-item').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                callbacks.navigateToVerseFromStrong(link.dataset.book, link.dataset.chapter, link.dataset.verse);
            });
        });

        panel.querySelectorAll('.pagination-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                panel.innerHTML = `<div class="strong-bottom-loading">${t('loadingShort', lang)}</div>`;
                loadStrongRefs(strongCode, parseInt(btn.dataset.page));
                panel.scrollTo({ top: 0, behavior: 'smooth' });
            });
        });

    } catch (e) {
        panel.innerHTML = `<p class="error">${t('errorLoadingReferences', lang)}</p>`;
    }
}

async function loadStrongDict(strongCode) {
    const panel = document.getElementById('strongTabDict');
    if (!panel) return;

    const lang = getLang();
    const defLang = getStrongDefLang();

    try {
        const data = await fetchJSON(
            `${API_URL}/api/strong-dict/${encodeURIComponent(strongCode)}?lang=${defLang}`
        );

        if (!data || data.error) {
            panel.innerHTML = `<p class="strong-dict-empty">${t('noDictInfo', lang)} <strong>${strongCode}</strong>.</p>`;
            return;
        }

        const isHebrew = data.language === 'H';
        const langLabel = isHebrew ? t('hebrew', lang) : t('greek', lang);

        let html = `<div class="strong-dict-entry">`;

        html += `<div class="strong-dict-header">`;
        if (data.lemma) {
            html += `<span class="strong-dict-lemma" dir="${isHebrew ? 'rtl' : 'ltr'}">${escapeHtml(data.lemma)}</span>`;
        }
        if (data.translit) {
            html += `<span class="strong-dict-translit">${escapeHtml(data.translit)}</span>`;
        }
        if (data.pronunciation) {
            html += `<span class="strong-dict-pronun">/${escapeHtml(data.pronunciation)}/</span>`;
        }
        html += `</div>`;

        html += `<div class="strong-dict-badges">`;
        html += `<span class="strong-dict-badge lang">${langLabel}</span>`;
        if (data.morphology) {
            html += `<span class="strong-dict-badge morph">${escapeHtml(data.morphology)}</span>`;
        }
        if (data.speechLang) {
            html += `<span class="strong-dict-badge speech">${escapeHtml(data.speechLang)}</span>`;
        }
        html += `</div>`;

        const sections = [
            { key: 'kjvDefinition', label: 'KJV', cssClass: 'kjv' },
            { key: 'definition', label: t('definition', lang) },
            { key: 'strongsDef', label: t('strongsDefinition', lang) },
            { key: 'strongsDerivation', label: t('derivation', lang) },
            { key: 'exegesis', label: t('exegesis', lang), cssClass: 'exegesis' },
            { key: 'explanation', label: t('explanation', lang) },
        ];

        sections.forEach(({ key, label, cssClass }) => {
            if (data[key]) {
                html += `<div class="strong-dict-section${cssClass ? ' ' + cssClass : ''}">
                            <span class="strong-dict-label">${label}</span>
                            <p>${escapeHtml(data[key])}</p>
                         </div>`;
            }
        });

        if (data.relations && data.relations.length > 0) {
            const relLabels = {
                see_also: t('relSeeAlso', lang),
                derives_from: t('relDerivesFrom', lang),
                greek_equiv: t('relGreekEquiv', lang),
                related: t('relRelated', lang)
            };

            html += `<div class="strong-dict-section">
                        <span class="strong-dict-label">${t('seeAlso', lang)}</span>
                        <div class="strong-dict-relations">`;

            data.relations.forEach(rel => {
                const label = relLabels[rel.relationType] ?? rel.relationType;
                html += `<button class="strong-dict-rel-btn" data-strong="${escapeHtml(rel.toStrong)}"
                                  title="${escapeHtml(rel.to?.kjvDefinition || '')}">
                            <span class="rel-code">${escapeHtml(rel.toStrong)}</span>
                            ${rel.to?.translit ? `<span class="rel-translit">${escapeHtml(rel.to.translit)}</span>` : ''}
                            <span class="rel-type">${label}</span>
                         </button>`;
            });

            html += `</div></div>`;
        }

        html += `</div>`;
        panel.innerHTML = html;

        panel.querySelectorAll('.strong-dict-rel-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const code = btn.dataset.strong;
                elements.strongBottomCode.textContent = code;
                currentStrongCode = code;
                elements.strongBottomContent.querySelectorAll('.strong-tab').forEach(tab => {
                    tab.classList.toggle('active', tab.dataset.tab === 'dict');
                });
                document.getElementById('strongTabDict').style.display = '';
                document.getElementById('strongTabRefs').style.display = 'none';
                document.getElementById('strongTabDict').innerHTML = `<div class="strong-bottom-loading">${t('loadingDictionary', lang)}</div>`;
                elements.strongBottomCount.textContent = `${t('loading', lang)}`;
                loadStrongDict(code);
                loadStrongRefs(code, 1);
            });
        });

    } catch (e) {
        panel.innerHTML = `<p class="error">${t('errorLoadingDictionary', lang)}</p>`;
        console.error('Error loadStrongDict:', e);
    }
}

export function reloadCurrentStrongIfOpen() {
    if (
        currentStrongCode &&
        elements.strongBottomPanel.classList.contains('open')
    ) {
        const lang = getLang();

        const dictPanel = document.getElementById('strongTabDict');
        const refsPanel = document.getElementById('strongTabRefs');

        if (dictPanel) {
            dictPanel.innerHTML = `
                <div class="strong-bottom-loading">
                    ${t('loadingDictionary', lang)}
                </div>`;
        }
        if (refsPanel) {
            refsPanel.innerHTML = `
                <div class="strong-bottom-loading">
                    ${t('loadingReferences', lang)}
                </div>`;
        }

        loadStrongDict(currentStrongCode);
        loadStrongRefs(currentStrongCode, 1);
    }
}

export function closeStrongPanel() {
    elements.strongBottomPanel.classList.remove('open');
    elements.strongBottomPanel.classList.remove('minimized');
    elements.strongBottomPanel.classList.remove('maximized');
    currentStrongCode = null;
    elements.content.querySelectorAll('.strong-code.active').forEach(el => el.classList.remove('active'));
    updateStrongMaximizeIcon(false);
}
