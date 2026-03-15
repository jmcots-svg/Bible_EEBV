// strong.js

import { API_URL } from './config.js';
import { fetchJSON, escapeHtml, highlightText } from './utils.js';
import { cache, strongWordsCache } from './cache.js';
import { t } from './translations.js';  // 🆕 AGREGAR

// Variables de estado del módulo
let currentStrongCode = null;
let elements = {};
let callbacks = {};

export function initStrong(els, cbs) {
    elements = els;
    callbacks = cbs;
    
    // Eventos
    elements.strongVersion.addEventListener('change', () => {
        loadStrongBooks(elements.strongVersion.value);
        elements.strongChapter.innerHTML = `<option value="">-- ${t('selectChapter')} --</option>`;
        elements.strongChapter.disabled = true;
        elements.strongVerse.innerHTML = `<option value="">${t('allChapter')}</option>`;
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
}

// 🆕 AGREGAR ESTA FUNCIÓN
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
}

export async function loadStrongVersions() {
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
        console.error('Error cargando versiones Strong:', e);
        const lang = localStorage.getItem('appLanguage') || 'es';
        const errorMsg = lang === 'ca' ? 'Error al carregar' : lang === 'en' ? 'Error loading' : 'Error al cargar';
        elements.strongVersion.innerHTML = `<option value="">${errorMsg}</option>`;
    }
}

function getStrongDefLang() {
    try {
        const opt = elements.strongVersion?.options?.[elements.strongVersion.selectedIndex];
        const lang = opt?.dataset?.lang?.trim()?.toLowerCase();
        if (lang === "en" || lang === "es") return lang;
        return "en";
    } catch {
        return "en";
    }
}

async function loadStrongBooks(version) {
    if (!version) return;
    const lang = localStorage.getItem('appLanguage') || 'es';
    const selectBookText = t('selectBook', lang);
    const oldTestText = t('oldTestament', lang);
    const newTestText = t('newTestament', lang);
    const selectChapText = t('selectChapter', lang);
    const allChapText = t('allChapter', lang);
    
    let books = cache.books[version];
    if (!books) {
        books = await fetchJSON(`${API_URL}/api/books?version=${version}`);
        cache.books[version] = books;
    }
    elements.strongBook.innerHTML = `<option value="">${selectBookText}</option>`;
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
    
    elements.strongBook.appendChild(createGroup(oldTestText, ot));
    elements.strongBook.appendChild(createGroup(newTestText, nt));
    elements.strongBook.disabled = false;
    elements.strongChapter.innerHTML = `<option value="">${selectChapText}</option>`;
    elements.strongChapter.disabled = true;
    elements.strongVerse.innerHTML = `<option value="">${allChapText}</option>`;
    elements.strongVerse.disabled = true;
}

async function loadStrongChapters() {
    const bookId = elements.strongBook.value;
    if (!bookId) return;
    const lang = localStorage.getItem('appLanguage') || 'es';
    const selectChapText = t('selectChapter', lang);
    const allChapText = t('allChapter', lang);
    const chapterText = lang === 'ca' ? 'Capítol' : lang === 'en' ? 'Chapter' : 'Capítulo';
    
    let chapters = cache.chapters[bookId];
    if (!chapters) {
        chapters = await fetchJSON(`${API_URL}/api/chapters?bookId=${bookId}`);
        cache.chapters[bookId] = chapters;
    }
    elements.strongChapter.innerHTML = `<option value="">${selectChapText}</option>`;
    chapters.forEach(ch => {
        const opt = document.createElement('option');
        opt.value = ch.id;
        opt.textContent = `${chapterText} ${ch.number}`;
        opt.dataset.number = ch.number;
        elements.strongChapter.appendChild(opt);
    });
    elements.strongChapter.disabled = false;
    elements.strongVerse.innerHTML = `<option value="">${allChapText}</option>`;
    elements.strongVerse.disabled = true;
}

async function onStrongChapterChange() {
    const chId = elements.strongChapter.value;
    const lang = localStorage.getItem('appLanguage') || 'es';
    
    if (!chId) {
        const placeholderText = t('placeholderStrong', lang);
        elements.content.innerHTML = `<p class="placeholder">${placeholderText}</p>`;
        if (elements.reference) elements.reference.classList.remove('visible');
        return;
    }
    
    const allChapText = t('allChapter', lang);
    const verseText = lang === 'ca' ? 'Versicle' : lang === 'en' ? 'Verse' : 'Versículo';
    const loadingMsg = lang === 'ca' ? '🔤 Carregant paraules amb Strong...' : 
                       lang === 'en' ? '🔤 Loading words with Strong...' : 
                       '🔤 Cargando palabras con Strong...';
    
    elements.strongVerse.innerHTML = `<option value="">${allChapText}</option>`;
    elements.strongVerse.disabled = true;
    elements.content.innerHTML = `<p class="loading">${loadingMsg}</p>`;

    try {
        let wordsData = strongWordsCache[chId];
        if (!wordsData) {
            wordsData = await fetchJSON(`${API_URL}/api/words?chapterId=${chId}`);
            strongWordsCache[chId] = wordsData;
        }

        wordsData.forEach(v => {
            const opt = document.createElement('option');
            opt.value = v.verseNumber;
            opt.textContent = `${verseText} ${v.verseNumber}`;
            elements.strongVerse.appendChild(opt);
        });
        elements.strongVerse.disabled = false;

        renderStrongVerses(wordsData);
    } catch (e) {
        const errorMsg = lang === 'ca' ? 'Error al carregar paraules Strong' : 
                        lang === 'en' ? 'Error loading Strong words' : 
                        'Error al cargar palabras Strong';
        callbacks.showError(errorMsg);
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
    const lang = localStorage.getItem('appLanguage') || 'es';
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
    const lang = localStorage.getItem('appLanguage') || 'es';
    const dictText = lang === 'ca' ? '📖 Diccionari' : lang === 'en' ? '📖 Dictionary' : '📖 Diccionario';
    const refsText = lang === 'ca' ? '🔍 References' : lang === 'en' ? '🔍 References' : '🔍 Referencias';
    const loadingDictMsg = lang === 'ca' ? '📖 Carregant diccionari...' : 
                           lang === 'en' ? '📖 Loading dictionary...' : 
                           '📖 Cargando diccionario...';
    const loadingRefsMsg = lang === 'ca' ? '🔍 Cercant referencias...' : 
                           lang === 'en' ? '🔍 Searching references...' : 
                           '🔍 Buscando referencias...';
    
    if (currentStrongCode === strongCode && elements.strongBottomPanel.classList.contains('open')) {
        closeStrongPanel();
        return;
    }

    elements.content.querySelectorAll('.strong-code.active').forEach(el => el.classList.remove('active'));
    clickedEl.classList.add('active');

    currentStrongCode = strongCode;
    elements.strongBottomCode.textContent = strongCode;
    elements.strongBottomCount.textContent = 'Cargando...';

    elements.strongBottomContent.innerHTML = `
        <div class="strong-tabs">
            <button class="strong-tab active" data-tab="dict">${dictText}</button>
            <button class="strong-tab" data-tab="refs">${refsText}</button>
        </div>
        <div class="strong-tab-panel" id="strongTabDict">
            <div class="strong-bottom-loading">${loadingDictMsg}</div>
        </div>
        <div class="strong-tab-panel" id="strongTabRefs" style="display:none">
            <div class="strong-bottom-loading">${loadingRefsMsg}</div>
        </div>
    `;

    elements.strongBottomPanel.classList.add('open');

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
    const lang = localStorage.getItem('appLanguage') || 'es';
    const defLang = getStrongDefLang();
    const panel = document.getElementById('strongTabRefs') || elements.strongBottomContent;

    try {
        const limit = 50;
        const data = await fetchJSON(
            `${API_URL}/api/strong-refs?strong=${encodeURIComponent(strongCode)}&page=${page}&limit=${limit}&lang=${defLang}`
        );

        const refText = lang === 'ca' ? 'referència' : lang === 'en' ? 'reference' : 'referencia';
        const refsText = lang === 'ca' ? 'referencias' : lang === 'en' ? 'references' : 'referencias';
        elements.strongBottomCount.textContent = `${data.total.toLocaleString()} ${data.total !== 1 ? refsText : refText}`;

        let html = '<div class="strong-ref-list-detailed">';

        if (data.total === 0) {
            const noResultsMsg = lang === 'ca' ? 'No s\'han trobat referencias' : 
                                lang === 'en' ? 'No references found' : 
                                'No se encontraron referencias';
            html = `<div class="search-no-results"><h3>${noResultsMsg}</h3></div>`;
        } else {
            data.results.forEach(ref => {
                const icon = ref.testament === 'OT' ? '📜' : '✝️';
                let highlightedText = ref.text ? escapeHtml(ref.text) : '<em>Texto no disponible</em>';

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
            const prevText = lang === 'ca' ? '⬅ Ant' : lang === 'en' ? '⬅ Prev' : '⬅ Ant';
            const nextText = lang === 'ca' ? 'Seg ➡' : lang === 'en' ? 'Next ➡' : 'Sig ➡';
            const pageText = lang === 'ca' ? 'Pàg' : lang === 'en' ? 'Page' : 'Pág';
            
            html += `<div class="search-pagination">`;
            if (data.page > 1) html += `<button class="pagination-btn" data-page="${data.page - 1}">${prevText}</button>`;
            html += `<span class="pagination-info">${pageText} ${data.page}/${data.totalPages}</span>`;
            if (data.page < data.totalPages) html += `<button class="pagination-btn" data-page="${data.page + 1}">${nextText}</button>`;
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
                const loadingMsg = lang === 'ca' ? '🔍 Carregant...' : lang === 'en' ? '🔍 Loading...' : '🔍 Cargando...';
                panel.innerHTML = `<div class="strong-bottom-loading">${loadingMsg}</div>`;
                loadStrongRefs(strongCode, parseInt(btn.dataset.page));
                panel.scrollTo({ top: 0, behavior: 'smooth' });
            });
        });

    } catch (e) {
        const errorMsg = lang === 'ca' ? '❌ Error al carregar referencias' : 
                        lang === 'en' ? '❌ Error loading references' : 
                        '❌ Error al cargar referencias';
        panel.innerHTML = `<p class="error">${errorMsg}</p>`;
    }
}

async function loadStrongDict(strongCode) {
    const panel = document.getElementById('strongTabDict');
    if (!panel) return;
    const lang = localStorage.getItem('appLanguage') || 'es';
    const defLang = getStrongDefLang();
    
    try {
        const data = await fetchJSON(
            `${API_URL}/api/strong-dict/${encodeURIComponent(strongCode)}?lang=${defLang}`
        );

        if (!data || data.error) {
            const emptyMsg = lang === 'ca' ? 'Sense informació del diccionari per' : 
                            lang === 'en' ? 'No dictionary information for' : 
                            'Sin información del diccionario para';
            panel.innerHTML = `<p class="strong-dict-empty">${emptyMsg} <strong>${strongCode}</strong>.</p>`;
            return;
        }

        const isHebrew = data.language === 'H';
        const langLabel = isHebrew ? '🔤 Hebreu' : '🔤 Grec';
        const kjvLabel = 'KJV';
        const defLabel = lang === 'ca' ? 'Definició' : lang === 'en' ? 'Definition' : 'Definición';
        const strongsDefLabel = 'Strong\'s Definition';
        const derivLabel = lang === 'ca' ? 'Derivació' : lang === 'en' ? 'Derivation' : 'Derivación';
        const exegLabel = lang === 'ca' ? 'Exègesis' : lang === 'en' ? 'Exegesis' : 'Exégesis';
        const explainLabel = lang === 'ca' ? 'Explicació' : lang === 'en' ? 'Explanation' : 'Explicación';
        const alsoLabel = lang === 'ca' ? 'Veure també' : lang === 'en' ? 'See also' : 'Ver también';

        let html = `<div class="strong-dict-entry">`;

        // Cabecera
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

        // Badges
        html += `<div class="strong-dict-badges">`;
        html += `<span class="strong-dict-badge lang">${langLabel}</span>`;
        if (data.morphology) {
            html += `<span class="strong-dict-badge morph">${escapeHtml(data.morphology)}</span>`;
        }
        if (data.speechLang) {
            html += `<span class="strong-dict-badge speech">${escapeHtml(data.speechLang)}</span>`;
        }
        html += `</div>`;

        // KJV
        if (data.kjvDefinition) {
            html += `<div class="strong-dict-section kjv">
                        <span class="strong-dict-label">${kjvLabel}</span>
                        <p>${escapeHtml(data.kjvDefinition)}</p>
                     </div>`;
        }

        // Definición
        if (data.definition) {
            html += `<div class="strong-dict-section">
                        <span class="strong-dict-label">${defLabel}</span>
                        <p>${escapeHtml(data.definition)}</p>
                     </div>`;
        }

        // Strong's Def
        if (data.strongsDef) {
            html += `<div class="strong-dict-section">
                        <span class="strong-dict-label">${strongsDefLabel}</span>
                        <p>${escapeHtml(data.strongsDef)}</p>
                     </div>`;
        }

        // Derivación
        if (data.strongsDerivation) {
            html += `<div class="strong-dict-section">
                        <span class="strong-dict-label">${derivLabel}</span>
                        <p>${escapeHtml(data.strongsDerivation)}</p>
                     </div>`;
        }

        // Exégesis
        if (data.exegesis) {
            html += `<div class="strong-dict-section exegesis">
                        <span class="strong-dict-label">${exegLabel}</span>
                        <p>${escapeHtml(data.exegesis)}</p>
                     </div>`;
        }

        // Explicación
        if (data.explanation) {
            html += `<div class="strong-dict-section">
                        <span class="strong-dict-label">${explainLabel}</span>
                        <p>${escapeHtml(data.explanation)}</p>
                     </div>`;
        }

        // Relaciones
        if (data.relations && data.relations.length > 0) {
            html += `<div class="strong-dict-section">
                        <span class="strong-dict-label">${alsoLabel}</span>
                        <div class="strong-dict-relations">`;
            data.relations.forEach(rel => {
                const relLabels = {
                    see_also: lang === 'ca' ? 'veure també' : lang === 'en' ? 'see also' : 'ver también',
                    derives_from: lang === 'ca' ? 'deriva de' : lang === 'en' ? 'derives from' : 'deriva de',
                    greek_equiv: lang === 'ca' ? 'equiv. grec' : lang === 'en' ? 'greek equiv.' : 'equiv. griego',
                    related: lang === 'ca' ? 'relacionat' : lang === 'en' ? 'related' : 'relacionado'
                };
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

        // Click en relaciones
        panel.querySelectorAll('.strong-dict-rel-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const code = btn.dataset.strong;
                const loadingMsg = lang === 'ca' ? '📖 Carregant diccionari...' : 
                                  lang === 'en' ? '📖 Loading dictionary...' : 
                                  '📖 Cargando diccionario...';
                elements.strongBottomCode.textContent = code;
                currentStrongCode = code;
                elements.strongBottomContent.querySelectorAll('.strong-tab').forEach(t => {
                    t.classList.toggle('active', t.dataset.tab === 'dict');
                });
                document.getElementById('strongTabDict').style.display = '';
                document.getElementById('strongTabRefs').style.display = 'none';
                document.getElementById('strongTabDict').innerHTML = `<div class="strong-bottom-loading">${loadingMsg}</div>`;
                elements.strongBottomCount.textContent = 'Cargando...';
                loadStrongDict(code);
                loadStrongRefs(code, 1);
            });
        });

    } catch (e) {
        const errorMsg = lang === 'ca' ? '❌ Error al carregar el diccionari' : 
                        lang === 'en' ? '❌ Error loading dictionary' : 
                        '❌ Error al cargar el diccionario';
        panel.innerHTML = `<p class="error">${errorMsg}</p>`;
        console.error('Error loadStrongDict:', e);
    }
}

export function closeStrongPanel() {
    elements.strongBottomPanel.classList.remove('open');
    currentStrongCode = null;
    elements.content.querySelectorAll('.strong-code.active').forEach(el => el.classList.remove('active'));
}
