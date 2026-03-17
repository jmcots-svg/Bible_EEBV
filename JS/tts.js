// ============================================================
// JS/tts.js - TTS junto a la referencia con Puter.js
// ============================================================

const LANG_MAP = {
    'es': 'es-ES',
    'ca': 'ca-ES',
    'en': 'en-US'
};

const VOICES_DATA = [
    // Catalán
    { name: 'Arlet',   lang: 'ca-ES', gender: 'female', engine: 'neural'   },
    // Español
    { name: 'Lucia',   lang: 'es-ES', gender: 'female', engine: 'neural'   },
    { name: 'Sergioa<2', lang: 'es-ES', gender: 'male',   engine: 'neural' },
    // Inglés
    { name: 'Joanna',  lang: 'en-US', gender: 'female', engine: 'neural'   },
    { name: 'Matthew', lang: 'en-US', gender: 'male',   engine: 'neural'   },
];

const MAX_CHARS = 3000;

let _puterLoaded  = false;
let _currentAudio = null;
let _currentBtn   = null;
let _isPaused     = false;
let _gender       = localStorage.getItem('ttsGender') || 'female';
let _allAudios    = [];
let _fragments    = [];
let _fragIndex    = 0;

// ─────────────────────────────────────────────
// INIT
// ─────────────────────────────────────────────
export function initTTS(elements) {
    // Género en ajustes
    if (elements?.ttsGenderToggle) {
        _syncGenderUI(elements.ttsGenderToggle);
        elements.ttsGenderToggle.querySelectorAll('button').forEach(btn => {
            btn.addEventListener('click', () => {
                _gender = btn.dataset.value;
                localStorage.setItem('ttsGender', _gender);
                _syncGenderUI(elements.ttsGenderToggle);
            });
        });
    }

    _loadPuter();
}

function _syncGenderUI(toggle) {
    toggle.querySelectorAll('button').forEach(b => {
        b.classList.toggle('active', b.dataset.value === _gender);
    });
}

// ─────────────────────────────────────────────
// BOTÓN TTS — se crea/actualiza al renderizar versículos
// ─────────────────────────────────────────────

/**
 * Llamar desde renderVerses() en app.js después de pintar el contenido.
 * Inserta el botón 🔊 junto al elemento #reference.
 * @param {Array} versesData  — array de {number, text} que vienen de la DB
 */
export function attachTTSButton(versesData) {
    // Limpiar botón anterior si existe
    const old = document.getElementById('ttsSpeakBtn');
    if (old) old.remove();

    const reference = document.getElementById('reference');
    if (!reference) return;

    // Detener audio anterior si había
    stopTTS();

    // Guardar texto limpio de la DB (no del DOM)
    const fullText = versesData
        .map(v => `${v.number}. ${v.text}`)
        .join('\n');

    // Crear botón
    const btn = document.createElement('button');
    btn.id        = 'ttsSpeakBtn';
    btn.className = 'tts-speak-btn';
    btn.title     = 'Escuchar';
    btn.innerHTML = '🔊';

    btn.addEventListener('click', () => {
        if (_currentBtn === btn && !_isPaused) {
            // Está reproduciendo → pausar
            _pausePlayback(btn);
        } else if (_currentBtn === btn && _isPaused) {
            // Está en pausa → reanudar
            _resumePlayback(btn);
        } else {
            // Nuevo texto → reproducir
            _startPlayback(fullText, btn);
        }
    });

    // Insertar justo después del #reference
    reference.insertAdjacentElement('afterend', btn);
}

// ─────────────────────────────────────────────
// PLAYBACK
// ─────────────────────────────────────────────
async function _startPlayback(text, btn) {
    if (!_puterLoaded || !window.puter?.ai) {
        _setBtnState(btn, 'error');
        btn.title = 'Motor de voz no listo';
        return;
    }

    // Parar lo que haya
    stopTTS();

    _currentBtn = btn;
    _isPaused   = false;
    _fragments  = _splitText(text);
    _allAudios  = [];
    _fragIndex  = 0;

    const language = _getLang();
    const voiceData = _getVoice(language); 

    console.log('[TTS] Lang:', language, '| Voz:', voiceData.name, '| Motor:', voiceData.engine);

    _setBtnState(btn, 'loading');

    try {
        for (let i = 0; i < _fragments.length; i++) {
            const audio = await window.puter.ai.txt2speech(
                _fragments[i],
                language,
                voiceData.name,
                voiceData.engine    // ← motor específico de cada voz
            );
            if (!audio) throw new Error('Sin respuesta de audio');
            _allAudios.push(audio);
        }

        _setBtnState(btn, 'playing');
        _playFragment(0, btn);

    } catch (err) {
        console.error('[TTS] Error completo:', err);
        _setBtnState(btn, 'error');
        btn.title = `Error: ${err.message || JSON.stringify(err)}`;
        setTimeout(() => {
            if (btn) {
                _setBtnState(btn, 'idle');
                btn.title = 'Escuchar';
            }
        }, 3000);
    }
}

function _playFragment(index, btn) {
    if (index >= _allAudios.length) {
        // Fin
        _setBtnState(btn, 'idle');
        _currentBtn   = null;
        _currentAudio = null;
        return;
    }

    _fragIndex    = index;
    _currentAudio = _allAudios[index];

    _currentAudio.play().catch(err => {
        console.error('[TTS] Error play:', err);
        _setBtnState(btn, 'idle');
    });

    _currentAudio.onended = () => {
        _playFragment(index + 1, btn);
    };
}

function _pausePlayback(btn) {
    if (!_currentAudio) return;
    _currentAudio.pause();
    _isPaused = true;
    _setBtnState(btn, 'paused');
}

function _resumePlayback(btn) {
    if (!_currentAudio) return;
    _currentAudio.play();
    _isPaused = false;
    _setBtnState(btn, 'playing');
}

export function stopTTS() {
    if (_currentAudio) {
        try { _currentAudio.pause(); } catch(e) {}
        _currentAudio = null;
    }
    if (_currentBtn) {
        _setBtnState(_currentBtn, 'idle');
        _currentBtn = null;
    }
    _isPaused  = false;
    _allAudios = [];
    _fragments = [];
    _fragIndex = 0;
}

// ─────────────────────────────────────────────
// ESTADO VISUAL DEL BOTÓN
// ─────────────────────────────────────────────
const BTN_STATES = {
    idle:    { icon: '🔊', title: 'Escuchar',      cls: ''                  },
    loading: { icon: '⏳', title: 'Generando...',  cls: 'tts-btn--loading'  },
    playing: { icon: '⏸️', title: 'Pausar',        cls: 'tts-btn--playing'  },
    paused:  { icon: '▶️', title: 'Reanudar',      cls: 'tts-btn--paused'   },
    error:   { icon: '❌', title: 'Error',         cls: 'tts-btn--error'    },
};

function _setBtnState(btn, state) {
    if (!btn) return;
    const s = BTN_STATES[state] || BTN_STATES.idle;
    btn.innerHTML = s.icon;
    btn.title     = s.title;
    // Limpiar clases anteriores
    Object.values(BTN_STATES).forEach(v => { if (v.cls) btn.classList.remove(v.cls); });
    if (s.cls) btn.classList.add(s.cls);
}

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────
function _getLang() {
    const appLang = localStorage.getItem('appLanguage') || 'es';
    return LANG_MAP[appLang] || 'es-ES';
}

function _getVoice(lang) {
    const candidates = VOICES_DATA.filter(v => v.lang === lang && v.gender === _gender);
    if (candidates.length) return candidates[0];

    // Fallback: mismo idioma, cualquier género
    const fallback = VOICES_DATA.filter(v => v.lang === lang);
    if (fallback.length) return fallback[0];

    // Fallback final
    return { name: 'Sergio', lang: 'es-ES', gender: 'female', engine: 'neural' };
}

function _splitText(text) {
    if (text.length <= MAX_CHARS) return [text];

    const fragments  = [];
    let   current    = '';
    const paragraphs = text.split('\n');

    for (const para of paragraphs) {
        if ((current + '\n' + para).length <= MAX_CHARS) {
            current += (current ? '\n' : '') + para;
        } else {
            if (current) fragments.push(current);
            current = para;
        }
    }
    if (current) fragments.push(current);
    return fragments;
}

// ─────────────────────────────────────────────
// CARGA PUTER.JS
// ─────────────────────────────────────────────
function _loadPuter() {
    if (window.puter?.ai) {
        _puterLoaded = true;
        console.log('[TTS] Puter.js ya disponible');
        return;
    }

    const existing = document.querySelector('script[src*="puter.com"]');
    if (existing) {
        existing.addEventListener('load', _onPuterReady);
        existing.addEventListener('error', _onPuterError);
        return;
    }

    const script   = document.createElement('script');
    script.src     = 'https://js.puter.com/v2/';
    script.onload  = _onPuterReady;
    script.onerror = _onPuterError;
    document.head.appendChild(script);
}

function _onPuterReady() {
    setTimeout(() => {
        if (window.puter?.ai) {
            _puterLoaded = true;
            console.log('[TTS] Puter.js listo');
        } else {
            console.warn('[TTS] Puter cargado pero sin módulo AI');
        }
    }, 500);
}

function _onPuterError() {
    console.error('[TTS] No se pudo cargar Puter.js (¿Adblocker?)');
}
