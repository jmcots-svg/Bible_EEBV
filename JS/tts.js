// ============================================================
// TTS MODULE - Text to Speech con Puter.js
// ============================================================

// Mapa de idiomas de la interfaz → códigos de voz Puter
const LANG_MAP = {
    'es': 'es-ES',
    'ca': 'ca-ES',
    'en': 'en-US'
};

// Voces disponibles por idioma y género
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

// Estado interno del módulo
let _state = {
    puterLoaded: false,
    isPaused: false,
    currentFragmentIndex: 0,
    textFragments: [],
    allAudios: [],
    globalAudio: new Audio(),
    currentGender: localStorage.getItem('ttsGender') || 'female'
};

// Referencias a elementos del DOM (se asignan en init)
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
// OBTENER TEXTO ACTIVO DE LA PANTALLA
// ─────────────────────────────────────────────

/**
 * Extrae el texto visible actualmente en pantalla.
 * Prioridad: panel de comentarios (si está abierto) → contenido principal
 */
export function getActiveText() {
    // 1. Panel de comentarios inferior (si está visible)
    const commentaryPanel = document.getElementById('commentaryBottomPanel');
    const commentaryContent = document.getElementById('commentaryBottomContent');
    if (
        commentaryPanel &&
        commentaryContent &&
        !commentaryPanel.classList.contains('hidden') &&
        commentaryPanel.style.display !== 'none' &&
        commentaryContent.innerText?.trim()
    ) {
        return commentaryContent.innerText.trim();
    }

    // 2. Contenido principal (versículos u otro modo activo)
    const content = document.getElementById('content');
    if (content) {
        return content.innerText.trim();
    }

    return '';
}

// ─────────────────────────────────────────────
// CONTROL DE GÉNERO (desde ajustes)
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
    if (_els.ttsGenderToggle) {
        _els.ttsGenderToggle.dataset.gender = gender;
        const labelMale   = _els.ttsGenderToggle.querySelector('[data-label="male"]');
        const labelFemale = _els.ttsGenderToggle.querySelector('[data-label="female"]');
        if (labelMale)   labelMale.classList.toggle('active',   gender === 'male');
        if (labelFemale) labelFemale.classList.toggle('active', gender === 'female');
    }
}

// ─────────────────────────────────────────────
// SELECCIÓN DE VOZ
// ─────────────────────────────────────────────
function _getVoice() {
    const appLang  = localStorage.getItem('appLanguage') || 'es';
    const puterLang = LANG_MAP[appLang] || 'es-ES';
    const gender    = _state.currentGender;

    const candidates = VOICES_DATA.filter(
        v => v.lang === puterLang && v.gender === gender
    );

    // Fallback: mismo idioma, cualquier género
    if (candidates.length === 0) {
        const fallback = VOICES_DATA.filter(v => v.lang === puterLang);
        return fallback[0]?.name || 'Lucia';
    }

    return candidates[0].name;
}

function _getLang() {
    const appLang = localStorage.getItem('appLanguage') || 'es';
    return LANG_MAP[appLang] || 'es-ES';
}

// ─────────────────────────────────────────────
// FRAGMENTACIÓN DE TEXTO
// ─────────────────────────────────────────────
function _splitText(text) {
    if (text.length <= MAX_CHARS) return [text];

    const fragments = [];
    let current = '';
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
// PLAYBACK
// ─────────────────────────────────────────────
export async function startTTSPlayback() {
    const text = getActiveText();
    if (!text) {
        _setStatus('⚠️ No hay texto para reproducir', 'warning');
        return;
    }
    if (!_state.puterLoaded) {
        _setStatus('⏳ Puter.js aún no está listo...', 'loading');
        return;
    }

    const voice    = _getVoice();
    const language = _getLang();

    _state.textFragments        = _splitText(text);
    _state.currentFragmentIndex = 0;
    _state.allAudios            = [];
    _state.isPaused             = false;

    _showProgressPanel(true);
    _setPlayBtn(false);
    _setStatus(
        `🎙️ Generando ${_state.textFragments.length} fragmento(s)...`,
        'generating'
    );

    try {
        for (let i = 0; i < _state.textFragments.length; i++) {
            _setStatus(
                `🎙️ Fragmento ${i + 1} / ${_state.textFragments.length}...`,
                'generating'
            );
            const audio = await window.puter.ai.txt2speech(
                _state.textFragments[i],
                { voice, engine: 'neural', language }
            );
            _state.allAudios.push(audio);
        }

        _setStatus('✅ Reproduciendo...', 'playing');
        _playFragment(0);

    } catch (err) {
        _setStatus(`❌ Error: ${err.message}`, 'error');
        _showProgressPanel(false);
        _setPlayBtn(true);
    }
}

export function stopTTS() {
    _state.globalAudio.pause();
    _state.globalAudio.currentTime = 0;
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

    // Actualizar UI de fragmento
    if (_els.ttsFragmentLabel) {
        _els.ttsFragmentLabel.textContent =
            `Fragmento ${index + 1} de ${_state.allAudios.length}`;
    }

    _setPauseBtn(false);
    _applySpeed(_getCurrentSpeed());

    // Desbloquear autoplay en Safari/iOS
    const silent = new Audio(
        'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA'
    );
    silent.play().then(() => silent.pause()).catch(() => {});

    _state.globalAudio.play().catch(err => {
        _setStatus(`❌ ${err.message}`, 'error');
    });

    // Progreso
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
    if (!audio.duration) return;
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
    return _els.ttsSpeedSlider
        ? parseFloat(_els.ttsSpeedSlider.value)
        : 1.0;
}

function _applySpeed(value) {
    _state.globalAudio.playbackRate = value;
    if (_els.ttsSpeedLabel)
        _els.ttsSpeedLabel.textContent = parseFloat(value).toFixed(2) + 'x';
}

// ─────────────────────────────────────────────
// HELPERS UI
// ─────────────────────────────────────────────
function _setStatus(msg, type) {
    if (!_els.ttsStatus) return;
    _els.ttsStatus.textContent  = msg;
    _els.ttsStatus.className    = `tts-status tts-status--${type}`;
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
// EVENTOS INTERNOS
// ─────────────────────────────────────────────
function _bindEvents() {
    _els.ttsPlayBtn  ?.addEventListener('click', startTTSPlayback);
    _els.ttsPauseBtn ?.addEventListener('click', togglePauseTTS);
    _els.ttsStopBtn  ?.addEventListener('click', stopTTS);
    _els.ttsNextBtn  ?.addEventListener('click', playNextFragment);
    _els.ttsSpeedSlider?.addEventListener('input', e => _applySpeed(e.target.value));

    // Toggle género desde ajustes
    if (_els.ttsGenderToggle) {
        _els.ttsGenderToggle.querySelectorAll('button').forEach(btn => {
            btn.addEventListener('click', () => {
                setTTSGender(btn.dataset.value);
            });
        });
    }
}

// ─────────────────────────────────────────────
// CARGA DE PUTER.JS
// ─────────────────────────────────────────────
function _loadPuter() {
    // Si ya está cargado globalmente
    if (window.puter) {
        _onPuterReady();
        return;
    }

    const script = document.createElement('script');
    script.src = 'https://js.puter.com/v2/';
    script.onload  = _onPuterReady;
    script.onerror = _onPuterError;
    document.head.appendChild(script);
}

function _onPuterReady() {
    _state.puterLoaded = true;
    _setPlayBtn(true);
    _setStatus('✅ Listo para reproducir', 'ready');
}

function _onPuterError() {
    _setStatus('❌ Error cargando Puter.js (¿Adblocker activo?)', 'error');
}
