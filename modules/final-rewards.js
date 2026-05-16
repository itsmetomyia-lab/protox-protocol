// ============================================
// PROTOX PROTOCOL - final-rewards.js
// Modulo: Claim finale 100K REPS / 100K XP
// Dipende da: storage.js, player-stats.js (runtime), sounds.js, particles.js
// ============================================

const FinalRewards = {
  STORAGE_KEY: 'final_rewards_state',
  REPS_TARGET: 100000,
  XP_TARGET: 100000,

  defaults() {
    return {
      reps100k: {
        claimed: false,
        claimedAt: null
      },
      xp100k: {
        claimed: false,
        claimedAt: null
      }
    };
  },

  load() {
    const raw = (typeof Storage !== 'undefined' ? Storage.load(this.STORAGE_KEY) : null) || {};
    return {
      reps100k: {
        claimed: !!raw?.reps100k?.claimed,
        claimedAt: raw?.reps100k?.claimedAt || null
      },
      xp100k: {
        claimed: !!raw?.xp100k?.claimed,
        claimedAt: raw?.xp100k?.claimedAt || null
      }
    };
  },

  save(data) {
    if (typeof Storage !== 'undefined') {
      Storage.save(this.STORAGE_KEY, data);
    }
  },

  getStatus(playerArg = null) {
    const player = playerArg || (typeof loadPlayer === 'function' ? loadPlayer() : null) || { xp: 0, reps: 0 };
    const state = this.load();

    const repsUnlocked = Number(player.reps || 0) >= this.REPS_TARGET;
    const xpUnlocked = Number(player.xp || 0) >= this.XP_TARGET;

    const repsClaimed = !!state.reps100k.claimed;
    const xpClaimed = !!state.xp100k.claimed;

    return {
      player,
      state,
      repsUnlocked,
      xpUnlocked,
      repsClaimed,
      xpClaimed,
      claimedCount: (repsClaimed ? 1 : 0) + (xpClaimed ? 1 : 0),
      readyCount: (repsUnlocked && !repsClaimed ? 1 : 0) + (xpUnlocked && !xpClaimed ? 1 : 0),
      allClaimed: repsClaimed && xpClaimed
    };
  },

  formatDate(ts) {
    if (!ts) return '—';
    try {
      return new Date(ts).toLocaleString('it-IT');
    } catch (e) {
      return '—';
    }
  },

  progressPct(current, target) {
    const safeTarget = Number(target || 0);
    if (!safeTarget) return 0;
    return Math.max(0, Math.min(100, (Number(current || 0) / safeTarget) * 100));
  },

  ensureOverlay() {
    let overlay = document.getElementById('final-rewards-overlay');
    if (overlay) return overlay;

    overlay = document.createElement('div');
    overlay.id = 'final-rewards-overlay';
    overlay.className = 'hidden';
    document.body.appendChild(overlay);
    return overlay;
  },

  renderEntry() {
    const mount = document.getElementById('final-rewards-entry');
    if (!mount) return;

    const status = this.getStatus();
    const shouldShow =
      status.repsUnlocked ||
      status.xpUnlocked ||
      status.repsClaimed ||
      status.xpClaimed;

    if (!shouldShow) {
      mount.innerHTML = '';
      return;
    }

    const mainLabel = status.readyCount > 0
      ? `CLAIM DISPONIBILI: ${status.readyCount}`
      : `${status.claimedCount}/2 CLAIMATI`;

    const sub = status.allClaimed
      ? 'SINGULARITY COMPLETATA'
      : 'Ricompense finali del protocollo';

    mount.innerHTML = `
      <div class="final-rewards-entry-card ${status.readyCount > 0 ? 'claim-ready' : ''}">
        <div class="final-rewards-entry-left">
          <div class="final-rewards-entry-row">
            <div class="final-rewards-entry-orb">${status.allClaimed ? '✦' : status.readyCount > 0 ? '⚡' : '◎'}</div>
            <div class="final-rewards-entry-copy">
              <div class="final-rewards-entry-eyebrow">FINAL REWARDS</div>
              <div class="final-rewards-entry-title">${mainLabel}</div>
            </div>
          </div>
          <div class="final-rewards-entry-sub">${sub}</div>
        </div>

        <div class="final-rewards-entry-side">
          <div class="final-rewards-entry-pill">${status.claimedCount}/2 COMPLETATI</div>
          <button class="manual-btn final-rewards-open-btn" onclick="FinalRewards.open()">
            ${status.readyCount > 0 ? 'CLAIMA' : 'APRI'}
          </button>
        </div>
      </div>
    `;
  },

  cardHTML(type, cfg, status) {
    const unlocked = type === 'reps100k' ? status.repsUnlocked : status.xpUnlocked;
    const claimed = type === 'reps100k' ? status.repsClaimed : status.xpClaimed;
    const ready = unlocked && !claimed;
    const claimedAt = this.load()[type]?.claimedAt || null;
    const progress = Math.round(this.progressPct(cfg.current, cfg.target));

    return `
      <div class="final-reward-card ${claimed ? 'claimed' : ready ? 'ready' : 'locked'}">
        <div class="final-reward-head">
          <div class="final-reward-head-main">
            <div class="final-reward-eyebrow">${cfg.eyebrow}</div>
            <div class="final-reward-title">${cfg.title}</div>
            <div class="final-reward-metric-pill">${cfg.metricLabel}</div>
          </div>

          <div class="final-reward-icon-shell">
            <div class="final-reward-icon">${cfg.icon}</div>
          </div>
        </div>

        <div class="final-reward-progress">
          <div class="final-reward-progress-top">
            <span class="final-reward-progress-value">${cfg.current.toLocaleString()} / ${cfg.target.toLocaleString()}</span>
            <span class="final-reward-progress-pct">${progress}%</span>
          </div>
          <div class="final-reward-bar">
            <i style="width:${progress}%"></i>
          </div>
        </div>

        <div class="final-reward-copy">
          <p>${cfg.copy}</p>
          <div class="final-reward-perks">
            ${cfg.perks.map(x => `<span class="final-reward-perk">${x}</span>`).join('')}
          </div>
        </div>

        <div class="final-reward-footer">
          <div class="final-reward-status ${claimed ? 'claimed' : ready ? 'ready' : 'locked'}">
            <span class="final-reward-status-icon">${claimed ? '✓' : ready ? '⚡' : '•'}</span>
            <span>${claimed ? `CLAIMATO · ${this.formatDate(claimedAt)}` : ready ? 'PRONTO DA CLAIMARE' : 'BLOCCATO'}</span>
          </div>
          <button
            class="manual-btn final-reward-claim-btn ${claimed ? 'claimed' : ready ? '' : 'disabled'}"
            ${claimed || !ready ? 'disabled' : ''}
            onclick="FinalRewards.claim('${type}')"
          >
            ${claimed ? 'CLAIMATO' : ready ? 'CLAIMA ORA' : 'NON DISPONIBILE'}
          </button>
        </div>
      </div>
    `;
  },

  open() {
    const overlay = this.ensureOverlay();
    const status = this.getStatus();
    const player = status.player;

    const repsCfg = {
      eyebrow: '100.000 REPS',
      title: 'PROTOX MASTER SIGIL',
      icon: '🧠',
      metricLabel: 'Reps Totali',
      current: Number(player.reps || 0),
      target: this.REPS_TARGET,
      copy: 'Hai completato il cuore del protocollo: 100.000 reps. Questo claim segna la chiusura del ciclo mentale principale.',
      perks: [
        'Badge finale permanente del protocollo',
        'Claim registrato localmente nel profilo',
        'Messaggio finale premium + particelle'
      ]
    };

    const xpCfg = {
      eyebrow: '100.000 XP',
      title: 'CENTURY CORE SIGIL',
      icon: '👑',
      metricLabel: 'XP Totali',
      current: Number(player.xp || 0),
      target: this.XP_TARGET,
      copy: 'Hai superato la soglia simbolica dei 100.000 XP. Questo claim certifica il volume totale di progresso accumulato.',
      perks: [
        'Badge finale XP permanente',
        'Claim separato dal sistema livelli',
        'Compatibile con level cap attuale (12)'
      ]
    };

    overlay.className = '';
    overlay.innerHTML = `
      <div class="final-rewards-modal">
        <div class="final-rewards-modal-head">
          <div class="final-rewards-modal-copy">
            <div class="final-rewards-modal-eyebrow">FINAL REWARDS</div>
            <h2>Claim finale del protocollo</h2>
            <p>Due sigilli finali coerenti con il tema attivo del tuo protocollo.</p>
          </div>
          <button class="manual-btn final-rewards-close-btn" onclick="FinalRewards.close()">✕</button>
        </div>

        <div class="final-rewards-summary">
          <div class="final-rewards-summary-item">
            <span class="final-rewards-summary-label">PRONTI</span>
            <strong>${status.readyCount}</strong>
          </div>
          <div class="final-rewards-summary-item">
            <span class="final-rewards-summary-label">CLAIMATI</span>
            <strong>${status.claimedCount}/2</strong>
          </div>
          <div class="final-rewards-summary-item">
            <span class="final-rewards-summary-label">STATO</span>
            <strong>${status.allClaimed ? 'SINGULARITY' : 'IN CORSO'}</strong>
          </div>
        </div>

        <div class="final-rewards-grid">
          ${this.cardHTML('reps100k', repsCfg, status)}
          ${this.cardHTML('xp100k', xpCfg, status)}
        </div>

        ${status.allClaimed ? `
          <div class="final-rewards-dual">
            <div class="final-rewards-dual-badge">SINGULARITY ASCENDED</div>
            <p>Hai claimato entrambi i sigilli finali di Protox Protocol.</p>
          </div>
        ` : ''}
      </div>
    `;

    document.body.style.overflow = 'hidden';
  },

  close() {
    const overlay = document.getElementById('final-rewards-overlay');
    if (!overlay) return;
    overlay.className = 'hidden';
    overlay.innerHTML = '';
    document.body.style.overflow = '';
  },

  claim(type) {
    const status = this.getStatus();
    const data = this.load();

    if (type === 'reps100k') {
      if (!status.repsUnlocked) {
        if (typeof showMessage === 'function') showMessage('Devi prima raggiungere 100.000 REPS', 'warning');
        return;
      }
      if (data.reps100k.claimed) {
        if (typeof showMessage === 'function') showMessage('Sigillo 100K REPS già claimato', 'warning');
        return;
      }
      data.reps100k.claimed = true;
      data.reps100k.claimedAt = Date.now();
      this.save(data);
      this.onClaimSuccess('100K REPS CLAIMATO');
    }

    if (type === 'xp100k') {
      if (!status.xpUnlocked) {
        if (typeof showMessage === 'function') showMessage('Devi prima raggiungere 100.000 XP', 'warning');
        return;
      }
      if (data.xp100k.claimed) {
        if (typeof showMessage === 'function') showMessage('Sigillo 100K XP già claimato', 'warning');
        return;
      }
      data.xp100k.claimed = true;
      data.xp100k.claimedAt = Date.now();
      this.save(data);
      this.onClaimSuccess('100K XP CLAIMATO');
    }

    this.renderEntry();
    this.open();
  },

  onClaimSuccess(text) {
    if (typeof showMessage === 'function') showMessage(`👑 ${text}`, 'positive');

    try {
      if (typeof SoundSystem !== 'undefined' && typeof SoundSystem.playAchievement === 'function') {
        SoundSystem.playAchievement();
      }
    } catch (e) {}

    try {
      if (typeof Particles !== 'undefined' && typeof Particles.badgeUnlockBurst === 'function') {
        Particles.badgeUnlockBurst();
      }
    } catch (e) {}
  }
};

window.addEventListener('load', () => {
  setTimeout(() => {
    try { FinalRewards.renderEntry(); } catch (e) {}
  }, 300);
});
