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
    if (!fontKnob || !fontTrack) return;

    const fontSizes = ['0.95rem', '1.1rem', '1.3rem'];
    let fontPos = parseInt(localStorage.getItem('fontPos') ?? '1');

    function applyFontSize(pos) {
        fontPos = pos;
        
        // Aplicar a la variable CSS GLOBAL (document.documentElement)
        document.documentElement.style.setProperty('--font-reading', fontSizes[pos]);
        
        // Actualizar la bolita y el track
        fontKnob.textContent = 'A';
        fontKnob.setAttribute('data-pos', pos);
        fontTrack.setAttribute('data-pos', pos);
        
        // Guardar preferencia
        localStorage.setItem('fontPos', pos);
    }

    // Aplicar tamaño guardado al iniciar
    applyFontSize(fontPos);

    // Click en la pista - detectar zona
    fontTrack.addEventListener('click', (e) => {
        const rect = fontTrack.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const trackWidth = rect.width;
        const zoneWidth = trackWidth / 3;

        let newPos;
        if (clickX < zoneWidth) {
            newPos = 0;  // Izquierda → pequeño
        } else if (clickX < zoneWidth * 2) {
            newPos = 1;  // Centro → mediano
        } else {
            newPos = 2;  // Derecha → grande
        }

        if (newPos !== fontPos) {
            applyFontSize(newPos);
        }
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

// ui.js (añadir al final)

export function setupCollapsibleFilters(toggleBtnId, collapsibleId, refLabelId) {
    const btn = document.getElementById(toggleBtnId);
    const panel = document.getElementById(collapsibleId);
    const refLabel = document.getElementById(refLabelId);
    if (!btn || !panel) return null;

    let isOpen = true;

    btn.addEventListener('click', () => {
        isOpen = !isOpen;
        panel.classList.toggle('collapsed', !isOpen);
        btn.classList.toggle('collapsed', !isOpen);
    });

    return {
        collapse: () => {
            if (isOpen) {
                isOpen = false;
                panel.classList.add('collapsed');
                btn.classList.add('collapsed');
            }
        },
        updateRef: (text) => {
            if (refLabel && text) refLabel.textContent = text;
        }
    };
}
