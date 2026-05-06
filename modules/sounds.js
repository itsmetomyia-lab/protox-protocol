// ============================================
// PROTOX PROTOCOL - sounds.js
// Modulo: Suoni + vibrazione (PREMIUM KEYCAP / POP)
// Dipende da: storage.js
// ============================================

const SoundSystem = {

  audioCtx: null,

  _master: null,
  _comp: null,
  _noiseBuf: null,

  _uiBound: false,

  // cooldown per evitare doppi suoni (es: global click + chiamata manuale)
  _lastPressAt: 0,

  // Init audio context
  init() {

    try {
      this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      console.log('Audio non supportato');
      this.audioCtx = null;
      return;
    }

    // master chain
    this._master = this.audioCtx.createGain();
    this._master.gain.value = 0.75;

    this._comp = this.audioCtx.createDynamicsCompressor();
    this._comp.threshold.value = -24;
    this._comp.knee.value = 24;
    this._comp.ratio.value = 8;
    this._comp.attack.value = 0.003;
    this._comp.release.value = 0.15;

    this._master.connect(this._comp);
    this._comp.connect(this.audioCtx.destination);

    // noise buffer (1s white noise)
    this._noiseBuf = this._makeNoiseBuffer(1.0);

    // iOS / mobile: sblocca audio al primo gesto
    const unlock = () => {
      this._ensureRunning();
      window.removeEventListener('pointerdown', unlock, true);
      window.removeEventListener('touchstart', unlock, true);
      window.removeEventListener('keydown', unlock, true);
    };
    window.addEventListener('pointerdown', unlock, true);
    window.addEventListener('touchstart', unlock, true);
    window.addEventListener('keydown', unlock, true);

    // auto “keycap click” su quasi tutti i click UI
    this.bindUI();

  },

  // Controlla se abilitato
  isEnabled() {
    const setting = Storage.load('sounds_enabled');
    return setting !== false; // Default: attivo
  },

  // Toggle on/off
  toggle() {

    const current = this.isEnabled();
    Storage.save('sounds_enabled', !current);

    const statusEl = document.getElementById('sound-status');
    if (statusEl) statusEl.textContent = !current ? 'ON' : 'OFF';

    showMessage(`Suoni ${!current ? 'attivati' : 'disattivati'}`, 'positive');

  },

  // --- PREMIUM CORE -------------------------------------------------

  _ensureRunning() {
    if (!this.audioCtx) return false;
    if (!this.isEnabled()) return false;

    // su mobile spesso è "suspended"
    if (this.audioCtx.state === 'suspended') {
      try { this.audioCtx.resume(); } catch (e) {}
    }
    return true;
  },

  _now() {
    return this.audioCtx ? this.audioCtx.currentTime : 0;
  },

  _rand(a, b) {
    return a + Math.random() * (b - a);
  },

  _makeNoiseBuffer(seconds) {

    if (!this.audioCtx) return null;

    const sr = this.audioCtx.sampleRate;
    const len = Math.max(1, Math.floor(seconds * sr));

    const buf = this.audioCtx.createBuffer(1, len, sr);
    const data = buf.getChannelData(0);

    for (let i = 0; i < len; i++) {
      data[i] = (Math.random() * 2 - 1);
    }

    return buf;
  },

  _gainEnv(gainParam, t, a, d, peak) {

    gainParam.cancelScheduledValues(t);

    const p = Math.max(0.0001, peak);

    gainParam.setValueAtTime(0.0001, t);
    gainParam.exponentialRampToValueAtTime(p, t + Math.max(0.0005, a));
    gainParam.exponentialRampToValueAtTime(0.0001, t + Math.max(0.001, a + d));

  },

  _keycap({ vol = 0.18, baseHz = 165, damp = 0.72 } = {}) {

    if (!this._ensureRunning()) return;
    if (!this._master) return;

    const t = this._now();

    // variazione micro (evita “copypaste sound”)
    const base = baseHz * this._rand(0.95, 1.05);
    const clickHz = 2600 * this._rand(0.90, 1.15);

    // BODY “thock” (triangle) + pitch drop
    const bodyOsc = this.audioCtx.createOscillator();
    bodyOsc.type = 'triangle';

    bodyOsc.frequency.setValueAtTime(base * 1.25, t);
    bodyOsc.frequency.exponentialRampToValueAtTime(base, t + 0.018);
    bodyOsc.frequency.exponentialRampToValueAtTime(base * 0.92, t + 0.055);

    const bodyLP = this.audioCtx.createBiquadFilter();
    bodyLP.type = 'lowpass';
    bodyLP.frequency.setValueAtTime(950 * damp, t);
    bodyLP.Q.setValueAtTime(0.7, t);

    const bodyGain = this.audioCtx.createGain();
    this._gainEnv(bodyGain.gain, t, 0.0015, 0.085, vol * 0.85);

    bodyOsc.connect(bodyLP);
    bodyLP.connect(bodyGain);
    bodyGain.connect(this._master);

    bodyOsc.start(t);
    bodyOsc.stop(t + 0.14);

    // TOP “click” (square super corto)
    const clickOsc = this.audioCtx.createOscillator();
    clickOsc.type = 'square';
    clickOsc.frequency.setValueAtTime(clickHz, t);

    const clickBP = this.audioCtx.createBiquadFilter();
    clickBP.type = 'bandpass';
    clickBP.frequency.setValueAtTime(3200, t);
    clickBP.Q.setValueAtTime(0.9, t);

    const clickGain = this.audioCtx.createGain();
    this._gainEnv(clickGain.gain, t, 0.0008, 0.020, vol * 0.35);

    clickOsc.connect(clickBP);
    clickBP.connect(clickGain);
    clickGain.connect(this._master);

    clickOsc.start(t);
    clickOsc.stop(t + 0.04);

    // FOAM/PLASTIC “air” (noise filtrato)
    if (this._noiseBuf) {

      const noise = this.audioCtx.createBufferSource();
      noise.buffer = this._noiseBuf;

      const hp = this.audioCtx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.setValueAtTime(900, t);

      const lp = this.audioCtx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(5200 * damp, t);

      const ng = this.audioCtx.createGain();
      this._gainEnv(ng.gain, t, 0.0006, 0.030, vol * 0.18);

      noise.connect(hp);
      hp.connect(lp);
      lp.connect(ng);
      ng.connect(this._master);

      noise.start(t);
      noise.stop(t + 0.05);

    }

  },

  _pop({ vol = 0.16, freq = 420, dur = 0.12 } = {}) {

    if (!this._ensureRunning()) return;
    if (!this._master) return;

    const t = this._now();
    const f = freq * this._rand(0.97, 1.03);

    const osc = this.audioCtx.createOscillator();
    osc.type = 'sine';

    osc.frequency.setValueAtTime(f * 0.86, t);
    osc.frequency.exponentialRampToValueAtTime(f, t + 0.028);

    const g = this.audioCtx.createGain();
    this._gainEnv(g.gain, t, 0.0012, dur, vol);

    const lp = this.audioCtx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(5200, t);
    lp.Q.setValueAtTime(0.7, t);

    osc.connect(lp);
    lp.connect(g);
    g.connect(this._master);

    osc.start(t);
    osc.stop(t + dur + 0.06);

    // micro sparkle
    if (this._noiseBuf) {

      const noise = this.audioCtx.createBufferSource();
      noise.buffer = this._noiseBuf;

      const bp = this.audioCtx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(3200, t);
      bp.Q.setValueAtTime(0.9, t);

      const ng = this.audioCtx.createGain();
      this._gainEnv(ng.gain, t, 0.0006, 0.040, vol * 0.10);

      noise.connect(bp);
      bp.connect(ng);
      ng.connect(this._master);

      noise.start(t);
      noise.stop(t + 0.06);

    }

  },

  // --- PUBLIC API (compat col tuo progetto) -------------------------

  // Lasciata per compat: ora è solo un beep “soft” (se ti serve debug)
  playTone(frequency, duration, type = 'sine', volume = 0.2) {

    if (!this._ensureRunning()) return;

    const t = this._now();

    const osc = this.audioCtx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, t);

    const g = this.audioCtx.createGain();
    this._gainEnv(g.gain, t, 0.001, duration, Math.min(0.35, volume));

    osc.connect(g);
    g.connect(this._master);

    osc.start(t);
    osc.stop(t + duration + 0.05);

  },

  // XP guadagnato (glossy)
  playXPGain() {
    this._pop({ freq: 460, vol: 0.18, dur: 0.10 });
    setTimeout(() => this._pop({ freq: 620, vol: 0.16, dur: 0.11 }), 55);
  },

  // XP perso (thud soft, non beep)
  playXPLoss() {
    this._keycap({ vol: 0.16, baseHz: 120, damp: 0.85 });
    setTimeout(() => this._keycap({ vol: 0.12, baseHz: 95, damp: 0.90 }), 70);
  },

  // Level up (glossy staircase, non “videogame beep”)
  playLevelUp() {
    const seq = [520, 620, 740, 880];
    seq.forEach((f, i) => {
      setTimeout(() => this._pop({ freq: f, vol: 0.17, dur: 0.10 }), i * 70);
    });
  },

  // Reps
  playReps() {
    this._keycap({ vol: 0.12, baseHz: 170, damp: 0.78 });
  },

  // Achievement (sparkly, corto)
  playAchievement() {
    const seq = [660, 880, 990];
    seq.forEach((f, i) => {
      setTimeout(() => this._pop({ freq: f, vol: 0.14, dur: 0.095 }), i * 55);
    });
  },

  // Click (keycap creamy)
  playClick() {

    const ms = performance.now();

    // anti-double (global bind + chiamata manuale nello stesso tap)
    if (ms - this._lastPressAt < 35) return;
    this._lastPressAt = ms;

    this._keycap({ vol: 0.16, baseHz: 165, damp: 0.75 });

  },

  // UI open/close (opzionali: per overlay)
  playUIOpen() {
    this._pop({ freq: 420, vol: 0.18, dur: 0.12 });
  },

  playUIClose() {
    this._pop({ freq: 320, vol: 0.14, dur: 0.10 });
  },

  // Vibra
  vibrate(pattern) {
    if (!this.isEnabled()) return;
    if (navigator.vibrate) navigator.vibrate(pattern || [50]);
  },

  // Auto-bind click (così senti “keycap” ovunque)
  bindUI() {

    if (this._uiBound) return;
    this._uiBound = true;

    document.addEventListener('click', (e) => {

      if (!this.isEnabled()) return;

      const el = e.target && e.target.closest
        ? e.target.closest(
            'button, .manual-btn, .icon-btn, .tab-btn, .action-item, .emoji-btn, .filter-btn, .cat-btn, .type-btn, .theme-btn'
          )
        : null;

      if (!el) return;

      // no sounds when interacting with inputs
      if (e.target && e.target.closest && e.target.closest('input, textarea, select')) return;

      // opt-out
      if (el.dataset && el.dataset.sfx === 'off') return;

      this.playClick();

    }, true);

  }

};