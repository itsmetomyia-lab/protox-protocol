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

        if (typeof DailyReview !== 'undefined') {
            const latest = DailyReview.getLatestReview();
            if (latest && DailyReview.isUnread(latest)) {
                setTimeout(() => DailyReview.open(latest.dateKey), 450);
            }
        }
    }

    // Imposta timer per mezzanotte
    this.scheduleMidnightReset();
},

    // Esegui reset
performReset() {
    const player = loadPlayer();
    const today = new Date().toDateString();

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toDateString();

    // IMPORTANTISSIMO:
    // salviamo le azioni di ieri prima di pulire actionsToday
    const yesterdayActions = player.actionsToday ? player.actionsToday[yesterdayStr] : null;

    let resetInfo = null;
    if (typeof DailyReview !== 'undefined') {
        resetInfo = DailyReview.onNewDay(today);
    }

    // Aggiorna streak
    if (player.lastActiveDate && player.lastActiveDate !== today && player.lastActiveDate !== yesterdayStr) {
        const oldStreak = player.streak;
        player.streak = 0;
        if (oldStreak > 0) {
            console.log(`Streak persa! Era ${oldStreak} giorni.`);
        }
    }

    // Conta giorni clean usando DAVVERO le azioni di ieri
    if (!player.cleanDays) player.cleanDays = 0;
    if (yesterdayActions) {
        const hadNegative =
            yesterdayActions.junk_food ||
            yesterdayActions.doom_scroll ||
            yesterdayActions.addiction ||
            yesterdayActions.skip_workout ||
            yesterdayActions.late_sleep;

        if (!hadNegative) {
            player.cleanDays++;
        } else {
            player.cleanDays = 0;
        }
    }

    // Pulisci azioni vecchie, tieni solo oggi
    if (player.actionsToday) {
        const newActions = {};
        if (player.actionsToday[today]) {
            newActions[today] = player.actionsToday[today];
        }
        player.actionsToday = newActions;
    }

    Storage.save('player', player);

    // Rigenera missioni
    if (typeof Missions !== 'undefined') {
        Missions.generateDaily();
    }

    console.log('Reset giornaliero completato');
    return resetInfo;
},

    // Timer mezzanotte
    scheduleMidnightReset() {
        const now = new Date();
        const midnight = new Date(now);
        midnight.setHours(24, 0, 0, 0);
        const msUntilMidnight = midnight - now;

        setTimeout(() => {
            const resetInfo = this.performReset();
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

            const carryCount = Number(resetInfo?.carryOver?.count || 0);
            const message = carryCount > 0
                ? `🌅 Nuovo giorno! ${carryCount} task portate su oggi.`
                : '🌅 Nuovo giorno! Azioni resettate.';

            showMessage(message, 'positive');

            if (typeof DailyReview !== 'undefined') {
                const latest = DailyReview.getLatestReview();
                if (latest && DailyReview.isUnread(latest)) {
                    setTimeout(() => DailyReview.open(latest.dateKey), 350);
                }
            }

            // Rischedula per la prossima mezzanotte
            this.scheduleMidnightReset();

        }, msUntilMidnight);

        const hoursLeft = Math.floor(msUntilMidnight / (1000 * 60 * 60));
        const minsLeft = Math.floor((msUntilMidnight % (1000 * 60 * 60)) / (1000 * 60));
        console.log(`Reset automatico tra ${hoursLeft}h ${minsLeft}m`);
    }
};