// ============================================
// PROTOX PROTOCOL - custom-actions.js
// Modulo: Azioni personalizzabili + ricerca
// Versione: 1.0
// Dipende da: storage.js, player-stats.js
// ============================================

const CustomActions = {
   
    // Stato visibilità
    isCollapsed: false,
    isSearching: false,

    // Emoji disponibili per scelta
    emojis: [
        '💪', '🧠', '📚', '🏃', '🧘', '🎯', '🔥', '⚡',
        '💧', '🥗', '🚿', '😴', '🌅', '📝', '🤸', '🚶',
        '🙏', '🎵', '🎨', '💻', '📱', '🧹', '🛏️', '👥',
        '🌿', '☀️', '🧊', '💊', '🦷', '👔', '🧪', '🏋️',
        '🚴', '🏊', '🧗', '🥊', '⚽', '🎸', '🎮', '📸',
        '✍️', '🗣️', '🧩', '♟️', '🎯', '🏆', '💰', '🔧',
        '🌍', '❤️', '🐕', '🍳', '🧘‍♂️', '🤝', '📞', '✈️'
    ],

    // Categorie
    categories: [
        { id: 'body', name: 'Body', icon: '💪' },
        { id: 'mind', name: 'Mind', icon: '🧠' },
        { id: 'will', name: 'Will', icon: '🔥' },
        { id: 'soul', name: 'Soul', icon: '🕉️' },
        { id: 'other', name: 'Altro', icon: '⭐' }
    ],

    // Carica azioni custom
    loadCustom() {
        return Storage.load('custom_actions') || [];
    },

    // Salva azioni custom
    saveCustom(actions) {
        Storage.save('custom_actions', actions);
    },

    // Aggiungi azione
    addAction(action) {
        const actions = this.loadCustom();
        action.id = 'custom_' + Date.now();
        actions.push(action);
        this.saveCustom(actions);
        return action;
    },

    // Rimuovi azione
    removeAction(actionId) {
        let actions = this.loadCustom();
        actions = actions.filter(a => a.id !== actionId);
        this.saveCustom(actions);
    },

    // Ottieni TUTTE le azioni (default + custom)
    getAllActions() {
        const defaults = [
            // Giornaliere
            { id: 'workout', name: 'Workout', icon: '💪', xp: 50, type: 'positive', repeatable: false, category: 'body', isDefault: true },
            { id: 'cold_shower', name: 'Cold Shower', icon: '🚿', xp: 30, type: 'positive', repeatable: false, category: 'will', isDefault: true },
            { id: 'meditation', name: 'Meditazione', icon: '🧘', xp: 25, type: 'positive', repeatable: false, category: 'soul', isDefault: true },
            { id: 'sleep', name: 'Dormito 7-8h', icon: '😴', xp: 40, type: 'positive', repeatable: false, category: 'body', isDefault: true },
            { id: 'wakeup', name: 'Sveglia Presto', icon: '🌅', xp: 20, type: 'positive', repeatable: false, category: 'will', isDefault: true },

            // Ripetibili positive
            { id: 'reading', name: 'Lettura 30min', icon: '📚', xp: 25, type: 'positive', repeatable: true, category: 'mind', isDefault: true },
            { id: 'deep_work', name: 'Deep Work 1h', icon: '🎯', xp: 50, type: 'positive', repeatable: true, category: 'mind', isDefault: true },
            { id: 'journal', name: 'Diario', icon: '📝', xp: 15, type: 'positive', repeatable: true, category: 'mind', isDefault: true },
            { id: 'water', name: 'Bicchiere d\'Acqua', icon: '💧', xp: 15, type: 'positive', repeatable: true, category: 'body', isDefault: true },
            { id: 'stretch', name: 'Stretching 15min', icon: '🤸', xp: 20, type: 'positive', repeatable: true, category: 'body', isDefault: true },
            { id: 'walk', name: 'Camminata 20min', icon: '🚶', xp: 20, type: 'positive', repeatable: true, category: 'body', isDefault: true },
            { id: 'clean_meal', name: 'Pasto Sano', icon: '🥗', xp: 20, type: 'positive', repeatable: true, category: 'body', isDefault: true },
            { id: 'gratitude', name: 'Gratitudine', icon: '🙏', xp: 15, type: 'positive', repeatable: true, category: 'soul', isDefault: true },

            // Negative
            { id: 'junk_food', name: 'Junk Food', icon: '🍕', xp: -25, type: 'negative', repeatable: true, category: null, isDefault: true },
            { id: 'doom_scroll', name: 'Doom Scrolling', icon: '📱', xp: -40, type: 'negative', repeatable: true, category: null, isDefault: true },
            { id: 'addiction', name: 'Ceduto a Dipendenza', icon: '💀', xp: -100, type: 'negative', repeatable: true, category: null, isDefault: true },
            { id: 'skip_workout', name: 'Skippato Workout', icon: '🛋️', xp: -30, type: 'negative', repeatable: true, category: null, isDefault: true },
            { id: 'late_sleep', name: 'A Letto Tardissimo', icon: '🌃', xp: -35, type: 'negative', repeatable: true, category: null, isDefault: true }
        ];

        const custom = this.loadCustom();
        return [...defaults, ...custom];
    },

    // Filtra per ricerca
    search(query) {
        const all = this.getAllActions();
        if (!query || query.trim() === '') return all;

        const q = query.toLowerCase().trim();
        return all.filter(a =>
            a.name.toLowerCase().includes(q) ||
            a.category?.toLowerCase().includes(q) ||
            a.icon.includes(q)
        );
    },

    // Filtra per categoria
    filterByCategory(category) {
        const all = this.getAllActions();
        if (!category || category === 'all') return all;
        if (category === 'positive') return all.filter(a => a.type === 'positive');
        if (category === 'negative') return all.filter(a => a.type === 'negative');
        if (category === 'custom') return all.filter(a => !a.isDefault);
        return all.filter(a => a.category === category);
    },

    // Mostra popup crea azione
    showCreatePopup() {
        const popup = document.createElement('div');
        popup.id = 'create-action-popup';
        popup.innerHTML = `
            <div class="create-action-container">
                <div class="create-action-header">
                    <h2>NUOVA AZIONE</h2>
                    <button class="create-close" onclick="CustomActions.closeCreatePopup()">✕</button>
                </div>

                <div class="create-field">
                    <label>Tipo</label>
                    <div class="create-type-toggle">
                        <button class="type-btn active" id="type-positive" onclick="CustomActions.setType('positive')">✅ Positiva</button>
                        <button class="type-btn" id="type-negative" onclick="CustomActions.setType('negative')">❌ Negativa</button>
                    </div>
                </div>

                <div class="create-field">
                    <label>Nome</label>
                    <input type="text" id="create-name" class="create-input" placeholder="Es: Corsa 5km" maxlength="30">
                </div>

                <div class="create-field">
                    <label>XP</label>
                    <input type="number" id="create-xp" class="create-input" placeholder="Es: 50" min="1" max="500" value="25">
                </div>

                <div class="create-field">
                    <label>Icona</label>
                    <div class="emoji-grid" id="emoji-grid">
                        ${this.emojis.map(e => `
                            <button class="emoji-btn" onclick="CustomActions.selectEmoji('${e}')">${e}</button>
                        `).join('')}
                    </div>
                    <div class="selected-emoji" id="selected-emoji">Selezionata: ⭐</div>
                </div>

                <div class="create-field">
                    <label>Categoria</label>
                    <div class="create-categories">
                        ${this.categories.map(c => `
                            <button class="cat-btn" id="cat-${c.id}" onclick="CustomActions.selectCategory('${c.id}')">
                                ${c.icon} ${c.name}
                            </button>
                        `).join('')}
                    </div>
                </div>

                <div class="create-field">
                    <label>Ripetibile?</label>
                    <div class="create-type-toggle">
                        <button class="type-btn" id="rep-once" onclick="CustomActions.setRepeatable(false)">1x al giorno</button>
                        <button class="type-btn active" id="rep-multi" onclick="CustomActions.setRepeatable(true)">∞ Ripetibile</button>
                    </div>
                </div>

                <button class="create-submit" onclick="CustomActions.submitCreate()">
                    CREA AZIONE ⚡
                </button>
            </div>
        `;
        document.body.appendChild(popup);

        // Blocca scroll
        document.body.style.overflow = 'hidden';

        // Defaults
        this._newAction = {
            type: 'positive',
            icon: '⭐',
            category: 'other',
            repeatable: true
        };
    },

    // Set type
    setType(type) {
        this._newAction.type = type;
        document.getElementById('type-positive').classList.toggle('active', type === 'positive');
        document.getElementById('type-negative').classList.toggle('active', type === 'negative');
    },

    // Select emoji
    selectEmoji(emoji) {
        this._newAction.icon = emoji;
        document.getElementById('selected-emoji').textContent = `Selezionata: ${emoji}`;
        document.querySelectorAll('.emoji-btn').forEach(b => b.classList.remove('active'));
        event.target.classList.add('active');
    },

    // Select category
    selectCategory(cat) {
        this._newAction.category = cat;
        document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
        document.getElementById(`cat-${cat}`).classList.add('active');
    },

    // Set repeatable
    setRepeatable(val) {
        this._newAction.repeatable = val;
        document.getElementById('rep-once').classList.toggle('active', !val);
        document.getElementById('rep-multi').classList.toggle('active', val);
    },

    // Submit creazione
    submitCreate() {
        const name = document.getElementById('create-name').value.trim();
        const xp = parseInt(document.getElementById('create-xp').value);

        if (!name) {
            showMessage('Inserisci un nome!', 'warning');
            return;
        }

        if (isNaN(xp) || xp < 1 || xp > 500) {
            showMessage('XP deve essere tra 1 e 500!', 'warning');
            return;
        }

        const action = {
            name: name,
            icon: this._newAction.icon,
            xp: this._newAction.type === 'negative' ? -xp : xp,
            type: this._newAction.type,
            repeatable: this._newAction.repeatable,
            category: this._newAction.category,
            isDefault: false
        };

        this.addAction(action);
        this.closeCreatePopup();
        this.renderActions();
        showMessage(`Azione "${name}" creata!`, 'positive');
    },

    // Chiudi popup
    closeCreatePopup() {
        const popup = document.getElementById('create-action-popup');
        if (popup) popup.remove();
        document.body.style.overflow = '';
    },

    // Conferma eliminazione
    confirmDelete(actionId, actionName) {
        if (confirm(`Eliminare "${actionName}"?`)) {
            this.removeAction(actionId);
            this.renderActions();
            showMessage(`"${actionName}" eliminata`, 'warning');
        }
    },

    // Esegui azione (wrapper)
    execute(actionId) {
        const all = this.getAllActions();
        const action = all.find(a => a.id === actionId);
        if (!action) return;

        // Registra in ACTIONS_CONFIG se non esiste
        if (!ACTIONS_CONFIG[actionId]) {
            ACTIONS_CONFIG[actionId] = {
                repeatable: action.repeatable,
                category: action.category,
                icon: action.icon
            };
        }

        doAction(actionId, action.xp, action.repeatable);
    },

    // RENDER COMPLETO delle azioni nella Home
    renderActions(filter = '', category = 'all') {
        const container = document.getElementById('actions-list');
        if (!container) return;

        // Se collassato e NON sta cercando, nascondi
        if (this.isCollapsed && !this.isSearching) {
            container.innerHTML = `
                <div class="actions-collapsed">
                    <span class="collapsed-text">Azioni nascoste</span>
                    <span class="collapsed-count">${this.getAllActions().length} azioni</span>
                </div>
            `;
            return;
        }

        let actions = category !== 'all'
            ? this.filterByCategory(category)
            : this.getAllActions();

        // Applica ricerca
        if (filter && filter.trim() !== '') {
            const q = filter.toLowerCase().trim();
            actions = actions.filter(a =>
                a.name.toLowerCase().includes(q) ||
                a.category?.toLowerCase().includes(q)
            );
        }

        // Separa in gruppi
        const daily = actions.filter(a => a.type === 'positive' && !a.repeatable);
        const repeatable = actions.filter(a => a.type === 'positive' && a.repeatable);
        const negative = actions.filter(a => a.type === 'negative');

        let html = '';

        // Giornaliere
        if (daily.length > 0) {
            html += `<div class="actions-group">
                <span class="actions-group-label">GIORNALIERE</span>`;
            daily.forEach(a => {
                html += this.renderActionItem(a);
            });
            html += '</div>';
        }

        // Ripetibili
        if (repeatable.length > 0) {
            html += `<div class="actions-group">
                <span class="actions-group-label">RIPETIBILI</span>`;
            repeatable.forEach(a => {
                html += this.renderActionItem(a);
            });
            html += '</div>';
        }

        // Negative
        if (negative.length > 0) {
            html += `<div class="actions-group">
                <span class="actions-group-label negative-label">PENALITÀ</span>`;
            negative.forEach(a => {
                html += this.renderActionItem(a);
            });
            html += '</div>';
        }

        // Nessun risultato
        if (daily.length === 0 && repeatable.length === 0 && negative.length === 0) {
            html = '<div class="no-results">Nessuna azione trovata</div>';
        }

        container.innerHTML = html;
        checkTodayActions();
    },
        // Render singola azione
    renderActionItem(action) {
        const isCustom = !action.isDefault;
        const deleteBtn = isCustom
            ? `<button class="action-delete" onclick="event.stopPropagation();CustomActions.confirmDelete('${action.id}','${action.name}')">✕</button>`
            : '';

        const repeatTag = action.repeatable && action.type === 'positive'
            ? '<span class="action-tag">∞</span>'
            : '';

        const xpDisplay = action.xp > 0 ? `+${action.xp}` : `${action.xp}`;

        return `
            <div class="action-item ${action.type} ${action.repeatable ? 'repeatable-action' : ''} ${isCustom ? 'custom-action' : ''}"
                 onclick="CustomActions.execute('${action.id}')">
                <span class="action-icon">${action.icon}</span>
                <span class="action-name">${action.name}</span>
                ${repeatTag}
                <span class="action-xp">${xpDisplay}</span>
                ${deleteBtn}
            </div>
        `;
    },

    // Toggle visibilità
    toggleVisibility() {
        this.isCollapsed = !this.isCollapsed;

        const icon = document.getElementById('toggle-icon');
        const btn = document.getElementById('toggle-actions-btn');
        const filters = document.getElementById('action-filters');

        if (this.isCollapsed) {
            if (icon) icon.textContent = '▶';
            if (btn) btn.classList.add('collapsed');
            if (filters) filters.style.display = 'none';
        } else {
            if (icon) icon.textContent = '▼';
            if (btn) btn.classList.remove('collapsed');
            if (filters) filters.style.display = '';
        }

        const searchValue = document.getElementById('action-search')?.value || '';
        const activeFilter = document.querySelector('.filter-btn.active')?.dataset?.filter || 'all';
        this.renderActions(searchValue, activeFilter);
    },

    // Gestione ricerca
    onSearch(value) {
        const clearBtn = document.getElementById('search-clear');

        if (value && value.trim() !== '') {
            this.isSearching = true;
            if (clearBtn) clearBtn.classList.remove('hidden');

            // Se collassato, mostra temporaneamente i filtri
            const filters = document.getElementById('action-filters');
            if (filters && this.isCollapsed) filters.style.display = '';
        } else {
            this.isSearching = false;
            if (clearBtn) clearBtn.classList.add('hidden');

            // Se collassato, nascondi di nuovo filtri
            const filters = document.getElementById('action-filters');
            if (filters && this.isCollapsed) filters.style.display = 'none';
        }

        const activeFilter = document.querySelector('.filter-btn.active')?.dataset?.filter || 'all';
        this.renderActions(value, activeFilter);
    },

    // Set filtro categoria
    setFilter(category) {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        const btn = document.querySelector(`.filter-btn[data-filter="${category}"]`);
        if (btn) btn.classList.add('active');

        const searchValue = document.getElementById('action-search')?.value || '';
        this.renderActions(searchValue, category);
    },

    // Clear search
    clearSearch() {
        const input = document.getElementById('action-search');
        if (input) input.value = '';
        this.isSearching = false;

        const clearBtn = document.getElementById('search-clear');
        if (clearBtn) clearBtn.classList.add('hidden');

        // Se collassato, nascondi filtri
        const filters = document.getElementById('action-filters');
        if (filters && this.isCollapsed) filters.style.display = 'none';

        const activeFilter = document.querySelector('.filter-btn.active')?.dataset?.filter || 'all';
        this.renderActions('', activeFilter);
    }
};