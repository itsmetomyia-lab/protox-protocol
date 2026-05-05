// ============================================
// PROTOX PROTOCOL - custom-actions.js
// Modulo: Azioni personalizzabili + ricerca
// Versione: 1.0 (SUPER PREMIUM patch)
// Dipende da: storage.js, player-stats.js
// ============================================

if (typeof window.ACTIONS_CONFIG === 'undefined') window.ACTIONS_CONFIG = {};

const CustomActions = {

  // Stato visibilità
  isCollapsed: false,
  isSearching: false,

  // Stato HUB overlay (se lo usi)
  _isHubOpen: false,

  // Draft create modal
  _newAction: null,

  // Emoji disponibili per scelta (no buchi/blank)
  emojis: [
    '⚡','⭐','💪','🧠','🧘','🚿','🌅','😴','📚','✍️','💧','🤸','🚶','🥗','🙏','🎯','🏃','🎧','🧊','🔥',
    '📱','🍔','🌙','⛓️','🛑','☀️','🧹','🧴','🧪','🎹','🎸','⚽','♟️','❤️','✈️'
  ],

  // Categorie
  categories: [
    { id: 'body', name: 'Body', icon: '💪' },
    { id: 'mind', name: 'Mind', icon: '🧠' },
    { id: 'will', name: 'Will', icon: '⚡' },
    { id: 'soul', name: 'Soul', icon: '✨' },
    { id: 'other', name: 'Altro', icon: '⭐' }
  ],

  // --------------------------------------------
  // STORAGE helpers (recent actions)
  // --------------------------------------------

  _loadRecent() {
    try {
      if (typeof Storage !== 'undefined') return Storage.load('recent_actions') || [];
      const raw = localStorage.getItem('protox_recent_actions');
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch (e) {
      return [];
    }
  },

  _saveRecent(arr) {
    try {
      if (typeof Storage !== 'undefined') Storage.save('recent_actions', arr);
      else localStorage.setItem('protox_recent_actions', JSON.stringify(arr));
    } catch (e) {}
  },

  _trackRecentAction(actionId) {
    if (!actionId) return;

    const list = this._loadRecent();
    const next = [actionId, ...list.filter(x => x !== actionId)].slice(0, 8);
    this._saveRecent(next);
  },

  // --------------------------------------------
  // CUSTOM actions persistence
  // --------------------------------------------

  // Carica azioni custom
  loadCustom() {
    return (typeof Storage !== 'undefined' ? (Storage.load('custom_actions') || []) : []) || [];
  },

  // Salva azioni custom
  saveCustom(actions) {
    if (typeof Storage !== 'undefined') Storage.save('custom_actions', actions);
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

  // --------------------------------------------
  // Ottieni TUTTE le azioni (default + custom)
  // --------------------------------------------

  getAllActions() {

    const defaults = [

      // Giornaliere
      { id: 'workout',      name: 'Workout',           icon: '💪', xp: 50,  type: 'positive', repeatable: false, category: 'body', isDefault: true },
      { id: 'cold_shower',  name: 'Cold Shower',       icon: '🚿', xp: 30,  type: 'positive', repeatable: false, category: 'will', isDefault: true },
      { id: 'meditation',   name: 'Meditazione',       icon: '🧘', xp: 25,  type: 'positive', repeatable: false, category: 'soul', isDefault: true },
      { id: 'sleep',        name: 'Dormito 7-8h',      icon: '😴', xp: 40,  type: 'positive', repeatable: false, category: 'body', isDefault: true },
      { id: 'wakeup',       name: 'Sveglia Presto',    icon: '🌅', xp: 20,  type: 'positive', repeatable: false, category: 'will', isDefault: true },

      // Ripetibili positive
      { id: 'reading',      name: 'Lettura 30min',     icon: '📚', xp: 25,  type: 'positive', repeatable: true,  category: 'mind', isDefault: true },
      { id: 'deep_work',    name: 'Deep Work 1h',      icon: '🧠', xp: 50,  type: 'positive', repeatable: true,  category: 'mind', isDefault: true },
      { id: 'journal',      name: 'Diario',            icon: '✍️', xp: 15,  type: 'positive', repeatable: true,  category: 'mind', isDefault: true },
      { id: 'water',        name: 'Bicchiere d\'Acqua',icon: '💧', xp: 15,  type: 'positive', repeatable: true,  category: 'body', isDefault: true },
      { id: 'stretch',      name: 'Stretching 15min',  icon: '🤸', xp: 20,  type: 'positive', repeatable: true,  category: 'body', isDefault: true },
      { id: 'walk',         name: 'Camminata 20min',   icon: '🚶', xp: 20,  type: 'positive', repeatable: true,  category: 'body', isDefault: true },
      { id: 'clean_meal',   name: 'Pasto Sano',        icon: '🥗', xp: 20,  type: 'positive', repeatable: true,  category: 'body', isDefault: true },
      { id: 'gratitude',    name: 'Gratitudine',       icon: '🙏', xp: 15,  type: 'positive', repeatable: true,  category: 'soul', isDefault: true },

      // Negative
      { id: 'junk_food',    name: 'Junk Food',         icon: '🍔', xp: -25, type: 'negative', repeatable: true,  category: null,   isDefault: true },
      { id: 'doom_scroll',  name: 'Doom Scrolling',    icon: '📱', xp: -40, type: 'negative', repeatable: true,  category: null,   isDefault: true },
      { id: 'addiction',    name: 'Ceduto a Dipendenza',icon:'⛓️', xp: -100,type: 'negative', repeatable: true,  category: null,   isDefault: true },
      { id: 'skip_workout', name: 'Skippato Workout',  icon: '🛑', xp: -30, type: 'negative', repeatable: true,  category: null,   isDefault: true },
      { id: 'late_sleep',   name: 'A Letto Tardissimo', icon:'🌙', xp: -35, type: 'negative', repeatable: true,  category: null,   isDefault: true }

    ];

    const custom = this.loadCustom();
    return [...defaults, ...custom];
  },

  // --------------------------------------------
  // Filtri
  // --------------------------------------------

  // Filtra per ricerca
  search(query) {
    const all = this.getAllActions();
    if (!query || query.trim() === '') return all;

    const q = query.toLowerCase().trim();

    return all.filter(a =>
      a.name.toLowerCase().includes(q) ||
      a.category?.toLowerCase().includes(q) ||
      (a.icon || '').includes(q)
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

  // --------------------------------------------
  // HOME render (RECENTLY USED quick deck)
  // --------------------------------------------

  renderHome() {

    const quick = document.getElementById('actions-quick');

    // Se non esiste la nuova HOME quick, fallback al vecchio render
    if (!quick) {
      this.renderActions(
        document.getElementById('action-search')?.value || '',
        document.querySelector('.filter-btn.active')?.dataset?.filter || 'all'
      );
      return;
    }

    const all = this.getAllActions();
    const recentIds = this._loadRecent();

    let pick = recentIds
      .map(id => all.find(a => a.id === id))
      .filter(Boolean);

    // fallback primo utilizzo
    if (pick.length === 0) {
      const fallback = ['workout','deep_work','reading','water','walk','stretch','meditation','journal'];
      pick = fallback.map(id => all.find(a => a.id === id)).filter(Boolean);
    }

    quick.innerHTML = pick.map(a => this.renderActionItem(a)).join('');

    if (typeof checkTodayActions !== 'undefined') checkTodayActions();
  },

  // --------------------------------------------
  // HUB overlay (opzionale)
  // - non rompe se non lo usi
  // --------------------------------------------

  openHub(initialFilter = 'all') {

    const existing = document.getElementById('actions-hub-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'actions-hub-overlay';

    overlay.innerHTML = `
      <div class="actions-hub-card" role="dialog" aria-modal="true">
        <div class="actions-hub-head">
          <div>
            <div class="actions-hub-title">ACTIONS HUB</div>
            <div class="actions-hub-sub">Cerca. Filtra. Fai XP.</div>
          </div>

          <button class="manual-btn actions-ghost" onclick="CustomActions.closeHub()">✕</button>
        </div>

        <div class="actions-hub-toolbar">
          <div class="actions-hub-search">
            <input
              type="text"
              id="action-search"
              class="actions-input"
              placeholder="Cerca azione..."
              oninput="CustomActions.onSearch(this.value)"
              autocomplete="off"
            />
            <button class="actions-clear hidden" id="search-clear" onclick="CustomActions.clearSearch()">✕</button>
          </div>

          <button class="manual-btn" onclick="CustomActions.showCreatePopup()">NEW</button>
        </div>

        <div id="action-filters" class="actions-hub-filters">
          <button class="filter-btn active" data-filter="all" onclick="CustomActions.setFilter('all')">Tutte</button>
          <button class="filter-btn" data-filter="positive" onclick="CustomActions.setFilter('positive')">✅ Positive</button>
          <button class="filter-btn" data-filter="negative" onclick="CustomActions.setFilter('negative')">❌ Negative</button>
          <button class="filter-btn" data-filter="body" onclick="CustomActions.setFilter('body')">💪 Body</button>
          <button class="filter-btn" data-filter="mind" onclick="CustomActions.setFilter('mind')">🧠 Mind</button>
          <button class="filter-btn" data-filter="will" onclick="CustomActions.setFilter('will')">⚡ Will</button>
          <button class="filter-btn" data-filter="soul" onclick="CustomActions.setFilter('soul')">✨ Soul</button>
          <button class="filter-btn" data-filter="custom" onclick="CustomActions.setFilter('custom')">⭐ Custom</button>
        </div>

        <div id="actions-hub-list" class="actions-hub-list"></div>
      </div>
    `;

    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';
    this._isHubOpen = true;

    this.isCollapsed = false;
    this.isSearching = false;

    this.renderActions('', initialFilter, 'actions-hub-list');
  },

  closeHub() {
    const overlay = document.getElementById('actions-hub-overlay');
    if (overlay) overlay.remove();
    document.body.style.overflow = '';
    this._isHubOpen = false;
  },

  // --------------------------------------------
  // CREATE modal (SMART + FAIR)
  // --------------------------------------------

  showCreatePopup() {

    const existing = document.getElementById('create-action-popup');
    if (existing) existing.remove();

    const popup = document.createElement('div');
    popup.id = 'create-action-popup';

     // sempre TOP LAYER (sopra hub, friends, tutto)
popup.dataset.prevOverflow = document.body.style.overflow || '';

popup.style.position = 'fixed';
popup.style.inset = '0';
popup.style.zIndex = '50000';
popup.style.display = 'flex';
popup.style.alignItems = 'center';
popup.style.justifyContent = 'center';
popup.style.padding = '18px';
popup.style.background = 'rgba(0,0,0,0.60)';
popup.style.backdropFilter = 'blur(10px)';

// click fuori = chiudi (premium)
popup.addEventListener('click', (e) => {
  if (e.target === popup) CustomActions.closeCreatePopup();
});

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
          <input
            type="text"
            id="create-name"
            class="create-input"
            placeholder="Es: Corsa 20min"
            maxlength="30"
            oninput="CustomActions.onCreateNameInput(this.value)"
          >
        </div>

        <div class="create-preview" id="create-preview">
          <span class="pv-ico" id="pv-ico">⭐</span>
          <span class="pv-name" id="pv-name">...</span>
          <span class="pv-xp" id="pv-xp">+25</span>
        </div>

        <div class="create-field">
          <label>XP</label>

          <div class="xp-row">
            <input
              type="number"
              id="create-xp"
              class="create-input"
              min="1"
              max="500"
              value="25"
              oninput="CustomActions.onXPManualInput(this.value)"
            >
            <button class="type-btn active" id="xp-fair" onclick="CustomActions.toggleFairXP()">✨</button>
          </div>
        </div>

        <div class="create-field">
          <label>Icona</label>

          <div class="emoji-grid" id="emoji-grid">
            ${this.emojis.map(e => `
              <button class="emoji-btn" onclick="CustomActions.selectEmoji('${e}', event)">${e}</button>
            `).join('')}
          </div>

          <div class="selected-emoji" id="selected-emoji">Selezionata: ⭐</div>
        </div>

        <div class="create-field">
          <label>Categoria</label>

          <div class="create-categories">
            ${this.categories.map(c => `
              <button class="cat-btn" id="cat-${c.id}" onclick="CustomActions.selectCategory('${c.id}', event)">
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

    // Defaults (FAIR live)
    this._newAction = {
      type: 'positive',
      icon: '⭐',
      category: 'other',
      repeatable: true,

      fairXP: true,
      _xpTouched: false,
      _iconTouched: false,
      _catTouched: false,
      _repTouched: false
    };

    // UI init state
    this._setCategoryUI('other');
    this._setRepeatableUI(true);

    const xpEl = document.getElementById('create-xp');
    if (xpEl) {
      xpEl.readOnly = true;
      xpEl.classList.add('xp-locked');
    }

    const fairBtn = document.getElementById('xp-fair');
    if (fairBtn) fairBtn.classList.add('active');

    this._updateCreatePreview();
  },

closeCreatePopup() {
  const popup = document.getElementById('create-action-popup');

  const prev = popup?.dataset?.prevOverflow ?? '';

  if (popup) popup.remove();

  // se avevi già un overlay aperto (es: HUB), ripristina lo stato giusto
  document.body.style.overflow = prev;
},

  setType(type) {

    if (!this._newAction) return;

    this._newAction.type = type;

    document.getElementById('type-positive')?.classList.toggle('active', type === 'positive');
    document.getElementById('type-negative')?.classList.toggle('active', type === 'negative');

    // quando cambi tipo, l'inference deve “ri-capire”
    const name = document.getElementById('create-name')?.value || '';
    this._applyInference(name);
    this._updateCreatePreview();
  },

  selectEmoji(emoji, evt) {

    if (!this._newAction) return;

    this._newAction.icon = emoji || '⭐';
    this._newAction._iconTouched = true;

    document.getElementById('selected-emoji').textContent = `Selezionata: ${this._newAction.icon}`;

    document.querySelectorAll('.emoji-btn').forEach(b => b.classList.remove('active'));

    const e = evt || window.event;
    if (e && e.target) e.target.classList.add('active');

    this._updateCreatePreview();
  },

  selectCategory(cat, evt) {

    if (!this._newAction) return;

    this._newAction.category = cat;
    this._newAction._catTouched = true;

    this._setCategoryUI(cat);
    this._updateCreatePreview();
  },

  setRepeatable(val) {

    if (!this._newAction) return;

    this._newAction.repeatable = val;
    this._newAction._repTouched = true;

    this._setRepeatableUI(val);
    this._updateCreatePreview();
  },

  _setCategoryUI(cat) {
    document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(`cat-${cat}`)?.classList.add('active');
  },

  _setRepeatableUI(val) {
    document.getElementById('rep-once')?.classList.toggle('active', !val);
    document.getElementById('rep-multi')?.classList.toggle('active', val);
  },

  toggleFairXP() {

    if (!this._newAction) return;

    this._newAction.fairXP = !this._newAction.fairXP;

    const btn = document.getElementById('xp-fair');
    btn?.classList.toggle('active', !!this._newAction.fairXP);

    const xpEl = document.getElementById('create-xp');
    if (xpEl) {
      xpEl.readOnly = !!this._newAction.fairXP;
      xpEl.classList.toggle('xp-locked', !!this._newAction.fairXP);
    }

    // quando riaccendi fair, ridai controllo all'inference
    if (this._newAction.fairXP) {
      this._newAction._xpTouched = false;
      const name = document.getElementById('create-name')?.value || '';
      this._applyInference(name);
    }

    this._updateCreatePreview();
  },

  onXPManualInput(v) {

    if (!this._newAction) return;

    // se l'utente tocca XP, diventa manual in automatico
    if (this._newAction.fairXP) {
      this._newAction.fairXP = false;
      document.getElementById('xp-fair')?.classList.remove('active');

      const xpEl = document.getElementById('create-xp');
      if (xpEl) {
        xpEl.readOnly = false;
        xpEl.classList.remove('xp-locked');
      }
    }

    this._newAction._xpTouched = true;
    this._updateCreatePreview();
  },

  onCreateNameInput(name) {
    this._applyInference(name);
    this._updateCreatePreview();
  },

  _applyInference(name) {

    if (!this._newAction) return;

    const n = String(name || '').trim();
    if (!n) return;

    const type = this._newAction.type || 'positive';
    const inf = this._inferFromName(n, type);

    // ICON (solo se non toccata dall'utente)
    if (!this._newAction._iconTouched && inf.icon) {
      this._newAction.icon = inf.icon;
      document.getElementById('selected-emoji').textContent = `Selezionata: ${inf.icon}`;
    }

    // CATEGORY (solo se non toccata)
    if (!this._newAction._catTouched) {
      if (type === 'negative') {
        this._newAction.category = 'other';
        this._setCategoryUI('other');
      } else if (inf.category) {
        this._newAction.category = inf.category;
        this._setCategoryUI(inf.category);
      }
    }

    // REPEATABLE (solo se non toccata)
    if (!this._newAction._repTouched && typeof inf.repeatable === 'boolean') {
      this._newAction.repeatable = inf.repeatable;
      this._setRepeatableUI(inf.repeatable);
    }

    // XP (solo se fair attivo e XP non toccato)
    if (this._newAction.fairXP && !this._newAction._xpTouched && typeof inf.xp === 'number') {
      const xpEl = document.getElementById('create-xp');
      if (xpEl) xpEl.value = inf.xp;
    }
  },

  _inferFromName(name, type) {

    const s = name.toLowerCase();

    const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
    const round5 = (x) => Math.round(x / 5) * 5;

    // duration parse (min / h)
    let minutes = null;

    const m1 = s.match(/(\d+)\s*(min|m)\b/);
    if (m1) minutes = parseInt(m1[1], 10);

    const h1 = s.match(/(\d+)\s*(h|hr|ora|ore)\b/);
    if (h1) minutes = (parseInt(h1[1], 10) * 60);

    // intensity
    let mult = 1.0;
    if (s.includes('easy') || s.includes('legger') || s.includes('light')) mult = 0.85;
    if (s.includes('hard') || s.includes('intens') || s.includes('pesante')) mult = 1.20;

    const kw = (k) => s.includes(k);

    let icon = null;
    let category = null;
    let repeatable = true;

    // POSITIVE anchors
    if (kw('workout') || kw('palestra') || kw('gym') || kw('allen')) { icon = '💪'; category = 'body'; repeatable = false; }
    else if (kw('corsa') || kw('run')) { icon = '🏃'; category = 'body'; }
    else if (kw('walk') || kw('cammin')) { icon = '🚶'; category = 'body'; }
    else if (kw('stretch') || kw('mobil')) { icon = '🤸'; category = 'body'; }
    else if (kw('medit') || kw('breath') || kw('respiro')) { icon = '🧘'; category = 'soul'; repeatable = false; }
    else if (kw('journal') || kw('diario') || kw('scriv')) { icon = '✍️'; category = 'mind'; }
    else if (kw('reading') || kw('lett')) { icon = '📚'; category = 'mind'; }
    else if (kw('deep') || kw('focus') || kw('studio') || kw('study')) { icon = '🧠'; category = 'mind'; }
    else if (kw('acqua') || kw('water')) { icon = '💧'; category = 'body'; }
    else if (kw('meal') || kw('pasto') || kw('healthy') || kw('sano')) { icon = '🥗'; category = 'body'; }
    else if (kw('doccia') || kw('shower')) { icon = '🚿'; category = 'will'; repeatable = false; }
    else if (kw('sleep') || kw('dormi') || kw('sonno')) { icon = '😴'; category = 'body'; repeatable = false; }

    // NEGATIVE anchors
    if (type === 'negative') {
      if (kw('doom') || kw('scroll') || kw('tiktok') || kw('instagram')) icon = icon || '📱';
      if (kw('junk') || kw('burger') || kw('pizza') || kw('dolc') || kw('snack')) icon = icon || '🍔';
      if (kw('late') || kw('tardi') || kw('notte')) icon = icon || '🌙';
      if (kw('addict') || kw('dipenden') || kw('porn') || kw('fumo')) icon = icon || '⛓️';
      category = null;
      repeatable = true;
    }

    // XP logic “fair” (coerente col tuo meta)
    let xp = null;

    // hard defaults by keyword
    if (kw('workout') || kw('palestra') || kw('gym')) xp = 50;
    else if (kw('deep') || kw('focus') || kw('deep work')) xp = 50;
    else if (kw('medit')) xp = 25;
    else if (kw('acqua') || kw('water')) xp = 15;
    else if (kw('stretch')) xp = 20;
    else if (kw('walk') || kw('cammin')) xp = 20;
    else if (kw('reading') || kw('lett')) xp = 25;
    else if (kw('journal') || kw('diario')) xp = 15;

    // duration fallback
    if (xp == null && minutes != null) {
      if (type === 'negative') xp = clamp(round5(minutes * 1.0 * mult), 15, 90);
      else xp = clamp(round5(minutes * 0.85 * mult), 15, 90);
    }

    // final fallback
    if (xp == null) xp = 25;

    return { icon, category, repeatable, xp };
  },

  _updateCreatePreview() {

    const ico = document.getElementById('pv-ico');
    const nm  = document.getElementById('pv-name');
    const xp  = document.getElementById('pv-xp');

    if (!ico || !nm || !xp) return;

    const name = document.getElementById('create-name')?.value || '';
    const icon = (this._newAction?.icon && String(this._newAction.icon).trim() !== '') ? this._newAction.icon : '⭐';

    const type = this._newAction?.type || 'positive';
    const valRaw = parseInt(document.getElementById('create-xp')?.value || '0', 10);
    const val = isNaN(valRaw) ? 0 : Math.abs(valRaw);

    ico.textContent = icon;
    nm.textContent = name ? name : '...';

    xp.textContent = (type === 'negative') ? `-${val}` : `+${val}`;
    xp.classList.toggle('neg', type === 'negative');
  },

  // --------------------------------------------
  // Submit creazione
  // --------------------------------------------

  submitCreate() {

    const name = document.getElementById('create-name')?.value?.trim() || '';
    const xpRaw = parseInt(document.getElementById('create-xp')?.value || '0', 10);
    const xp = Math.abs(xpRaw);

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
      icon: this._newAction?.icon || '⭐',
      xp: (this._newAction?.type === 'negative') ? -xp : xp,
      type: this._newAction?.type || 'positive',
      repeatable: !!this._newAction?.repeatable,
      category: this._newAction?.category || 'other',
      isDefault: false
    };

    this.addAction(action);
    this.closeCreatePopup();

    // aggiorna entrambe (vecchia lista + quick home se presente)
    this.renderActions();
    this.renderHome();

    showMessage(`Azione "${name}" creata!`, 'positive');
  },

  // --------------------------------------------
  // Conferma eliminazione
  // --------------------------------------------

  confirmDelete(actionId, actionName) {
    if (confirm(`Eliminare "${actionName}"?`)) {
      this.removeAction(actionId);
      this.renderActions();
      this.renderHome();
      showMessage(`"${actionName}" eliminata`, 'warning');
    }
  },

  // --------------------------------------------
  // Esegui azione (wrapper)
  // --------------------------------------------

  execute(actionId) {

    const all = this.getAllActions();
    const action = all.find(a => a.id === actionId);
    if (!action) return;

    // Patch/Registra in ACTIONS_CONFIG
    if (!ACTIONS_CONFIG[actionId]) {
      ACTIONS_CONFIG[actionId] = {
        repeatable: action.repeatable,
        category: action.category,
        icon: action.icon
      };
    } else {
      // se esiste ma è vuota, patchala
      if (!ACTIONS_CONFIG[actionId].icon && action.icon) ACTIONS_CONFIG[actionId].icon = action.icon;
      if (!ACTIONS_CONFIG[actionId].category && action.category) ACTIONS_CONFIG[actionId].category = action.category;
      if (typeof ACTIONS_CONFIG[actionId].repeatable === 'undefined') ACTIONS_CONFIG[actionId].repeatable = action.repeatable;
    }

    // doAction NON ritorna success/fail, quindi pre-check “già fatto oggi?”
    // (così non spammiamo recenti quando è bloccata)
    let shouldTrack = true;

    try {
      const config = ACTIONS_CONFIG[actionId];
      const isRepeatable = config ? config.repeatable : action.repeatable;

      if (!isRepeatable && typeof loadPlayer === 'function') {
        const player = loadPlayer();
        const today = new Date().toDateString();
        if (player?.actionsToday?.[today]?.[actionId]) shouldTrack = false;
      }
    } catch (e) {}

    // GO
    if (typeof doAction === 'function') doAction(actionId, action.xp, action.repeatable);

    // Track RECENT + refresh HOME quick
    if (shouldTrack) {
      this._trackRecentAction(actionId);
      this.renderHome();
    }
  },

  // --------------------------------------------
  // RENDER azioni (vecchia UI + HUB list)
  // - containerId opzionale per evitare clash ids
  // --------------------------------------------

  renderActions(filter = '', category = 'all', containerId = 'actions-list') {

    const container = document.getElementById(containerId);
    if (!container) return;

    // Se collassato e NON sta cercando, nascondi
    if (this.isCollapsed && !this.isSearching && containerId === 'actions-list') {
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
      daily.forEach(a => { html += this.renderActionItem(a); });
      html += `</div>`;
    }

    // Ripetibili
    if (repeatable.length > 0) {
      html += `<div class="actions-group">
        <span class="actions-group-label">RIPETIBILI</span>`;
      repeatable.forEach(a => { html += this.renderActionItem(a); });
      html += `</div>`;
    }

    // Negative
    if (negative.length > 0) {
      html += `<div class="actions-group">
        <span class="actions-group-label negative-label">PENALITÀ</span>`;
      negative.forEach(a => { html += this.renderActionItem(a); });
      html += `</div>`;
    }

    // Nessun risultato
    if (daily.length === 0 && repeatable.length === 0 && negative.length === 0) {
      html = `<div class="no-results">Nessuna azione trovata</div>`;
    }

    container.innerHTML = html;

    if (typeof checkTodayActions !== 'undefined') checkTodayActions();
  },

  // Render singola azione
  renderActionItem(action) {

    const isCustom = !action.isDefault;
    const safeName = String(action.name || '').replace(/'/g, "\\'");

    const deleteBtn = isCustom
      ? `<button class="action-delete" onclick="event.stopPropagation();CustomActions.confirmDelete('${action.id}','${safeName}')">✕</button>`
      : '';

    const repeatTag = action.repeatable && action.type === 'positive'
      ? '<span class="action-tag">∞</span>'
      : '';

    const icon = (action.icon && String(action.icon).trim() !== '') ? action.icon : '⭐';
    const xpDisplay = action.xp > 0 ? `+${action.xp}` : `${action.xp}`;

    return `
      <div class="action-item ${action.type} ${action.repeatable ? 'repeatable-action' : ''} ${isCustom ? 'custom-action' : ''}"
        onclick="CustomActions.execute('${action.id}')">
        <span class="action-icon">${icon}</span>
        <span class="action-name">${action.name}</span>
        ${repeatTag}
        <span class="action-xp">${xpDisplay}</span>
        ${deleteBtn}
      </div>
    `;
  },

  // --------------------------------------------
  // Toggle visibilità (vecchia UI)
  // --------------------------------------------

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

    // Se HUB aperto, renderizza lì
    if (this._isHubOpen) this.renderActions(value, activeFilter, 'actions-hub-list');
    else this.renderActions(value, activeFilter);
  },

  // Set filtro categoria
  setFilter(category) {

    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    const btn = document.querySelector(`.filter-btn[data-filter="${category}"]`);
    if (btn) btn.classList.add('active');

    const searchValue = document.getElementById('action-search')?.value || '';

    if (this._isHubOpen) this.renderActions(searchValue, category, 'actions-hub-list');
    else this.renderActions(searchValue, category);
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

    if (this._isHubOpen) this.renderActions('', activeFilter, 'actions-hub-list');
    else this.renderActions('', activeFilter);
  }

};