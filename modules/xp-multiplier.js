// ============================================
// PROTOX PROTOCOL - xp-multiplier.js
// Modulo: Moltiplicatore XP basato su streak
// Versione: 1.0
// Dipende da: storage.js
// ============================================

const XPMultiplier = {

    // Tabella moltiplicatori
    tiers: [
        { minStreak: 0,  multiplier: 1.0,  name: 'Base',       icon: '⚪' },
        { minStreak: 3,  multiplier: 1.25, name: 'Warming Up', icon: '🟡' },
        { minStreak: 7,  multiplier: 1.5,  name: 'On Fire',    icon: '🟠' },
        { minStreak: 14, multiplier: 1.75, name: 'Unstoppable',icon: '🔴' },
        { minStreak: 21, multiplier: 2.0,  name: 'Beast Mode', icon: '🟣' },
        { minStreak: 30, multiplier: 2.5,  name: 'Legendary',  icon: '⚡' },
        { minStreak: 60, multiplier: 3.0,  name: 'GODMODE',    icon: '👑' },
        { minStreak: 90, multiplier: 5.0,  name: 'PROTOX',     icon: '🧠' }
    ],

    // Ottieni moltiplicatore attuale
    getCurrent() {
        const player = Storage.load('player');
        if (!player) return 1.0;
        return this.getForStreak(player.streak);
    },

    // Calcola moltiplicatore per una data streak
    getForStreak(streak) {
        let current = this.tiers[0];
        for (let i = this.tiers.length - 1; i >= 0; i--) {
            if (streak >= this.tiers[i].minStreak) {
                current = this.tiers[i];
                break;
            }
        }
        return current.multiplier;
    },

    // Ottieni info tier attuale
    getCurrentTier() {
        const player = Storage.load('player');
        if (!player) return this.tiers[0];

        let current = this.tiers[0];
        for (let i = this.tiers.length - 1; i >= 0; i--) {
            if (player.streak >= this.tiers[i].minStreak) {
                current = this.tiers[i];
                break;
            }
        }
        return current;
    },

    // Ottieni prossimo tier
    getNextTier() {
        const player = Storage.load('player');
        if (!player) return this.tiers[1];

        for (let i = 0; i < this.tiers.length; i++) {
            if (player.streak < this.tiers[i].minStreak) {
                return this.tiers[i];
            }
        }
        return null; // Max tier raggiunto
    },

    // Renderizza widget moltiplicatore
    render() {
        const container = document.getElementById('multiplier-display');
        if (!container) return;

        const current = this.getCurrentTier();
        const next = this.getNextTier();
        const player = Storage.load('player');
        const streak = player ? player.streak : 0;

        let nextText = '';
        if (next) {
            const daysLeft = next.minStreak - streak;
            nextText = `${daysLeft} giorni per x${next.multiplier}`;
        } else {
            nextText = 'TIER MASSIMO RAGGIUNTO';
        }

        container.innerHTML = `
            <div class="multiplier-current">
                <span class="mult-icon">${current.icon}</span>
                <span class="mult-value">x${current.multiplier}</span>
                <span class="mult-name">${current.name}</span>
            </div>
            <div class="multiplier-next">${nextText}</div>
        `;
    }
};