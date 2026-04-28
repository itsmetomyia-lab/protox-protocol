// ============================================
// PROTOX PROTOCOL - protox-tracker.js
// Modulo: Tracker avanzato Protox con input manuale
// Versione: 1.0
// Dipende da: storage.js, xp-multiplier.js, records.js
// ============================================

const ProtoxTracker = {

    // Aggiungi reps con input manuale
    addManualReps() {
        const input = document.getElementById('manual-reps-input');
        if (!input) return;

        const amount = parseInt(input.value);
        if (isNaN(amount) || amount <= 0) {
            showMessage('Inserisci un numero valido!', 'warning');
            return;
        }

        if (amount > 10000) {
            showMessage('Massimo 10.000 reps alla volta!', 'warning');
            return;
        }

        input.value = '';
        this.processReps(amount);
    },

    // Aggiungi reps con bottone
    addQuickReps(amount) {
        this.processReps(amount);
    },

    // Processa le reps
    processReps(amount) {
        let player = loadPlayer();
        player.reps += amount;
        if (player.reps > 100000) player.reps = 100000;

        // XP con moltiplicatore
        const multiplier = XPMultiplier.getCurrent();
        const baseXP = Math.floor(amount / 10);
        const finalXP = Math.floor(baseXP * multiplier);

        Storage.save('player', player);
        addXP(finalXP, `${amount} reps Protox`);

        // Aggiorna record
        Records.update(finalXP, amount, 'body');

        showMessage(`+${amount} REPS | +${finalXP} XP (x${multiplier})`, 'positive');

        // Check milestones
        this.checkMilestones(player.reps);

        // Aggiorna UI
        this.updateDisplay();

        // Check achievements
        Achievements.checkAll();
    },

    // Milestones
    checkMilestones(totalReps) {
        const milestones = [1000, 5000, 10000, 25000, 50000, 75000, 100000];
        const reached = Storage.load('milestones_reached') || [];

        milestones.forEach(ms => {
            if (totalReps >= ms && !reached.includes(ms)) {
                reached.push(ms);
                Storage.save('milestones_reached', reached);

                setTimeout(() => {
                    showMessage(`🏆 MILESTONE: ${ms.toLocaleString()} REPS!`, 'positive');
                    addXP(ms / 100, `Milestone ${ms.toLocaleString()} reps`);
                }, 500);
            }
        });
    },

    // Media e proiezione
    getStats() {
        const player = loadPlayer();
        const records = Records.load();
        const avgReps = Records.getAvgRepsPerDay();
        const projection = Records.getProjection();

        return {
            total: player.reps,
            remaining: 100000 - player.reps,
            progress: (player.reps / 100000) * 100,
            avgPerDay: avgReps,
            projection: projection
        };
    },

    // Aggiorna display
    updateDisplay() {
        const player = loadPlayer();

        const repsTotal = document.getElementById('reps-total');
        if (repsTotal) {
            repsTotal.textContent = `${player.reps.toLocaleString()} / 100,000 REPS`;
        }

        const protoxFill = document.getElementById('protox-bar-fill');
        if (protoxFill) {
            protoxFill.style.width = `${(player.reps / 100000) * 100}%`;
        }

        // Stats aggiuntive
        const stats = this.getStats();
        const statsEl = document.getElementById('protox-stats');
        if (statsEl) {
            statsEl.innerHTML = `
                <div class="protox-stat">
                    <span class="ps-label">Media/Giorno</span>
                    <span class="ps-value">${stats.avgPerDay}</span>
                </div>
                <div class="protox-stat">
                    <span class="ps-label">Rimanenti</span>
                    <span class="ps-value">${stats.remaining.toLocaleString()}</span>
                </div>
                <div class="protox-stat">
                    <span class="ps-label">Proiezione</span>
                    <span class="ps-value">${stats.projection ? stats.projection.completionDate : '—'}</span>
                </div>
            `;
        }
    }
};

// Override globale addReps per usare ProtoxTracker
function addReps(amount) {
    ProtoxTracker.addQuickReps(amount);
}