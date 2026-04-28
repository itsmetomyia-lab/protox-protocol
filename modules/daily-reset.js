// ============================================
// PROTOX PROTOCOL - daily-reset.js
// Modulo: Reset giornaliero automatico
// Versione: 1.0
// Dipende da: storage.js
// ============================================

const DailyReset = {

    // Controlla se serve un reset
    check() {
        const lastReset = Storage.load('lastResetDate');
        const today = new Date().toDateString();

        if (lastReset !== today) {
            this.performReset();
            Storage.save('lastResetDate', today);
        }

        // Imposta timer per mezzanotte
        this.scheduleMidnightReset();
    },

    // Esegui reset
    performReset() {
        const player = loadPlayer();
        const today = new Date().toDateString();

        // Pulisci azioni di ieri (non di oggi)
        if (player.actionsToday) {
            const newActions = {};
            if (player.actionsToday[today]) {
                newActions[today] = player.actionsToday[today];
            }
            player.actionsToday = newActions;
        }

        // Aggiorna streak
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toDateString();

        if (player.lastActiveDate && player.lastActiveDate !== today && player.lastActiveDate !== yesterdayStr) {
            // Streak persa!
            const oldStreak = player.streak;
            player.streak = 0;
            if (oldStreak > 0) {
                console.log(`Streak persa! Era ${oldStreak} giorni.`);
            }
        }

        // Conta giorni senza azioni negative (per achievement clean week)
        if (!player.cleanDays) player.cleanDays = 0;
        const yesterdayActions = player.actionsToday ? player.actionsToday[yesterdayStr] : null;
        if (yesterdayActions) {
            const hadNegative = yesterdayActions.junk_food || yesterdayActions.doom_scroll || yesterdayActions.addiction;
            if (!hadNegative) {
                player.cleanDays++;
            } else {
                player.cleanDays = 0;
            }
        }

        Storage.save('player', player);

        // Rigenera missioni
        if (typeof Missions !== 'undefined') {
            Missions.generateDaily();
        }

        console.log('Reset giornaliero completato');
    },

    // Timer mezzanotte
    scheduleMidnightReset() {
        const now = new Date();
        const midnight = new Date(now);
        midnight.setHours(24, 0, 0, 0);
        const msUntilMidnight = midnight - now;

        setTimeout(() => {
            this.performReset();
            Storage.save('lastResetDate', new Date().toDateString());

            // Ricarica UI
            if (typeof updateUI === 'function') {
                const player = loadPlayer();
                updateUI(player);
            }

            // Rimuovi le classi "done" dalle azioni
            document.querySelectorAll('.action-item.done').forEach(item => {
                item.classList.remove('done');
            });

            showMessage('🌅 Nuovo giorno! Azioni resettate.', 'positive');

            // Rischedula per la prossima mezzanotte
            this.scheduleMidnightReset();

        }, msUntilMidnight);

        const hoursLeft = Math.floor(msUntilMidnight / (1000 * 60 * 60));
        const minsLeft = Math.floor((msUntilMidnight % (1000 * 60 * 60)) / (1000 * 60));
        console.log(`Reset automatico tra ${hoursLeft}h ${minsLeft}m`);
    }
};