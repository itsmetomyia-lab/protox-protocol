// ============================================
// PROTOX PROTOCOL - dark-light.js
// Modulo: Dark/Light mode toggle
// Versione: 1.0
// Dipende da: storage.js
// ============================================

const DarkLight = {

    // Controlla modalità corrente
    isLightMode() {
        return Storage.load('light_mode') === true;
    },

    // Toggle
    toggle() {
        const isLight = this.isLightMode();
        Storage.save('light_mode', !isLight);
        this.apply();

        showMessage(isLight ? '🌙 Dark Mode' : '☀️ Light Mode', 'positive');
    },

    // Applica modalità
    apply() {
        if (this.isLightMode()) {
            document.body.classList.add('light-mode');
        } else {
            document.body.classList.remove('light-mode');
        }

        // Aggiorna icona toggle
        const toggleIcon = document.getElementById('darklight-icon');
        if (toggleIcon) {
            toggleIcon.textContent = this.isLightMode() ? '🌙' : '☀️';
        }
    },

    // Init
    init() {
        this.apply();
    }
};