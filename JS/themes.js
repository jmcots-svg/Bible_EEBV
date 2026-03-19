// themes.js
// Gestión de skins/temas de color

const SKINS = ['classic', 'lavanda', 'scriptorium', 'blossom', 'ocean', 'sunset', 'forest'];
const STORAGE_KEY = 'appSkin';

/**
 * Aplica un skin al elemento <html>
 */
export function applySkin(skinName) {
    if (!SKINS.includes(skinName)) skinName = 'classic';
    
    document.documentElement.setAttribute('data-skin', skinName);
    localStorage.setItem(STORAGE_KEY, skinName);
    
    // Actualizar dots activos en el selector
    document.querySelectorAll('.skin-dot').forEach(dot => {
        dot.classList.toggle('active', dot.dataset.skin === skinName);
    });
}

/**
 * Carga el skin guardado (llamar al inicio de la app)
 */
export function loadSavedSkin() {
    const saved = localStorage.getItem(STORAGE_KEY) || 'classic';
    applySkin(saved);
}

/**
 * Inicializa los listeners de los dots del selector
 */
export function initSkinSelector() {
    document.querySelectorAll('.skin-dot').forEach(dot => {
        dot.addEventListener('click', () => {
            applySkin(dot.dataset.skin);
        });
    });
    
    // Marcar el skin activo al inicializar
    const current = localStorage.getItem(STORAGE_KEY) || 'classic';
    document.querySelectorAll('.skin-dot').forEach(dot => {
        dot.classList.toggle('active', dot.dataset.skin === current);
    });
}
