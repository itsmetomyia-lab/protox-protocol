// ============================================
// PROTOX PROTOCOL - daily-review.js
// Modulo: Daily Debrief + Carry-over Planner
// Versione: 1.1
// Dipende da: storage.js, records.js, planner.js, player-stats.js (runtime)
// ============================================

const DailyReview = {
  STORAGE_KEY: 'daily_reviews',
  META_KEY: 'daily_review_meta',

  // ---------- storage helpers ----------
  loadAll() {
    return (typeof Storage !== 'undefined' ? Storage.load(this.STORAGE_KEY) : null) || {};
  },

  saveAll(data) {
    if (typeof Storage !== 'undefined') Storage.save(this.STORAGE_KEY, data);
  },

  loadMeta() {
    return (typeof Storage !== 'undefined' ? Storage.load(this.META_KEY) : null) || {};
  },

  saveMeta(data) {
    if (typeof Storage !== 'undefined') Storage.save(this.META_KEY, data);
  },

  getDateKey(dateLike = null) {
    const d = dateLike ? new Date(dateLike) : new Date();
    return d.toDateString();
  },

  getYesterdayKey(fromDateLike = null) {
    const d = fromDateLike ? new Date(fromDateLike) : new Date();
    d.setDate(d.getDate() - 1);
    return d.toDateString();
  },

  toMidnight(dateLike) {
    const d = new Date(dateLike);
    d.setHours(0, 0, 0, 0);
    return d;
  },

  clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  },

  normalizeText(text) {
    return String(text || '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ');
  },

  escapeHTML(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  },

  getReview(dateKey) {
    const all = this.loadAll();
    return all[dateKey] || null;
  },

  saveReview(review) {
    if (!review || !review.dateKey) return;
    const all = this.loadAll();
    all[review.dateKey] = review;
    this.saveAll(all);
  },

  getSortedKeys() {
    return Object.keys(this.loadAll()).sort((a, b) => new Date(a) - new Date(b));
  },

  getLatestReview() {
    const keys = this.getSortedKeys();
    if (!keys.length) return null;
    return this.getReview(keys[keys.length - 1]);
  },

  getPreviousReview(dateKey) {
    const targetTime = new Date(dateKey).getTime();
    const keys = this.getSortedKeys().filter(k => new Date(k).getTime() < targetTime);
    if (!keys.length) return null;
    return this.getReview(keys[keys.length - 1]);
  },

  markSeen(dateKey) {
    const meta = this.loadMeta();
    meta.lastSeen = dateKey;
    this.saveMeta(meta);
  },

  isUnread(review) {
    if (!review) return false;
    const meta = this.loadMeta();
    return meta.lastSeen !== review.dateKey;
  },

  // ---------- protocol / planner helpers ----------
  getProtocolDayByDateKey(dateKey) {
    const records = (typeof Records !== 'undefined' && typeof Records.load === 'function')
      ? Records.load()
      : ((typeof Storage !== 'undefined' ? Storage.load('records') : null) || {});

    if (!records || !records.firstDay) return null;

    const start = this.toMidnight(records.firstDay);
    const target = this.toMidnight(dateKey);
    const diff = Math.floor((target - start) / 86400000) + 1;

    if (!isFinite(diff)) return null;
    return this.clamp(diff, 1, 90);
  },

  loadPlannerAll() {
    return (typeof Storage !== 'undefined' ? Storage.load('planner_data') : null) || {};
  },

  savePlannerAll(data) {
    if (typeof Storage !== 'undefined') Storage.save('planner_data', data);
  },

  normalizePlannedItem(item) {
    return {
      id: item && item.id ? item.id : 'plan_' + Date.now(),
      text: item && item.text ? String(item.text) : 'Task',
      icon: item && item.icon ? item.icon : '📌',
      done: !!(item && item.done),
      createdAt: item && item.createdAt ? item.createdAt : Date.now(),
      carriedOver: !!(item && item.carriedOver),
      sourceDay: item && item.sourceDay ? item.sourceDay : null,
      sourceDate: item && item.sourceDate ? item.sourceDate : null,
      originalId: item && item.originalId ? item.originalId : null
    };
  },

  getPlannerSnapshot(dayNum) {
    if (!dayNum) return { planned: [], notes: '' };
    const all = this.loadPlannerAll();
    const data = all[dayNum] || { planned: [], notes: '' };
    return {
      planned: Array.isArray(data.planned) ? data.planned.map(x => this.normalizePlannedItem(x)) : [],
      notes: data.notes || ''
    };
  },

  // ---------- catalog helpers ----------
  buildActionCatalog() {
    const map = {};

    if (typeof CustomActions !== 'undefined' && typeof CustomActions.getAllActions === 'function') {
      try {
        CustomActions.getAllActions().forEach(action => {
          if (!action || !action.id) return;
          map[action.id] = {
            id: action.id,
            name: action.name || action.id.replace(/_/g, ' '),
            icon: action.icon || '⭐',
            xp: Number(action.xp || 0),
            category: action.category || null,
            type: action.type || (Number(action.xp || 0) < 0 ? 'negative' : 'positive'),
            repeatable: !!action.repeatable
          };
        });
      } catch (e) {}
    }

    if (typeof ACTIONS_CONFIG !== 'undefined') {
      Object.keys(ACTIONS_CONFIG).forEach(id => {
        if (map[id]) return;
        const cfg = ACTIONS_CONFIG[id] || {};
        map[id] = {
          id,
          name: id.replace(/_/g, ' '),
          icon: cfg.icon || '⭐',
          xp: 0,
          category: cfg.category || null,
          type: cfg.category === null ? 'negative' : 'positive',
          repeatable: !!cfg.repeatable
        };
      });
    }

    return map;
  },

  getDayActionEntries(dateKey, playerArg = null) {
    const player = playerArg || (typeof loadPlayer === 'function' ? loadPlayer() : null) || {};
    const dayActions = (player.actionsToday && player.actionsToday[dateKey]) || {};
    const catalog = this.buildActionCatalog();

    return Object.keys(dayActions).map(actionId => {
      const count = Number(dayActions[actionId] || 0);
      const cfg = catalog[actionId] || {
        id: actionId,
        name: actionId.replace(/_/g, ' '),
        icon: '⭐',
        xp: 0,
        category: null,
        type: 'positive'
      };

      const type = cfg.type || (Number(cfg.xp || 0) < 0 ? 'negative' : 'positive');

      return {
        id: actionId,
        name: cfg.name || actionId.replace(/_/g, ' '),
        icon: cfg.icon || '⭐',
        count,
        xp: Number(cfg.xp || 0),
        category: cfg.category || null,
        type,
        totalXP: Number(cfg.xp || 0) * count
      };
    });
  },

  getMissionSnapshot(dateKey) {
    const data = (typeof Storage !== 'undefined' ? Storage.load('missions') : null) || null;
    if (!data || data.date !== dateKey || !Array.isArray(data.missions)) {
      return {
        total: 0,
        completed: 0,
        pending: 0,
        categories: {}
      };
    }

    const categories = {};
    data.missions.forEach(m => {
      const cat = m.category || 'other';
      if (!categories[cat]) categories[cat] = { total: 0, completed: 0 };
      categories[cat].total += 1;
      if (m.completed) categories[cat].completed += 1;
    });

    const completed = data.missions.filter(m => m.completed).length;
    return {
      total: data.missions.length,
      completed,
      pending: data.missions.length - completed,
      categories
    };
  },

  getDailyRecords(dateKey) {
    const records = (typeof Records !== 'undefined' && typeof Records.load === 'function')
      ? Records.load()
      : ((typeof Storage !== 'undefined' ? Storage.load('records') : null) || {});

    return {
      xp: Number(records?.dailyXP?.[dateKey] || 0),
      reps: Number(records?.dailyReps?.[dateKey] || 0)
    };
  },

  buildBreakdown(actionEntries, missionSnapshot) {
    const categories = {
      mind: { label: 'MIND', icon: '🧠', score: 0, actions: 0, missions: 0 },
      body: { label: 'BODY', icon: '💪', score: 0, actions: 0, missions: 0 },
      will: { label: 'WILL', icon: '⚡', score: 0, actions: 0, missions: 0 },
      soul: { label: 'SOUL', icon: '✨', score: 0, actions: 0, missions: 0 }
    };

    actionEntries.forEach(entry => {
      if (!entry || entry.type === 'negative' || !entry.category || !categories[entry.category]) return;
      categories[entry.category].actions += entry.count;
      categories[entry.category].score += Math.max(8, Math.min(28, Math.abs(entry.totalXP || 0) / 5));
    });

    Object.keys((missionSnapshot && missionSnapshot.categories) || {}).forEach(cat => {
      if (!categories[cat]) return;
      const data = missionSnapshot.categories[cat] || { completed: 0 };
      categories[cat].missions += Number(data.completed || 0);
      categories[cat].score += Number(data.completed || 0) * 14;
    });

    Object.keys(categories).forEach(cat => {
      categories[cat].score = Math.round(this.clamp(categories[cat].score, 0, 100));
    });

    return categories;
  },

  computeScore(data) {
    const xpScore = Math.min(30, Math.floor((data.xp || 0) / 8));
    const repsScore = Math.min(15, Math.floor((data.reps || 0) / 20));

    const plannedRatio = data.plannedCount > 0
      ? data.plannedDoneCount / data.plannedCount
      : (data.positiveActionsCount > 0 ? 0.7 : 0);
    const plannedScore = Math.round(plannedRatio * 20);

    const missionRatio = data.missionCount > 0
      ? data.missionCompletedCount / data.missionCount
      : 0;
    const missionScore = Math.round(missionRatio * 20);

    const positiveScore = Math.min(15, data.positiveActionsCount * 3);
    const negativePenalty = Math.min(35, data.negativeActionsCount * 10);

    return this.clamp(xpScore + repsScore + plannedScore + missionScore + positiveScore - negativePenalty, 0, 100);
  },

  getScoreLabel(score) {
    if (score >= 85) return 'ELITE DAY';
    if (score >= 70) return 'FORTE';
    if (score >= 55) return 'SOLIDO';
    if (score >= 40) return 'RECUPERABILE';
    return 'RESET NEEDED';
  },

  buildWins(payload) {
    const wins = [];

    if (payload.xp >= 100) wins.push(`Hai spinto forte: ${payload.xp} XP in giornata.`);
    if (payload.reps >= 100) wins.push(`Hai fatto volume mentale: ${payload.reps} reps.`);
    if (payload.missionCompletedCount >= 3) wins.push(`Missioni solide: ${payload.missionCompletedCount}/${payload.missionCount} completate.`);
    if (payload.plannedDoneCount >= 2) wins.push(`Hai chiuso ${payload.plannedDoneCount} task pianificate.`);
    if (payload.negativeActionsCount === 0 && (payload.positiveActionsCount > 0 || payload.reps > 0)) {
      wins.push('Zero penalità: traiettoria pulita.');
    }

    if (!wins.length && (payload.positiveActionsCount > 0 || payload.reps > 0)) {
      wins.push('Hai mosso la giornata: non è stata vuota.');
    }

    return wins.slice(0, 3);
  },

  buildMisses(payload) {
    const misses = [];

    if (payload.negativeActionsCount > 0) misses.push(`Penalità registrate: ${payload.negativeActionsCount}.`);
    if (payload.plannedMissedCount > 0) misses.push(`Task lasciate aperte: ${payload.plannedMissedCount}.`);
    if (payload.missionCount > 0 && payload.missionCompletedCount === 0) misses.push('Missioni ignorate completamente.');
    if (payload.reps === 0) misses.push('Zero reps: la parte core del protocollo è rimasta ferma.');
    if (payload.xp < 40) misses.push('XP troppo basse: giornata poco intenzionale.');

    return misses.slice(0, 3);
  },

  buildSuggestions(payload, breakdown) {
    const suggestions = [];

    if (payload.plannedMissedCount > 0) {
      suggestions.push(`Apri la giornata con le ${payload.plannedMissedCount} task carry-over prima di aggiungere altro.`);
    }

    if (payload.negativeActionsCount > 0) {
      suggestions.push('Taglia subito il trigger che ti ha fatto perdere XP: una frizione in più, oggi.');
    }

    if (payload.reps === 0) {
      suggestions.push('Fissa un primo blocco da 10-50 reps entro la mattina.');
    }

    if (payload.missionCount > 0 && payload.missionCompletedCount < 2) {
      suggestions.push('Chiudi almeno 2 missioni presto: alza momentum e riduci attrito mentale.');
    }

    const weakest = Object.keys(breakdown || {})
      .map(key => ({ key, score: breakdown[key].score, label: breakdown[key].label }))
      .sort((a, b) => a.score - b.score)[0];

    if (weakest && weakest.score < 20) {
      suggestions.push(`Area scoperta: ${weakest.label}. Inserisci un’azione chiara lì.`);
    }

    if (!suggestions.length) {
      suggestions.push('Replica il setup di ieri e alza solo di poco il volume. Costanza > hype.');
    }

    return suggestions.slice(0, 4);
  },

  buildSummary(payload) {
    if (payload.score >= 80) {
      return 'Giornata ad alta coerenza. Non perfetta per caso: strutturata.';
    }
    if (payload.score >= 60) {
      return 'Buona base. Hai costruito, ma c’è ancora margine nelle chiusure.';
    }
    if (payload.score >= 40) {
      return 'Giornata salvabile. Il problema non è il potenziale: è la dispersione.';
    }
    return 'Giornata sotto ritmo. Domani deve partire più stretta, più semplice, più presto.';
  },

  collectDayReview(dateKey) {
    const player = (typeof loadPlayer === 'function' ? loadPlayer() : null) || {};
    const records = this.getDailyRecords(dateKey);
    const actions = this.getDayActionEntries(dateKey, player);
    const positiveActions = actions.filter(a => a.type !== 'negative');
    const negativeActions = actions.filter(a => a.type === 'negative');
    const missionSnapshot = this.getMissionSnapshot(dateKey);
    const dayNum = this.getProtocolDayByDateKey(dateKey);
    const planner = this.getPlannerSnapshot(dayNum);
    const breakdown = this.buildBreakdown(positiveActions, missionSnapshot);

    const payload = {
      dateKey,
      dayNum,
      xp: records.xp,
      reps: records.reps,
      positiveActionsCount: positiveActions.reduce((sum, item) => sum + Number(item.count || 0), 0),
      negativeActionsCount: negativeActions.reduce((sum, item) => sum + Number(item.count || 0), 0),
      plannedCount: planner.planned.length,
      plannedDoneCount: planner.planned.filter(p => p.done).length,
      plannedMissedCount: planner.planned.filter(p => !p.done).length,
      missionCount: missionSnapshot.total,
      missionCompletedCount: missionSnapshot.completed,
      missionPendingCount: missionSnapshot.pending
    };

    const score = this.computeScore(payload);
    const previous = this.getPreviousReview(dateKey);
    const momentum = previous ? score - Number(previous.score || 0) : 0;

    return {
      dateKey,
      createdAt: Date.now(),
      dayNum,
      score,
      scoreLabel: this.getScoreLabel(score),
      momentum,
      xp: payload.xp,
      reps: payload.reps,
      positiveActionsCount: payload.positiveActionsCount,
      negativeActionsCount: payload.negativeActionsCount,
      plannedCount: payload.plannedCount,
      plannedDoneCount: payload.plannedDoneCount,
      plannedMissedCount: payload.plannedMissedCount,
      missionCount: payload.missionCount,
      missionCompletedCount: payload.missionCompletedCount,
      missionPendingCount: payload.missionPendingCount,
      breakdown,
      summary: this.buildSummary({ ...payload, score }),
      wins: this.buildWins({ ...payload, score }),
      misses: this.buildMisses({ ...payload, score }),
      suggestions: this.buildSuggestions({ ...payload, score }, breakdown),
      actions: actions,
      plannedPreview: planner.planned.slice(0, 8).map(item => ({
        text: item.text,
        done: item.done,
        icon: item.icon || '📌',
        carriedOver: !!item.carriedOver,
        sourceDay: item.sourceDay || null
      })),
      carryOverCount: 0
    };
  },

  ensureReview(dateKey) {
    const existing = this.getReview(dateKey);
    if (existing) return existing;
    const review = this.collectDayReview(dateKey);
    this.saveReview(review);
    return review;
  },

  carryOverPlannedToToday(todayKey = null) {
    const today = todayKey || this.getDateKey();
    const yesterday = this.getYesterdayKey(today);
    const todayDay = this.getProtocolDayByDateKey(today);
    const yesterdayDay = this.getProtocolDayByDateKey(yesterday);

    if (!todayDay || !yesterdayDay || todayDay === yesterdayDay) {
      return { count: 0, items: [], fromDay: yesterdayDay, toDay: todayDay };
    }

    const plannerAll = this.loadPlannerAll();
    const fromData = plannerAll[yesterdayDay] || { planned: [], notes: '' };
    const toData = plannerAll[todayDay] || { planned: [], notes: '' };

    const incoming = Array.isArray(fromData.planned) ? fromData.planned.map(x => this.normalizePlannedItem(x)) : [];
    const existing = Array.isArray(toData.planned) ? toData.planned.map(x => this.normalizePlannedItem(x)) : [];
    const existingTexts = new Set(existing.map(item => this.normalizeText(item.text)));

    const carried = [];

    incoming.forEach((item, index) => {
      if (!item || item.done) return;
      const normalized = this.normalizeText(item.text);
      if (!normalized || existingTexts.has(normalized)) return;

      existingTexts.add(normalized);
      carried.push({
        id: 'carry_' + Date.now() + '_' + index,
        text: item.text,
        icon: item.icon || '↪️',
        done: false,
        createdAt: Date.now(),
        carriedOver: true,
        sourceDay: yesterdayDay,
        sourceDate: yesterday,
        originalId: item.id || null
      });
    });

    if (carried.length > 0) {
      toData.planned = carried.concat(existing);
      plannerAll[todayDay] = toData;
      this.savePlannerAll(plannerAll);
    }

    return {
      count: carried.length,
      items: carried,
      fromDay: yesterdayDay,
      toDay: todayDay
    };
  },

  onNewDay(todayKey = null) {
    const today = todayKey || this.getDateKey();
    const yesterday = this.getYesterdayKey(today);

    let review = this.getReview(yesterday);
    if (!review) {
      review = this.collectDayReview(yesterday);
      this.saveReview(review);
    }

    const carry = this.carryOverPlannedToToday(today);

    if (carry.count > 0) {
      review.carryOverCount = Math.max(Number(review.carryOverCount || 0), carry.count);
      this.saveReview(review);
    }

    const meta = this.loadMeta();
    meta.lastGenerated = yesterday;
    meta.lastCarryOverDate = today;
    meta.lastCarryOverCount = carry.count;
    this.saveMeta(meta);

    return {
      review,
      carryOver: carry
    };
  },

  // ---------- UI helpers ----------
  getMetricPill(label, value, tone = '') {
    return `
      <div class="daily-review-pill ${tone}">
        <span class="daily-review-pill-label">${this.escapeHTML(label)}</span>
        <span class="daily-review-pill-value">${this.escapeHTML(value)}</span>
      </div>
    `;
  },

  getListHTML(items, emptyText) {
    if (!items || !items.length) {
      return `<p class="daily-review-empty-copy">${this.escapeHTML(emptyText)}</p>`;
    }

    return `
      <ul class="daily-review-list">
        ${items.map(text => `<li>${this.escapeHTML(text)}</li>`).join('')}
      </ul>
    `;
  },

  getBreakdownHTML(review) {
    return Object.keys(review.breakdown || {}).map(key => {
      const item = review.breakdown[key];
      return `
        <div class="daily-review-breakdown-item">
          <div class="daily-review-breakdown-top">
            <span class="daily-review-breakdown-label">${this.escapeHTML(item.icon)} ${this.escapeHTML(item.label)}</span>
            <span class="daily-review-breakdown-score">${this.escapeHTML(item.score)}/100</span>
          </div>
          <div class="daily-review-breakdown-bar">
            <i style="width:${this.clamp(item.score, 0, 100)}%"></i>
          </div>
        </div>
      `;
    }).join('');
  },

  renderHomeCard() {
    const mount = document.getElementById('daily-review-entry');
    if (!mount) return;

    const latest = this.getLatestReview();
    if (!latest) {
      mount.innerHTML = '';
      return;
    }

    const unread = this.isUnread(latest);
    const carryText = latest.carryOverCount > 0
      ? `↪ ${latest.carryOverCount} carry-over in planner`
      : 'Nessun carry-over';

    const momentumText = latest.momentum > 0
      ? `↑ +${latest.momentum}`
      : latest.momentum < 0
        ? `↓ ${latest.momentum}`
        : '→ 0';

    mount.innerHTML = `
      <div class="daily-review-entry-card">
        <div class="daily-review-entry-glow"></div>

        <div class="daily-review-entry-top">
          <div class="daily-review-entry-copy">
            <div class="daily-review-entry-title-row">
              <h3 class="daily-review-title">DAILY DEBRIEF</h3>
              ${unread ? '<span class="daily-review-badge is-new">NEW</span>' : ''}
            </div>

            <div class="daily-review-entry-meta">
              <span>${this.escapeHTML(latest.dateKey)}</span>
              <span>•</span>
              <span>Giorno ${this.escapeHTML(latest.dayNum || '—')}</span>
            </div>

            <p class="daily-review-entry-summary">${this.escapeHTML(latest.summary)}</p>
          </div>

          <div class="daily-review-score-box">
            <div class="daily-review-score">${this.escapeHTML(latest.score)}</div>
            <div class="daily-review-score-label">${this.escapeHTML(latest.scoreLabel)}</div>
          </div>
        </div>

        <div class="daily-review-pill-row compact">
          ${this.getMetricPill('XP', latest.xp)}
          ${this.getMetricPill('REPS', latest.reps)}
          ${this.getMetricPill('MOMENTUM', momentumText, latest.momentum > 0 ? 'up' : latest.momentum < 0 ? 'down' : '')}
        </div>

        <div class="daily-review-entry-bottom">
          <span class="daily-review-entry-carry">${this.escapeHTML(carryText)}</span>

          <div class="daily-review-actions">
            <button class="manual-btn" onclick="DailyReview.openLatest()">APRI</button>
            <button class="manual-btn actions-ghost" onclick="DailyReview.openPlannerToday()">PLANNER</button>
          </div>
        </div>
      </div>
    `;
  },

  openLatest() {
    const latest = this.getLatestReview();
    if (!latest) {
      if (typeof showMessage === 'function') showMessage('Nessun debrief disponibile', 'warning');
      return;
    }
    this.open(latest.dateKey);
  },

  openPlannerToday() {
    this.close();
    if (typeof Planner !== 'undefined' && typeof Planner.open === 'function') {
      Planner.open();
      setTimeout(() => {
        if (typeof Planner.getCurrentDay === 'function' && typeof Planner.openDay === 'function') {
          Planner.openDay(Planner.getCurrentDay());
        }
      }, 80);
    }
  },

  open(dateKey) {
    const review = this.getReview(dateKey);
    if (!review) {
      if (typeof showMessage === 'function') showMessage('Debrief non trovato', 'warning');
      return;
    }

    this.markSeen(review.dateKey);
    this.renderHomeCard();

    let overlay = document.getElementById('daily-review-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'daily-review-overlay';
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) this.close();
      });
      document.body.appendChild(overlay);
    }

    const carryNote = review.carryOverCount > 0
      ? `↪ ${review.carryOverCount} task non chiuse sono state portate su oggi nel planner.`
      : 'Nessun carry-over generato nel planner.';

    overlay.innerHTML = `
      <div class="daily-review-modal">
        <div class="daily-review-modal-head">
          <div class="daily-review-modal-copy">
            <div class="daily-review-modal-kicker">DAILY DEBRIEF</div>
            <h2>${this.escapeHTML(review.dateKey)}</h2>
            <div class="daily-review-modal-meta">
              <span>Giorno ${this.escapeHTML(review.dayNum || '—')}</span>
              <span>•</span>
              <span>${this.escapeHTML(review.scoreLabel)}</span>
            </div>
            <p class="daily-review-modal-summary">${this.escapeHTML(review.summary)}</p>
          </div>

          <div class="daily-review-modal-side">
            <div class="daily-review-modal-score-wrap">
              <div class="daily-review-score large">${this.escapeHTML(review.score)}</div>
              <div class="daily-review-score-label">Momentum ${review.momentum > 0 ? '+' : ''}${this.escapeHTML(review.momentum)}</div>
            </div>
            <button class="manual-btn daily-review-close-btn" onclick="DailyReview.close()">✕</button>
          </div>
        </div>

        <div class="daily-review-modal-grid">
          <div class="section-card daily-review-panel">
            <h3>NUMERI</h3>
            <div class="daily-review-pill-row">
              ${this.getMetricPill('XP', review.xp)}
              ${this.getMetricPill('REPS', review.reps)}
              ${this.getMetricPill('AZIONI +', review.positiveActionsCount)}
              ${this.getMetricPill('AZIONI -', review.negativeActionsCount, review.negativeActionsCount > 0 ? 'down' : '')}
              ${this.getMetricPill('MISSIONI', review.missionCompletedCount + '/' + review.missionCount)}
              ${this.getMetricPill('PLANNER', review.plannedDoneCount + '/' + review.plannedCount)}
            </div>
          </div>

          <div class="section-card daily-review-panel">
            <h3>BREAKDOWN</h3>
            <div class="daily-review-breakdown-list">
              ${this.getBreakdownHTML(review)}
            </div>
          </div>

          <div class="section-card daily-review-panel">
            <h3>COSA HA FUNZIONATO</h3>
            ${this.getListHTML(review.wins, 'Niente di forte da segnalare.')}
          </div>

          <div class="section-card daily-review-panel">
            <h3>COSA HA PERSO TRAZIONE</h3>
            ${this.getListHTML(review.misses, 'Nessun buco grave.')}
          </div>

          <div class="section-card daily-review-panel full-width">
            <h3>COACH NOTES PER OGGI</h3>
            ${this.getListHTML(review.suggestions, 'Nessun suggerimento disponibile.')}

            <div class="daily-review-carry-box">
              ${this.escapeHTML(carryNote)}
            </div>
          </div>
        </div>

        <div class="daily-review-modal-actions">
          <button class="manual-btn actions-ghost" onclick="DailyReview.openPlannerToday()">APRI PLANNER</button>
          <button class="manual-btn" onclick="DailyReview.close()">CHIUDI</button>
        </div>
      </div>
    `;

    document.body.style.overflow = 'hidden';
  },

  close() {
    const overlay = document.getElementById('daily-review-overlay');
    if (overlay) overlay.remove();
    document.body.style.overflow = '';
  }
};
