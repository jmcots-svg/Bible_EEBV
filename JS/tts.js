// ============================================================
// JS/tts.js - Text to Speech con Puter.js
// ============================================================

const LANG_MAP = {
    'es': 'es-ES',
    'ca': 'ca-ES',
    'en': 'en-US'
};

const VOICES_DATA = [
    { name: 'Arlet',    lang: 'ca-ES', gender: 'female' },
    { name: 'Conchita', lang: 'es-ES', gender: 'female' },
    { name: 'Lucia',    lang: 'es-ES', gender: 'female' },
    { name: 'Enrique',  lang: 'es-ES', gender: 'male'   },
    { name: 'Sergio',   lang: 'es-ES', gender: 'male'   },
    { name: 'Joanna',   lang: 'en-US', gender: 'female' },
    { name: 'Matthew',  lang: 'en-US', gender: 'male'   },
    { name: 'Joey',     lang: 'en-US', gender: 'male'   },
];

const MAX_CHARS = 3000;

let _state = {
    puterLoaded:          false,
    isPaused:             false,
    currentFragmentIndex: 0,
    textFragments:        [],
    allAudios:            [],
    globalAudio:          new Audio(),
    currentGender:        localStorage.getItem('ttsGender') || 'female'
};

let _els = {};

// ─────────────────────────────────────────────
// INIT
// ─────────────────────────────────────────────
export function initTTS(elements) {
    _els = elements;
    _bindEvents();
    _loadPuter();
    _applyGender(_state.currentGender);
}

// ─────────────────────────────────────────────
// TEXTO ACTIVO
// ─────────────────────────────────────────────
export function getActiveText() {
    // 1. Panel de comentarios si está visible
    const commentaryPanel   = document.getElementById('commentaryBottomPanel');
    const commentaryContent = document.getElementById('commentaryBottomContent');

    if (
        commentaryPanel &&
        commentaryContent &&
        getComputedStyle(commentaryPanel).display !== 'none' &&
        commentaryContent.innerText?.trim()
    ) {
        return commentaryContent.innerText.trim();
    }

    // 2. Contenido principal
    const content = document.getElementById('content');
    if (content && content.innerText?.trim()) {
        return content.innerText.trim();
    }

    return '';
}

// ─────────────────────────────────────────────
// GÉNERO
// ─────────────────────────────────────────────
export function setTTSGender(gender) {
    _state.currentGender = gender;
    localStorage.setItem('ttsGender', gender);
    _applyGender(gender);
}

export function getTTSGender() {
    return _state.currentGender;
}

function _applyGender(gender) {
    if (!_els.ttsGenderToggle) return;
    _els.ttsGenderToggle.querySelectorAll('button').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.value === gender);
    });
}

// ─────────────────────────────────────────────
// VOZ Y LANG
// ─────────────────────────────────────────────
function _getLang() {
    const appLang = localStorage.getItem('appLanguage') || 'es';
    return LANG_MAP[appLang] || 'es-ES';
}

function _getVoice(lang) {
    const gender     = _state.currentGender;
    const candidates = VOICES_DATA.filter(v => v.lang === lang && v.gender === gender);

    if (candidates.length > 0) return candidates[0].name;

    // Fallback: mismo idioma cualquier género
    const fallback = VOICES_DATA.filter(v => v.lang === lang);
    if (fallback.length > 0) return fallback[0].name;

    // Fallback final: Lucia
    return 'Lucia';
}

// ─────────────────────────────────────────────
// FRAGMENTACIÓN
// ─────────────────────────────────────────────
function _splitText(text) {
    if (text.length <= MAX_CHARS) return [text];

    const fragments = [];
    let current     = '';
    const paragraphs = text.split('\n\n');

    for (const para of paragraphs) {
        if ((current + para).length <= MAX_CHARS) {
            current += (current ? '\n\n' : '') + para;
        } else {
            if (current) fragments.push(current);
            if (para.length > MAX_CHARS) {
                const sentences = para.split(/(?<=[.!?])\s+/);
                current = '';
                for (const sentence of sentences) {
                    if ((current + sentence).length <= MAX_CHARS) {
                        current += (current ? ' ' : '') + sentence;
                    } else {
                        if (current) fragments.push(current);
                        current = sentence;
                    }
                }
            } else {
                current = para;
            }
        }
    }
    if (current) fragments.push(current);
    return fragments;
}

// ─────────────────────────────────────────────
// PLAYBACK PRINCIPAL
// ─────────────────────────────────────────────
export async function startTTSPlayback() {
    // Comprobar Puter
    if (!_state.puterLoaded || !window.puter) {
        _setStatus('⏳ Motor de voz no listo. Espera un momento...', 'loading');
        return;
    }

    // Obtener texto
    const text = getActiveText();
    if (!text) {
        _setStatus('⚠️ No hay texto visible para reproducir', 'warning');
        return;
    }

    // Obtener idioma y voz
    const language = _getLang();
    const voice    = _getVoice(language);

    console.log('[TTS] Idioma:', language, '| Voz:', voice, '| Chars:', text.length);

    // Preparar estado
    _state.textFragments        = _splitText(text);
    _state.currentFragmentIndex = 0;
    _state.allAudios            = [];
    _state.isPaused             = false;

    _setPlayBtn(false);
    _showProgressPanel(true);
    _setStatus(
        `🎙️ Generando audio (${_state.textFragments.length} fragmento${_state.textFragments.length > 1 ? 's' : ''})...`,
        'generating'
    );

    try {
        for (let i = 0; i < _state.textFragments.length; i++) {
            _setStatus(
                `🎙️ Preparando fragmento ${i + 1} de ${_state.textFragments.length}...`,
                'generating'
            );

            console.log('[TTS] Llamando puter.ai.txt2speech con:', {
                text: _state.textFragments[i].substring(0, 50) + '...',
                voice,
                language
            });

            const audio = await window.puter.ai.txt2speech(
                _state.textFragments[i],
                language,   // ← Puter espera: (text, lang, voice) o (text, options)
                voice
            );

            if (!audio) throw new Error('Puter no devolvió audio');
            _state.allAudios.push(audio);
        }

        _setStatus('🔊 Reproduciendo...', 'playing');
        _playFragment(0);

    } catch (err) {
        console.error('[TTS] Error completo:', err);
        _setStatus(`❌ Error: ${err.message || JSON.stringify(err)}`, 'error');
        _showProgressPanel(false);
        _setPlayBtn(true);
    }
}

export function stopTTS() {
    try { _state.globalAudio.pause(); } catch(e) {}
    _state.isPaused = false;
    _showProgressPanel(false);
    _setPlayBtn(true);
    _setStatus('⏹️ Detenido', 'ready');
}

export function togglePauseTTS() {
    if (_state.isPaused) {
        _state.globalAudio.play();
        _state.isPaused = false;
        _setPauseBtn(false);
        _setStatus('🔊 Reproduciendo...', 'playing');
    } else {
        _state.globalAudio.pause();
        _state.isPaused = true;
        _setPauseBtn(true);
        _setStatus('⏸️ En pausa', 'playing');
    }
}

export function playNextFragment() {
    const next = _state.currentFragmentIndex + 1;
    if (next < _state.allAudios.length) {
        _playFragment(next);
    }
}

function _playFragment(index) {
    if (index < 0 || index >= _state.allAudios.length) return;

    _state.currentFragmentIndex = index;
    _state.globalAudio          = _state.allAudios[index];
    _state.isPaused             = false;

    if (_els.ttsFragmentLabel) {
        _els.ttsFragmentLabel.textContent =
            `Fragmento ${index + 1} de ${_state.allAudios.length}`;
    }

    _setPauseBtn(false);
    _applySpeed(_getCurrentSpeed());

    // Desbloquear autoplay Safari/iOS
    const silent = new Audio(
        'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA'
    );
    silent.play().then(() => silent.pause()).catch(() => {});

    _state.globalAudio.play().then(() => {
        _setStatus('🔊 Reproduciendo...', 'playing');
    }).catch(err => {
        _setStatus(`❌ Error al reproducir: ${err.message}`, 'error');
    });

    _state.globalAudio.addEventListener('timeupdate', _updateProgress);

    _state.globalAudio.onended = () => {
        if (index + 1 < _state.allAudios.length) {
            _playFragment(index + 1);
        } else {
            _setStatus('✅ Reproducción completada', 'ready');
            _showProgressPanel(false);
            _setPlayBtn(true);
        }
    };
}

function _updateProgress() {
    const audio = _state.globalAudio;
    if (!audio || !audio.duration) return;

    const pct = (audio.currentTime / audio.duration) * 100;
    if (_els.ttsProgressFill)
        _els.ttsProgressFill.style.width = pct + '%';
    if (_els.ttsTimeCurrent)
        _els.ttsTimeCurrent.textContent = _formatTime(audio.currentTime);
    if (_els.ttsTimeTotal)
        _els.ttsTimeTotal.textContent = _formatTime(audio.duration);
}

// ─────────────────────────────────────────────
// VELOCIDAD
// ─────────────────────────────────────────────
function _getCurrentSpeed() {
    return _els.ttsSpeedSlider ? parseFloat(_els.ttsSpeedSlider.value) : 1.0;
}

function _applySpeed(value) {
    try { _state.globalAudio.playbackRate = parseFloat(value); } catch(e) {}
    if (_els.ttsSpeedLabel)
        _els.ttsSpeedLabel.textContent = parseFloat(value).toFixed(2) + 'x';
}

// ─────────────────────────────────────────────
// HELPERS UI
// ─────────────────────────────────────────────
function _setStatus(msg, type) {
    if (!_els.ttsStatus) return;
    _els.ttsStatus.textContent = msg;
    _els.ttsStatus.className   = `tts-status tts-status--${type}`;
}

function _setPlayBtn(enabled) {
    if (_els.ttsPlayBtn) _els.ttsPlayBtn.disabled = !enabled;
}

function _setPauseBtn(paused) {
    if (!_els.ttsPauseBtn) return;
    _els.ttsPauseBtn.textContent = paused ? '▶️ Reanudar' : '⏸️ Pausar';
}

function _showProgressPanel(show) {
    if (_els.ttsProgressContainer)
        _els.ttsProgressContainer.style.display = show ? 'block' : 'none';
}

function _formatTime(sec) {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
}

// ─────────────────────────────────────────────
// EVENTOS
// ─────────────────────────────────────────────
function _bindEvents() {
    _els.ttsPlayBtn    ?.addEventListener('click', startTTSPlayback);
    _els.ttsPauseBtn   ?.addEventListener('click', togglePauseTTS);
    _els.ttsStopBtn    ?.addEventListener('click', stopTTS);
    _els.ttsNextBtn    ?.addEventListener('click', playNextFragment);
    _els.ttsSpeedSlider?.addEventListener('input', e => _applySpeed(e.target.value));

    if (_els.ttsGenderToggle) {
        _els.ttsGenderToggle.querySelectorAll('button').forEach(btn => {
            btn.addEventListener('click', () => setTTSGender(btn.dataset.value));
        });
    }
}

// ─────────────────────────────────────────────
// CARGA PUTER.JS
// ─────────────────────────────────────────────
function _loadPuter() {
    if (window.puter) {
        _onPuterReady();
        return;
    }

    // Esperar a que Puter cargue si ya hay un script en el HTML
    const existing = document.querySelector('script[src*="puter.com"]');
    if (existing) {
        existing.addEventListener('load', _onPuterReady);
        existing.addEventListener('error', _onPuterError);
        return;
    }

    // Inyectar el script dinámicamente
    const script    = document.createElement('script');
    script.src      = 'https://js.puter.com/v2/';
    script.onload   = _onPuterReady;
    script.onerror  = _onPuterError;
    document.head.appendChild(script);
}

function _onPuterReady() {
    // Pequeño delay para asegurar que puter.ai está inicializado
    setTimeout(() => {
        if (window.puter && window.puter.ai) {
            _state.puterLoaded = true;
            _setPlayBtn(true);
            _setStatus('✅ Listo para reproducir', 'ready');
            console.log('[TTS] Puter.js cargado correctamente');
        } else {
            _setStatus('⚠️ Puter.js cargado pero sin módulo AI', 'warning');
            console.warn('[TTS] window.puter.ai no disponible');
        }
    }, 500);
}

function _onPuterError() {
    _setStatus('❌ Error cargando Puter.js (¿Adblocker activo?)', 'error');
    console.error('[TTS] No se pudo cargar Puter.js');
}
