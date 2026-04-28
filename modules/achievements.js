// ============================================
// PROTOX PROTOCOL - achievements.js
// Modulo: Sistema Badge e Achievements
// Versione: 1.0
// Dipende da: storage.js
// ============================================

const ACHIEVEMENTS = [
    // STREAK
    { id: 'streak_3', name: 'Getting Started', desc: '3 giorni di streak', icon: '🌱', condition: p => p.streak >= 3 },
    { id: 'streak_7', name: 'One Week Warrior', desc: '7 giorni di streak', icon: '⚔️', condition: p => p.streak >= 7 },
    { id: 'streak_14', name: 'Two Week Terror', desc: '14 giorni di streak', icon: '🔥', condition: p => p.streak >= 14 },
    { id: 'streak_30', name: 'Monthly Monster', desc: '30 giorni di streak', icon: '👹', condition: p => p.streak >= 30 },
    { id: 'streak_60', name: 'Unstoppable Force', desc: '60 giorni di streak', icon: '💎', condition: p => p.streak >= 60 },
    { id: 'streak_90', name: 'PROTOX Complete', desc: '90 giorni di streak', icon: '👑', condition: p => p.streak >= 90 },

    // REPS
    { id: 'reps_1000', name: 'First Thousand', desc: '1.000 reps', icon: '🎯', condition: p => p.reps >= 1000 },
    { id: 'reps_5000', name: 'Rep Machine', desc: '5.000 reps', icon: '⚙️', condition: p => p.reps >= 5000 },
    { id: 'reps_10000', name: 'Ten K Club', desc: '10.000 reps', icon: '🏅', condition: p => p.reps >= 10000 },
    { id: 'reps_25000', name: 'Quarter Way', desc: '25.000 reps', icon: '🥈', condition: p => p.reps >= 25000 },
    { id: 'reps_50000', name: 'Halfway There', desc: '50.000 reps', icon: '🥇', condition: p => p.reps >= 50000 },
    { id: 'reps_75000', name: 'Almost There', desc: '75.000 reps', icon: '💪', condition: p => p.reps >= 75000 },
    { id: 'reps_100000', name: 'PROTOX MASTER', desc: '100.000 reps!', icon: '🧠', condition: p => p.reps >= 100000 },

    // XP
    { id: 'xp_500', name: 'First Level Up', desc: '500 XP totali', icon: '⬆️', condition: p => p.xp >= 500 },
    { id: 'xp_5000', name: 'XP Hunter', desc: '5.000 XP', icon: '🎮', condition: p => p.xp >= 5000 },
    { id: 'xp_20000', name: 'XP Legend', desc: '20.000 XP', icon: '🌟', condition: p => p.xp >= 20000 },

    // LEVEL
    { id: 'level_5', name: 'Awakened', desc: 'Raggiungi livello 5', icon: '👁️', condition: p => p.level >= 5 },
    { id: 'level_8', name: 'Warrior', desc: 'Raggiungi livello 8', icon: '🗡️', condition: p => p.level >= 8 },
    { id: 'level_10', name: 'Elite', desc: 'Raggiungi livello 10', icon: '🛡️', condition: p => p.level >= 10 },
    { id: 'level_12', name: 'PROTOX Master', desc: 'Livello massimo!', icon: '🏆', condition: p => p.level >= 12 },

    // AZIONI SPECIALI
    { id: 'first_workout', name: 'First Sweat', desc: 'Primo workout', icon: '💦',
        condition: p => hasAction(p, 'workout') },
    { id: 'first_cold', name: 'Ice Breaker', desc: 'Prima cold shower', icon: '🧊',
        condition: p => hasAction(p, 'cold_shower') },
    { id: 'first_meditate', name: 'Inner Peace', desc: 'Prima meditazione', icon: '🧘',
        condition: p => hasAction(p, 'meditation') },
    { id: 'all_positive', name: 'Perfect Day', desc: 'Tutte le azioni positive in un giorno', icon: '⭐',
        condition: p => checkAllPositive(p) },
    { id: 'no_negative', name: 'Clean Week', desc: '7 giorni senza azioni negative', icon: '🌈',
        condition: p => p.cleanDays >= 7 }
];

// Helper: controlla se un'azione è stata fatta almeno una volta
function hasAction(player, actionId) {
    if (!player.actionsToday) return false;
    const days = Object.values(player.actionsToday);
    return days.some(day => day[actionId] && day[actionId] > 0);
}

// Helper: controlla se tutte le positive sono fatte oggi
function checkAllPositive(player) {
    const today = new Date().toDateString();
    if (!player.actionsToday || !player.actionsToday[today]) return false;
    const todayActions = player.actionsToday[today];
    const required = ['workout', 'cold_shower', 'meditation', 'reading', 'sleep', 'water', 'wakeup'];
    return required.every(a => todayActions[a] && todayActions[a] > 0);
}

const Achievements = {

    // Carica badge sbloccati
    loadUnlocked() {
        return Storage.load('achievements') || [];
    },

    // Salva badge sbloccati
    saveUnlocked(list) {
        Storage.save('achievements', list);
    },

    // Controlla tutti gli achievements
    checkAll() {
        const player = loadPlayer();
        const unlocked = this.loadUnlocked();
        const newBadges = [];

        ACHIEVEMENTS.forEach(achievement => {
            // Salta se già sbloccato
            if (unlocked.includes(achievement.id)) return;

            // Controlla condizione
            try {
                if (achievement.condition(player)) {
                    unlocked.push(achievement.id);
                    newBadges.push(achievement);
                }
            } catch (e) {
                // Ignora errori nelle condizioni
            }
        });

        if (newBadges.length > 0) {
            this.saveUnlocked(unlocked);
            newBadges.forEach((badge, i) => {
                setTimeout(() => {
                    this.showBadgePopup(badge);
                    addXP(50, `Badge: ${badge.name}`);
                }, i * 1500);
            });
        }

        return unlocked;
    },

    // Mostra popup badge
    showBadgePopup(badge) {
        const popup = document.createElement('div');
        popup.className = 'badge-popup';
        popup.innerHTML = `
            <div class="badge-popup-content">
                <span class="badge-popup-icon">${badge.icon}</span>
                <div class="badge-popup-text">
                    <span class="badge-popup-title">BADGE SBLOCCATO!</span>
                    <span class="badge-popup-name">${badge.name}</span>
                    <span class="badge-popup-desc">${badge.desc}</span>
                </div>
            </div>
        `;
        document.body.appendChild(popup);
        setTimeout(() => popup.remove(), 3000);
    },

    // Conta badge sbloccati
    getCount() {
        const unlocked = this.loadUnlocked();
        return { unlocked: unlocked.length, total: ACHIEVEMENTS.length };
    },

    // Renderizza inventario badge
    render() {
        const container = document.getElementById('badges-grid');
        if (!container) return;

        const unlocked = this.loadUnlocked();
        container.innerHTML = '';

        ACHIEVEMENTS.forEach(badge => {
            const isUnlocked = unlocked.includes(badge.id);
            const div = document.createElement('div');
            div.className = `badge-item ${isUnlocked ? 'unlocked' : 'locked'}`;
            div.innerHTML = `
                <span class="badge-icon">${isUnlocked ? badge.icon : '🔒'}</span>
                <span class="badge-name">${isUnlocked ? badge.name : '???'}</span>
                <span class="badge-desc">${isUnlocked ? badge.desc : 'Non sbloccato'}</span>
            `;
            container.appendChild(div);
        });

        // Counter
        const counter = document.getElementById('badges-count');
        if (counter) {
            const count = this.getCount();
            counter.textContent = `${count.unlocked} / ${count.total}`;
        }
    }
};