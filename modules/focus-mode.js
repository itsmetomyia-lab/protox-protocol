// ============================================
// PROTOX PROTOCOL - focus-mode.js
// Modulo: Modalità Focus (nasconde distrazioni)
// Versione: 1.0
// Dipende da: storage.js
// ============================================

const FocusMode = {

    isActive: false,
    timer: null,
    seconds: 0,

    // Attiva focus mode
activate(minutes = 25) {
  const m = parseInt(minutes, 10);
  if (!m || m < 1 || m > 240) {
    showMessage('Minuti non validi (1–240)', 'warning');
    return;
  }

  // cleanup (evita overlay doppi + interval doppi)
  const existing = document.getElementById('focus-overlay');
  if (existing) existing.remove();
  clearInterval(this.timer);
  clearInterval(this.quoteInterval);

  this.isActive = true;
  this.seconds = m * 60;

  const overlay = document.createElement('div');
  overlay.id = 'focus-overlay';

  overlay.innerHTML = `
    <div class="focus-container">
      <div class="focus-header">
        <span class="focus-icon"></span>
        <h1>FOCUS MODE</h1>
        <p class="focus-subtitle">Elimina le distrazioni. Concentrati.</p>
      </div>

      <div class="focus-timer-circle">
        <svg class="focus-ring" viewBox="0 0 260 260" width="260" height="260" aria-hidden="true">
          <circle class="focus-ring-bg" cx="130" cy="130" r="110" transform="rotate(-90 130 130)"></circle>
          <circle class="focus-ring-progress" id="focus-ring-fill"
                  cx="130" cy="130" r="110"
                  transform="rotate(-90 130 130)"></circle>
        </svg>

        <div class="focus-timer-inner">
          <div class="focus-time" id="focus-time-display">${this.formatTime(this.seconds)}</div>
          <div class="focus-label">RIMANENTI</div>
        </div>
      </div>

      <div class="focus-quote" id="focus-quote">
        ${this.getRandomQuote()}
      </div>

      <div class="focus-breathe">
        <div class="breathe-circle" id="breathe-circle"></div>
        <span class="breathe-text" id="breathe-text">Respira...</span>
      </div>

      <button class="focus-end-btn" onclick="FocusMode.deactivate()">ESCI DAL FOCUS</button>
    </div>
  `;

  document.body.appendChild(overlay);
  document.body.style.overflow = 'hidden';

  // init ring (frame 0)
  const ring = document.getElementById('focus-ring-fill');
  if (ring) {
    const r = parseFloat(ring.getAttribute('r') || '110');
    const circumference = 2 * Math.PI * r;
    ring.style.strokeDasharray = circumference;
    ring.style.strokeDashoffset = circumference; // vuoto all'inizio
  }

  this.startTimer(m);
  this.startBreathing();

  this.quoteInterval = setInterval(() => {
    const quoteEl = document.getElementById('focus-quote');
    if (quoteEl) quoteEl.innerHTML = this.getRandomQuote();
  }, 30000);

  showMessage(`Focus Mode: ${m} minuti`, 'positive');
},

    // Timer
startTimer(minutes) {
  const totalSeconds = minutes * 60;

  this.timer = setInterval(() => {
    // se overlay sparisce, stoppa per sicurezza
    if (!document.getElementById('focus-overlay')) {
      clearInterval(this.timer);
      return;
    }

    this.seconds--;

    const display = document.getElementById('focus-time-display');
    if (display) display.textContent = this.formatTime(this.seconds);

    const ring = document.getElementById('focus-ring-fill');
    if (ring) {
      const r = parseFloat(ring.getAttribute('r') || '110');
      const circumference = 2 * Math.PI * r;

      // ring che si riempie col tempo
      const progress = (totalSeconds - this.seconds) / totalSeconds; // 0..1
      const offset = circumference - (progress * circumference);

      ring.style.strokeDasharray = circumference;
      ring.style.strokeDashoffset = offset;
    }

    if (this.seconds <= 0) this.complete();
  }, 1000);
},

    // Completamento
    complete() {
        clearInterval(this.timer);
        clearInterval(this.quoteInterval);
        this.isActive = false;

        // Suono
        if (typeof SoundSystem !== 'undefined') {
            SoundSystem.playLevelUp();
        }

        // Vibrazione
        if (navigator.vibrate) {
            navigator.vibrate([200, 100, 200, 100, 400]);
        }

        // XP bonus
        const xpGained = 50;
        addXP(xpGained, 'Focus Mode completato');

        // Rimuovi overlay
        const overlay = document.getElementById('focus-overlay');
        if (overlay) overlay.remove();
        document.body.style.overflow = '';

        showMessage(`🎯 Focus completato! +${xpGained} XP`, 'positive');

        // Particelle
        if (typeof Particles !== 'undefined') {
            Particles.xpGainBurst(window.innerWidth / 2, window.innerHeight / 2);
        }
    },

confirmPopup({ title = 'CONFERMA', message = '', okText = 'OK', cancelText = 'ANNULLA', danger = false } = {}) {
  return new Promise((resolve) => {
    const existing = document.getElementById('focus-confirm-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'focus-confirm-overlay';

    overlay.style.cssText = `
      position:fixed; inset:0; z-index:2100;
      display:flex; justify-content:center; align-items:center;
      padding:max(14px, env(safe-area-inset-top)) 14px max(14px, env(safe-area-inset-bottom));
      background: radial-gradient(900px 500px at 50% 20%, rgba(139,92,246,0.20), transparent 55%), rgba(0,0,0,0.72);
      backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
    `;

    overlay.innerHTML = `
      <div style="
        width:min(92vw, 420px);
        border-radius:18px; overflow:hidden;
        background: linear-gradient(180deg, rgba(255,255,255,0.035), rgba(255,255,255,0.015));
        border: 1px solid rgba(255,255,255,0.10);
        box-shadow: 0 0 0 1px rgba(139,92,246,0.20) inset, 0 18px 60px rgba(0,0,0,0.60);
      ">
        <div style="
          padding:14px 14px 12px;
          background: radial-gradient(700px 110px at 25% 0%, rgba(139,92,246,0.32), transparent 65%),
                      linear-gradient(180deg, rgba(8,8,12,0.92), rgba(8,8,12,0.62));
          border-bottom: 1px solid rgba(255,255,255,0.06);
        ">
          <div style="font-family:'Orbitron',sans-serif; letter-spacing:2px; font-size:0.78rem; color:#fff;">
            ${title}
          </div>
        </div>

        <div style="padding:12px 14px 14px; color:var(--text-dim); line-height:1.35; font-size:0.92rem;">
          ${message}
        </div>

        <div style="display:flex; gap:10px; padding:0 14px 14px;">
          <button class="manual-btn friends-btn-ghost" id="focus-confirm-cancel" style="flex:1; padding:12px;">${cancelText}</button>
          <button class="manual-btn" id="focus-confirm-ok"
            style="flex:1; padding:12px; ${danger ? 'background:rgba(239,68,68,0.14); border-color:rgba(239,68,68,0.40); color:rgba(239,68,68,0.96);' : ''}">
            ${okText}
          </button>
        </div>
      </div>
    `;

    const cleanup = (value) => {
      document.removeEventListener('keydown', onKey);
      overlay.remove();
      resolve(value);
    };

    const onKey = (e) => { if (e.key === 'Escape') cleanup(false); };

    document.addEventListener('keydown', onKey);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) cleanup(false); });

    overlay.querySelector('#focus-confirm-cancel').onclick = () => cleanup(false);
    overlay.querySelector('#focus-confirm-ok').onclick = () => cleanup(true);

    document.body.appendChild(overlay);
  });
},

    // Disattiva manualmente
async deactivate() {
  const ok = await this.confirmPopup({
    title: 'ESCI DAL FOCUS',
    message: 'Se esci ora, perdi il bonus XP della sessione in corso. Vuoi uscire?',
    okText: 'ESCI',
    cancelText: 'RESTA',
    danger: true
  });
  if (!ok) return;

  clearInterval(this.timer);
  clearInterval(this.quoteInterval);

  this.isActive = false;

  const overlay = document.getElementById('focus-overlay');
  if (overlay) overlay.remove();

  document.body.style.overflow = '';

  showMessage('Focus Mode terminato', 'warning');
},
    // Animazione respiro
    startBreathing() {
        const phases = [
            { text: 'Inspira...', duration: 4000, scale: 1.5 },
            { text: 'Trattieni...', duration: 4000, scale: 1.5 },
            { text: 'Espira...', duration: 4000, scale: 1 },
            { text: 'Trattieni...', duration: 2000, scale: 1 }
        ];

        let phaseIndex = 0;

        const cycle = () => {
            if (!this.isActive) return;

            const phase = phases[phaseIndex];
            const circle = document.getElementById('breathe-circle');
            const text = document.getElementById('breathe-text');

            if (circle) circle.style.transform = `scale(${phase.scale})`;
            if (text) text.textContent = phase.text;

            phaseIndex = (phaseIndex + 1) % phases.length;
            setTimeout(cycle, phase.duration);
        };

        cycle();
    },

    // Quote motivazionali
    getRandomQuote() {
        const quotes = [
            { text: "La disciplina è il ponte tra obiettivi e risultati.", author: "Jim Rohn" },
            { text: "Non contare i giorni, fai che i giorni contino.", author: "Muhammad Ali" },
            { text: "Il dolore di oggi è la forza di domani.", author: "Anonimo" },
            { text: "Ogni maestro è stato un disastro.", author: "T. Harv Eker" },
            { text: "La motivazione ti fa iniziare. L'abitudine ti fa continuare.", author: "Jim Ryun" },
            { text: "Sii più forte delle tue scuse.", author: "Anonimo" },
            { text: "Il momento migliore per piantare un albero era 20 anni fa. Il secondo miglior momento è adesso.", author: "Proverbio cinese" },
            { text: "Non è la montagna che conquistiamo ma noi stessi.", author: "Edmund Hillary" },
            { text: "Il successo è la somma di piccoli sforzi ripetuti giorno dopo giorno.", author: "Robert Collier" },
            { text: "La differenza tra chi sei e chi vuoi essere è cosa fai.", author: "Anonimo" },
            { text: "Fai ciò che è difficile e la vita sarà facile.", author: "Anonimo" },
            { text: "Non aspettare. Il tempo non sarà mai giusto.", author: "Napoleon Hill" },
            { text: "La sofferenza che non distrugge, rafforza.", author: "Nietzsche" },
            { text: "Ogni rep ti avvicina alla versione migliore di te.", author: "PROTOX" },
            { text: "Il cervello cambia. Tu decidi come.", author: "PROTOX" },
            { text: "100.000 reps. Nessuna scorciatoia.", author: "PROTOX" }
        ];

        const q = quotes[Math.floor(Math.random() * quotes.length)];
        return `<p class="quote-text">"${q.text}"</p><p class="quote-author">— ${q.author}</p>`;
    },

    // Format time
    formatTime(secs) {
        const m = Math.floor(secs / 60);
        const s = secs % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    },

    // Render nella pagina
    render() {
        const container = document.getElementById('focus-content');
        if (!container) return;

container.innerHTML = `
  <div class="focus-options">
    <h3>SCEGLI LA DURATA</h3>

    <div class="focus-duration-grid">
      <button class="focus-dur-btn" onclick="FocusMode.activate(15)">
        <span class="dur-time">15</span><span class="dur-label">minuti</span>
      </button>

      <button class="focus-dur-btn" onclick="FocusMode.activate(25)">
        <span class="dur-time">25</span><span class="dur-label">minuti</span>
      </button>

      <button class="focus-dur-btn" onclick="FocusMode.activate(45)">
        <span class="dur-time">45</span><span class="dur-label">minuti</span>
      </button>

      <button class="focus-dur-btn" onclick="FocusMode.activate(60)">
        <span class="dur-time">60</span><span class="dur-label">minuti</span>
      </button>

      <button class="focus-dur-btn" onclick="FocusMode.activate(90)">
        <span class="dur-time">90</span><span class="dur-label">minuti</span>
      </button>

      <button class="focus-dur-btn" onclick="FocusMode.activate(120)">
        <span class="dur-time">120</span><span class="dur-label">minuti</span>
      </button>
    </div>

    <div class="focus-custom-row">
      <input id="focus-custom-mins" class="manual-input" type="number" min="1" max="240" placeholder="Minuti custom (es. 12)" />
      <button class="manual-btn" onclick="FocusMode.activate(parseInt(document.getElementById('focus-custom-mins').value||'0',10))">START</button>
    </div>

    <p class="focus-desc">
      Il Focus Mode nasconde tutto e ti aiuta a concentrarti. Completa la sessione per guadagnare +50 XP.
    </p>
  </div>
`;
    }
};