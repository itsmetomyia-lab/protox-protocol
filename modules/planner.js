// ============================================
// PROTOX PROTOCOL - planner.js
// Modulo: Planner 90 giorni con storico e programmazione
// Versione: 1.0
// Dipende da: storage.js, player-stats.js
// ============================================

const Planner = {

    // Ottieni giorno 1 del protocollo
    getStartDate() {
        const records = Storage.load('records');
        if (records && records.firstDay) {
            return new Date(records.firstDay);
        }
        // Se non esiste, oggi è giorno 1
        const today = new Date();
        return today;
    },

    // Ottieni numero giorno corrente (1-90)
    getCurrentDay() {
        const start = this.getStartDate();
        const now = new Date();
        const diff = Math.floor((now - start) / (1000 * 60 * 60 * 24));
        return Math.min(Math.max(diff + 1, 1), 90);
    },

    // Ottieni data per un giorno specifico (1-90)
    getDateForDay(dayNum) {
        const start = this.getStartDate();
        const date = new Date(start);
        date.setDate(date.getDate() + (dayNum - 1));
        return date;
    },

    // Carica dati di un giorno
    loadDayData(dayNum) {
        const allData = Storage.load('planner_data') || {};
        return allData[dayNum] || { planned: [], notes: '' };
    },

    // Salva dati di un giorno
    saveDayData(dayNum, data) {
        const allData = Storage.load('planner_data') || {};
        allData[dayNum] = data;
        Storage.save('planner_data', allData);
    },

    // Ottieni azioni fatte in un giorno specifico (dallo storico)
    getCompletedActions(dayNum) {
        const date = this.getDateForDay(dayNum);
        const dateStr = date.toDateString();
        const player = loadPlayer();

        if (!player.actionsToday || !player.actionsToday[dateStr]) {
            return [];
        }

        const actions = player.actionsToday[dateStr];
        const completed = [];

        Object.keys(actions).forEach(actionId => {
            const count = actions[actionId];
            const config = ACTIONS_CONFIG[actionId];
            completed.push({
                id: actionId,
                name: actionId.replace(/_/g, ' '),
                icon: config ? config.icon : '✅',
                count: count,
                category: config ? config.category : null
            });
        });

        return completed;
    },

    // Ottieni XP di un giorno
    getDayXP(dayNum) {
        const date = this.getDateForDay(dayNum);
        const dateStr = date.toDateString();
        const records = Storage.load('records');
        if (!records || !records.dailyXP) return 0;
        return records.dailyXP[dateStr] || 0;
    },

    // Ottieni reps di un giorno
    getDayReps(dayNum) {
        const date = this.getDateForDay(dayNum);
        const dateStr = date.toDateString();
        const records = Storage.load('records');
        if (!records || !records.dailyReps) return 0;
        return records.dailyReps[dateStr] || 0;
    },

    // Stato di un giorno
    getDayStatus(dayNum) {
        const currentDay = this.getCurrentDay();

        if (dayNum > currentDay) return 'future';
        if (dayNum === currentDay) return 'today';

        // Passato: controlla se attivo
        const xp = this.getDayXP(dayNum);
        if (xp > 0) return 'completed';
        return 'missed';
    },

    // Intensità colore per il cubo
    getDayIntensity(dayNum) {
        const xp = this.getDayXP(dayNum);
        if (xp === 0) return 0;
        if (xp <= 50) return 1;
        if (xp <= 150) return 2;
        if (xp <= 300) return 3;
        return 4;
    },

    // Aggiungi azione pianificata
    addPlannedAction(dayNum, action) {
        const data = this.loadDayData(dayNum);
        data.planned.push({
            id: 'plan_' + Date.now(),
            text: action,
            done: false,
            createdAt: Date.now()
        });
        this.saveDayData(dayNum, data);
    },

    // Toggle checkbox azione pianificata
    togglePlanned(dayNum, actionId) {
        const data = this.loadDayData(dayNum);
        const action = data.planned.find(a => a.id === actionId);
        if (action) {
            action.done = !action.done;
            this.saveDayData(dayNum, data);
        }
    },

    // Rimuovi azione pianificata
    removePlanned(dayNum, actionId) {
        const data = this.loadDayData(dayNum);
        data.planned = data.planned.filter(a => a.id !== actionId);
        this.saveDayData(dayNum, data);
    },

    // Salva note del giorno
    saveNotes(dayNum, notes) {
        const data = this.loadDayData(dayNum);
        data.notes = notes;
        this.saveDayData(dayNum, data);
    },

    // Formatta data
    formatDate(date) {
        const days = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];
        const months = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];
        return `${days[date.getDay()]} ${date.getDate()} ${months[date.getMonth()]}`;
    },


    // ---- RENDER GRIGLIA 90 GIORNI ----
    render() {
        const container = document.getElementById('planner-content');
        if (!container) return;

        const currentDay = this.getCurrentDay();

        container.innerHTML = `
            <!-- HEADER INFO -->
            <div class="planner-header-info">
                <div class="planner-today">
                    <span class="planner-today-label">OGGI</span>
                    <span class="planner-today-day">GIORNO ${currentDay}</span>
                    <span class="planner-today-date">${this.formatDate(new Date())}</span>
                </div>
                <div class="planner-progress">
                    <div class="planner-progress-bar">
                        <div class="planner-progress-fill" style="width: ${(currentDay / 90) * 100}%"></div>
                    </div>
                    <span class="planner-progress-text">${currentDay}/90 giorni</span>
                </div>
            </div>

            <!-- LEGENDA -->
            <div class="planner-legend">
                <div class="legend-item"><span class="legend-dot legend-completed"></span>Attivo</div>
                <div class="legend-item"><span class="legend-dot legend-today"></span>Oggi</div>
                <div class="legend-item"><span class="legend-dot legend-missed"></span>Mancato</div>
                <div class="legend-item"><span class="legend-dot legend-future"></span>Futuro</div>
            </div>

            <!-- GRIGLIA 90 GIORNI -->
            <div class="planner-grid" id="planner-grid">
                ${this.renderGrid()}
            </div>

            <!-- DETTAGLIO GIORNO (nascosto inizialmente) -->
            <div id="day-detail" class="day-detail hidden"></div>
        `;
    },

    // Render griglia cubetti
    renderGrid() {
        let html = '';
        const currentDay = this.getCurrentDay();

        // Dividi in settimane per visual clarity
        for (let week = 0; week < 13; week++) {
            html += '<div class="planner-week">';
           const isNarrow = window.innerWidth <= 420;

if (isNarrow) {
  // mobile: label corta (non rompe la griglia)
  html += `S${week + 1}`;
} else {
  // desktop: label estesa (bella)
  if (week === 0) html += `Sett ${week + 1}`;
  else html += `${week + 1}`;
}
            html += '<div class="week-days">';

            for (let d = 0; d < 7; d++) {
                const dayNum = week * 7 + d + 1;
                if (dayNum > 90) {
                    html += '<div class="planner-day empty"></div>';
                    continue;
                }

                const status = this.getDayStatus(dayNum);
                const intensity = this.getDayIntensity(dayNum);
                const xp = this.getDayXP(dayNum);
                const plannedData = this.loadDayData(dayNum);
                const hasPlanned = plannedData.planned && plannedData.planned.length > 0;

                html += `
                    <div class="planner-day ${status} intensity-${intensity} ${dayNum === currentDay ? 'current' : ''}"
                         onclick="Planner.openDay(${dayNum})"
                         title="Giorno ${dayNum} — ${xp} XP">
                        <span class="day-num">${dayNum}</span>
                        ${hasPlanned ? '<span class="day-dot"></span>' : ''}
                    </div>
                `;
            }

            html += '</div></div>';
        }

        return html;
    },

    // ---- APRI DETTAGLIO GIORNO ----
    openDay(dayNum) {
        const detail = document.getElementById('day-detail');
        if (!detail) return;

        const status = this.getDayStatus(dayNum);
        const date = this.getDateForDay(dayNum);
        const xp = this.getDayXP(dayNum);
        const reps = this.getDayReps(dayNum);
        const completed = this.getCompletedActions(dayNum);
        const dayData = this.loadDayData(dayNum);
        const currentDay = this.getCurrentDay();

        const isFuture = dayNum > currentDay;
        const isToday = dayNum === currentDay;
        const isPast = dayNum < currentDay;

        // Evidenzia giorno selezionato
        document.querySelectorAll('.planner-day').forEach(d => d.classList.remove('selected'));
        const dayEl = document.querySelector(`.planner-day:nth-child(${dayNum})`);

        detail.classList.remove('hidden');
        detail.scrollIntoView({ behavior: 'smooth', block: 'start' });

        let html = `
            <div class="day-detail-header">
                <div class="day-detail-title">
                    <h3>GIORNO ${dayNum}</h3>
                    <span class="day-detail-date">${this.formatDate(date)}</span>
                </div>
                <button class="day-detail-close" onclick="Planner.closeDay()">✕</button>
            </div>

            <div class="day-detail-status ${status}">
                ${isToday ? '⚡ OGGI' : ''}
                ${isPast && xp > 0 ? '✅ COMPLETATO' : ''}
                ${isPast && xp === 0 ? '❌ MANCATO' : ''}
                ${isFuture ? '📅 FUTURO' : ''}
            </div>
        `;

        // PASSATO o OGGI: mostra cosa hai fatto
        if (isPast || isToday) {
            html += `
                <div class="day-stats-row">
                    <div class="day-stat">
                        <span class="day-stat-value">${xp}</span>
                        <span class="day-stat-label">XP</span>
                    </div>
                    <div class="day-stat">
                        <span class="day-stat-value">${reps}</span>
                        <span class="day-stat-label">REPS</span>
                    </div>
                    <div class="day-stat">
                        <span class="day-stat-value">${completed.length}</span>
                        <span class="day-stat-label">AZIONI</span>
                    </div>
                </div>
            `;

            if (completed.length > 0) {
                html += '<div class="day-completed-list"><h4>Azioni completate</h4>';
                completed.forEach(action => {
                    html += `
                        <div class="day-completed-item">
                            <span class="day-completed-icon">${action.icon}</span>
                            <span class="day-completed-name">${action.name}</span>
                            ${action.count > 1 ? `<span class="day-completed-count">x${action.count}</span>` : ''}
                        </div>
                    `;
                });
                html += '</div>';
            } else if (isPast) {
                html += '<div class="day-empty-msg">Nessuna azione registrata questo giorno</div>';
            }
        }

        // PIANIFICAZIONE (futuro + oggi)
        if (isFuture || isToday) {
            const allActions = typeof CustomActions !== 'undefined'
                ? CustomActions.getAllActions().filter(a => a.type === 'positive')
                : [];

            html += `
                <div class="day-planner-section">
                    <h4>📋 Pianifica</h4>

                    <!-- SEARCH AZIONI -->
                    <div class="plan-search-container">
                        <input type="text"
                               id="plan-search-${dayNum}"
                               class="plan-search-input"
                               placeholder="🔍 Cerca azione da pianificare..."
                               oninput="Planner.filterPlanActions(${dayNum}, this.value)"
                               autocomplete="off">
                    </div>

                    <!-- LISTA AZIONI DA AGGIUNGERE -->
                    <div class="plan-actions-list" id="plan-actions-${dayNum}">
                        ${allActions.map(a => {
                            const alreadyPlanned = dayData.planned.some(p => p.text === a.name);
                            return `
                                <button class="plan-action-item ${alreadyPlanned ? 'already-planned' : ''}"
                                        onclick="${alreadyPlanned ? '' : `Planner.addActionToPlan(${dayNum}, '${a.name}', '${a.icon}')`}"
                                        data-name="${a.name.toLowerCase()}"
                                        ${alreadyPlanned ? 'disabled' : ''}>
                                    <span class="plan-action-icon">${a.icon}</span>
                                    <span class="plan-action-name">${a.name}</span>
                                    <span class="plan-action-xp">+${a.xp}</span>
                                    ${alreadyPlanned ? '<span class="plan-action-added">✓</span>' : '<span class="plan-action-add">+</span>'}
                                </button>
                            `;
                        }).join('')}
                    </div>

                    <!-- CUSTOM (input manuale) -->
                    <div class="plan-custom-add">
                        <input type="text"
                               id="plan-custom-${dayNum}"
                               class="planned-input"
                               placeholder="Oppure scrivi attività personalizzata..."
                               maxlength="50"
                               onkeydown="if(event.key==='Enter')Planner.addFromInput(${dayNum})">
                        <button class="planned-add-btn" onclick="Planner.addFromInput(${dayNum})">+</button>
                    </div>
                </div>
            `;
        }

        // AZIONI PIANIFICATE (mostra sempre se ce ne sono)
         if (dayData.planned && dayData.planned.length > 0) {
            html += '<div class="day-planned-list">';
            if (!isFuture && !isToday) {
                html += '<h4>📋 Pianificate</h4>';
            } else {
                html += '<h4>📋 Pianificate per questo giorno</h4>';
            }
            dayData.planned.forEach(action => {
                const icon = action.icon || '📌';
                html += `
                    <div class="planned-item ${action.done ? 'planned-done' : ''}">
                        <button class="planned-check" onclick="Planner.toggleAndRefresh(${dayNum}, '${action.id}')">
                            ${action.done ? '☑️' : '⬜'}
                        </button>
                        <span class="planned-icon">${icon}</span>
                        <span class="planned-text">${action.text}</span>
                        <button class="planned-remove" onclick="Planner.removeAndRefresh(${dayNum}, '${action.id}')">✕</button>
                    </div>
                `;
            });
            html += '</div>';
        }

        // NOTE (tutti i giorni)
        html += `
            <div class="day-notes-section">
                <h4>📝 Note</h4>
                <textarea class="day-notes"
                          placeholder="Scrivi note per questo giorno..."
                          maxlength="500"
                          oninput="Planner.saveNotes(${dayNum}, this.value)"
                >${dayData.notes || ''}</textarea>
            </div>
        `;

        detail.innerHTML = html;
    },

    // Aggiungi da input
    addFromInput(dayNum) {
        const input = document.getElementById(`plan-custom-${dayNum}`);
        if (!input) return;

        const text = input.value.trim();
        if (!text) return;

        this.addPlannedAction(dayNum, text);
        input.value = '';
        this.openDay(dayNum);
    },

    // Toggle e refresh
    toggleAndRefresh(dayNum, actionId) {
        this.togglePlanned(dayNum, actionId);
        this.openDay(dayNum);
    },

    // Rimuovi e refresh
    removeAndRefresh(dayNum, actionId) {
        this.removePlanned(dayNum, actionId);
        this.openDay(dayNum);
    },

    // Chiudi dettaglio
    closeDay() {
        const detail = document.getElementById('day-detail');
        if (detail) detail.classList.add('hidden');
    },


        // Aggiungi azione esistente al piano
    addActionToPlan(dayNum, actionName, actionIcon) {
        const data = this.loadDayData(dayNum);
        
        // Check se già pianificata
        if (data.planned.some(p => p.text === actionName)) {
            showMessage('Già pianificata!', 'warning');
            return;
        }

        data.planned.push({
            id: 'plan_' + Date.now(),
            text: actionName,
            icon: actionIcon,
            done: false,
            createdAt: Date.now()
        });
        this.saveDayData(dayNum, data);
        this.openDay(dayNum);
        showMessage(`${actionIcon} ${actionName} pianificata`, 'positive');
    },

    // Filtra azioni nel planner
    filterPlanActions(dayNum, query) {
        const container = document.getElementById(`plan-actions-${dayNum}`);
        if (!container) return;

        const items = container.querySelectorAll('.plan-action-item');
        const q = query.toLowerCase().trim();

        items.forEach(item => {
            const name = item.dataset.name;
            if (!q || name.includes(q)) {
                item.style.display = '';
            } else {
                item.style.display = 'none';
            }
        });
    },


    // Apri planner overlay
    open() {
        const overlay = document.getElementById('planner-overlay');
        if (!overlay) return;

        overlay.classList.remove('hidden');
        document.body.style.overflow = 'hidden';

        this.render();

        if (typeof SoundSystem !== 'undefined') {
            SoundSystem.playClick();
        }
    },

    // Chiudi planner overlay
    close() {
        const overlay = document.getElementById('planner-overlay');
        if (!overlay) return;

        overlay.classList.add('hidden');
        document.body.style.overflow = '';

        if (typeof SoundSystem !== 'undefined') {
            SoundSystem.playClick();
        }
    }
    
};



