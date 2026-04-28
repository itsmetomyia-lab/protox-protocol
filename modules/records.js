// ============================================
// PROTOX PROTOCOL - records.js
// Modulo: Record personali e statistiche
// Versione: 1.0
// Dipende da: storage.js
// ============================================

const Records = {

    // Carica o crea record
    load() {
        return Storage.load('records') || {
            maxStreak: 0,
            maxXPInDay: 0,
            maxRepsInDay: 0,
            totalDaysActive: 0,
            totalActionsCompleted: 0,
            totalMissionsCompleted: 0,
            bestLevel: 1,
            firstDay: null,
            dailyXP: {},
            dailyReps: {},
            categoryXP: { mind: 0, body: 0, will: 0, soul: 0 }
        };
    },

    // Salva record
    save(records) {
        Storage.save('records', records);
    },

    // Aggiorna record dopo ogni azione
    update(xpAmount, repsAmount, category) {
        const records = this.load();
        const player = loadPlayer();
        const today = new Date().toDateString();

        // Primo giorno
        if (!records.firstDay) {
            records.firstDay = today;
        }

        // Max streak
        if (player.streak > records.maxStreak) {
            records.maxStreak = player.streak;
        }

        // Best level
        if (player.level > records.bestLevel) {
            records.bestLevel = player.level;
        }

        // XP giornaliero
        if (!records.dailyXP[today]) records.dailyXP[today] = 0;
        if (xpAmount > 0) {
            records.dailyXP[today] += xpAmount;
        }

        // Max XP in un giorno
        if (records.dailyXP[today] > records.maxXPInDay) {
            records.maxXPInDay = records.dailyXP[today];
        }

        // Reps giornaliere
        if (!records.dailyReps[today]) records.dailyReps[today] = 0;
        if (repsAmount > 0) {
            records.dailyReps[today] += repsAmount;
        }

        // Max reps in un giorno
        if (records.dailyReps[today] > records.maxRepsInDay) {
            records.maxRepsInDay = records.dailyReps[today];
        }

        // Azioni completate
        records.totalActionsCompleted++;

        // Giorni attivi
        const daysActive = Object.keys(records.dailyXP).length;
        records.totalDaysActive = daysActive;

        // Categoria XP
        if (category && records.categoryXP[category] !== undefined) {
            records.categoryXP[category] += Math.abs(xpAmount);
        }

        this.save(records);
        return records;
    },

    // Ottieni XP ultimi 7 giorni
    getLast7Days() {
        const records = this.load();
        const days = [];

        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toDateString();
            const dayName = date.toLocaleDateString('it-IT', { weekday: 'short' });

            days.push({
                day: dayName,
                date: dateStr,
                xp: records.dailyXP[dateStr] || 0,
                reps: records.dailyReps[dateStr] || 0
            });
        }

        return days;
    },

    // Media reps al giorno
    getAvgRepsPerDay() {
        const records = this.load();
        if (records.totalDaysActive === 0) return 0;
        const player = loadPlayer();
        return Math.round(player.reps / records.totalDaysActive);
    },

    // Proiezione completamento 100K
    getProjection() {
        const avgReps = this.getAvgRepsPerDay();
        if (avgReps === 0) return null;

        const player = loadPlayer();
        const remaining = 100000 - player.reps;
        const daysNeeded = Math.ceil(remaining / avgReps);

        const completionDate = new Date();
        completionDate.setDate(completionDate.getDate() + daysNeeded);

        return {
            daysNeeded: daysNeeded,
            avgPerDay: avgReps,
            completionDate: completionDate.toLocaleDateString('it-IT'),
            remaining: remaining
        };
    },

    // Countdown 90 giorni
    get90DayCountdown() {
        const records = this.load();
        if (!records.firstDay) return { day: 0, remaining: 90, progress: 0 };

        const start = new Date(records.firstDay);
        const now = new Date();
        const diffTime = Math.abs(now - start);
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        return {
            day: Math.min(diffDays, 90),
            remaining: Math.max(0, 90 - diffDays),
            progress: Math.min((diffDays / 90) * 100, 100)
        };
    },

    // Calendario attività (ultimo mese)
    getCalendarData() {
        const records = this.load();
        const days = [];

        for (let i = 29; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toDateString();
            const xp = records.dailyXP[dateStr] || 0;

            let intensity = 0;
            if (xp > 0) intensity = 1;
            if (xp > 50) intensity = 2;
            if (xp > 150) intensity = 3;
            if (xp > 300) intensity = 4;

            days.push({
                date: dateStr,
                day: date.getDate(),
                xp: xp,
                intensity: intensity
            });
        }

        return days;
    },

    // Renderizza stats
    render() {
        const container = document.getElementById('stats-detail');
        if (!container) return;

        const records = this.load();
        const player = loadPlayer();
        const projection = this.getProjection();
        const countdown = this.get90DayCountdown();
        const last7 = this.getLast7Days();
        const calendar = this.getCalendarData();
        const maxXP7Days = Math.max(...last7.map(d => d.xp), 1);

        container.innerHTML = `
            <!-- COUNTDOWN 90 GIORNI -->
            <div class="stats-card">
                <h3>⏳ COUNTDOWN 90 GIORNI</h3>
                <div class="countdown-display">
                    <span class="countdown-day">GIORNO ${countdown.day}</span>
                    <span class="countdown-remaining">${countdown.remaining} giorni rimasti</span>
                </div>
                <div class="countdown-bar-container">
                    <div class="countdown-bar-fill" style="width: ${countdown.progress}%"></div>
                </div>
            </div>

            <!-- GRAFICO 7 GIORNI -->
            <div class="stats-card">
                <h3>📊 ULTIMI 7 GIORNI</h3>
                <div class="chart-7days">
                    ${last7.map(d => `
                        <div class="chart-bar-wrapper">
                            <div class="chart-bar" style="height: ${Math.max((d.xp / maxXP7Days) * 100, 5)}%">
                                <span class="chart-bar-value">${d.xp}</span>
                            </div>
                            <span class="chart-bar-label">${d.day}</span>
                        </div>
                    `).join('')}
                </div>
            </div>

            <!-- CALENDARIO ATTIVITÀ -->
            <div class="stats-card">
                <h3>📅 CALENDARIO ATTIVITÀ</h3>
                <div class="activity-calendar">
                    ${calendar.map(d => `
                        <div class="cal-day intensity-${d.intensity}" title="${d.date}: ${d.xp} XP">
                            <span class="cal-day-num">${d.day}</span>
                        </div>
                    `).join('')}
                </div>
                <div class="cal-legend">
                    <span>Meno</span>
                    <div class="cal-day intensity-0 mini"></div>
                    <div class="cal-day intensity-1 mini"></div>
                    <div class="cal-day intensity-2 mini"></div>
                    <div class="cal-day intensity-3 mini"></div>
                    <div class="cal-day intensity-4 mini"></div>
                    <span>Più</span>
                </div>
            </div>

            <!-- CATEGORIE -->
            <div class="stats-card">
                <h3>🎯 XP PER CATEGORIA</h3>
                <div class="category-stats">
                    <div class="cat-row">
                        <span class="cat-name">🧠 MIND</span>
                        <div class="cat-bar-bg"><div class="cat-bar-fill cat-mind" style="width: ${getCatPercent(records.categoryXP, 'mind')}%"></div></div>
                        <span class="cat-value">${records.categoryXP.mind}</span>
                    </div>
                    <div class="cat-row">
                        <span class="cat-name">💪 BODY</span>
                        <div class="cat-bar-bg"><div class="cat-bar-fill cat-body" style="width: ${getCatPercent(records.categoryXP, 'body')}%"></div></div>
                        <span class="cat-value">${records.categoryXP.body}</span>
                    </div>
                    <div class="cat-row">
                        <span class="cat-name">🔥 WILL</span>
                        <div class="cat-bar-bg"><div class="cat-bar-fill cat-will" style="width: ${getCatPercent(records.categoryXP, 'will')}%"></div></div>
                        <span class="cat-value">${records.categoryXP.will}</span>
                    </div>
                    <div class="cat-row">
                        <span class="cat-name">🕉️ SOUL</span>
                        <div class="cat-bar-bg"><div class="cat-bar-fill cat-soul" style="width: ${getCatPercent(records.categoryXP, 'soul')}%"></div></div>
                        <span class="cat-value">${records.categoryXP.soul}</span>
                    </div>
                </div>
            </div>

            <!-- RECORD PERSONALI -->
            <div class="stats-card">
                <h3>🏆 RECORD PERSONALI</h3>
                <div class="records-grid">
                    <div class="record-item">
                        <span class="record-value">${records.maxStreak}</span>
                        <span class="record-label">Max Streak</span>
                    </div>
                    <div class="record-item">
                        <span class="record-value">${records.maxXPInDay}</span>
                        <span class="record-label">Max XP/Giorno</span>
                    </div>
                    <div class="record-item">
                        <span class="record-value">${records.maxRepsInDay}</span>
                        <span class="record-label">Max Reps/Giorno</span>
                    </div>
                    <div class="record-item">
                        <span class="record-value">${records.totalDaysActive}</span>
                        <span class="record-label">Giorni Attivi</span>
                    </div>
                    <div class="record-item">
                        <span class="record-value">${records.totalActionsCompleted}</span>
                        <span class="record-label">Azioni Totali</span>
                    </div>
                    <div class="record-item">
                        <span class="record-value">${this.getAvgRepsPerDay()}</span>
                        <span class="record-label">Media Reps/Giorno</span>
                    </div>
                </div>
            </div>

            <!-- PROIEZIONE -->
            <div class="stats-card">
                <h3>🔮 PROIEZIONE 100K</h3>
                ${projection ? `
                    <div class="projection-info">
                        <p>Media: <strong>${projection.avgPerDay} reps/giorno</strong></p>
                        <p>Rimanenti: <strong>${projection.remaining.toLocaleString()} reps</strong></p>
                        <p>Giorni stimati: <strong>${projection.daysNeeded}</strong></p>
                        <p>Completamento: <strong>${projection.completionDate}</strong></p>
                    </div>
                ` : `
                    <p class="projection-empty">Inizia ad allenarti per vedere la proiezione!</p>
                `}
            </div>
        `;
    }
};

// Helper per percentuale categoria
function getCatPercent(categoryXP, cat) {
    const max = Math.max(...Object.values(categoryXP), 1);
    return Math.round((categoryXP[cat] / max) * 100);
}