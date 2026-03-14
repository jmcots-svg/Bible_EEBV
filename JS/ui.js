// ui.js

export function initTheme(themeCheckbox) {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
        if (themeCheckbox) themeCheckbox.checked = true;
    }
    
    if (themeCheckbox) {
        themeCheckbox.addEventListener('change', () => {
            const isDark = themeCheckbox.checked;
            document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
            localStorage.setItem('theme', isDark ? 'dark' : 'light');
        });
    }
}

export function initFontSize(fontKnob, fontTrack, contentEl) {
    const fontSizes = ['0.9rem', '1.1rem', '1.35rem'];
    let fontPos = parseInt(localStorage.getItem('fontPos') ?? '1');

    function applyFontPos(pos) {
        fontPos = pos;
        fontKnob.dataset.pos = pos;
        fontTrack.dataset.pos = pos;
        fontKnob.textContent = ['a', 'A', 'A'][pos];
        contentEl.style.setProperty('--font-reading', fontSizes[pos]);
        localStorage.setItem('fontPos', pos);
    }

    applyFontPos(fontPos);

    fontTrack.addEventListener('click', () => {
        applyFontPos((fontPos + 1) % 3);
    });
}

export function initSettingsPanel(settingsBtn, settingsPanel, closeSettingsBtn) {
    // Crear overlay
    const overlay = document.createElement('div');
    overlay.className = 'settings-overlay';
    document.body.appendChild(overlay);

    function openSettingsPanel() {
        settingsPanel.classList.add('open');
        overlay.classList.add('active');
    }

    function closeSettingsPanel() {
        settingsPanel.classList.remove('open');
        overlay.classList.remove('active');
    }

    settingsBtn.addEventListener('click', () => {
        const isOpen = settingsPanel.classList.contains('open');
        isOpen ? closeSettingsPanel() : openSettingsPanel();
    });

    closeSettingsBtn.addEventListener('click', closeSettingsPanel);
    overlay.addEventListener('click', closeSettingsPanel);

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && settingsPanel.classList.contains('open')) {
            closeSettingsPanel();
        }
    });
}