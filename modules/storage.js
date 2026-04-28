// ============================================
// PROTOX PROTOCOL - storage.js
// Modulo: Gestione salvataggio dati locali
// Versione: 1.0
// ============================================

const Storage = {

    save(key, data) {
        try {
            localStorage.setItem('protox_' + key, JSON.stringify(data));
            return true;
        } catch (e) {
            console.error('Errore salvataggio:', e);
            return false;
        }
    },

    load(key) {
        try {
            const data = localStorage.getItem('protox_' + key);
            return data ? JSON.parse(data) : null;
        } catch (e) {
            console.error('Errore caricamento:', e);
            return null;
        }
    },

    delete(key) {
        localStorage.removeItem('protox_' + key);
    },

    resetAll() {
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
            if (key.startsWith('protox_')) {
                localStorage.removeItem(key);
            }
        });
        console.log('Reset completo effettuato');
    },

    exists(key) {
        return localStorage.getItem('protox_' + key) !== null;
    }

};