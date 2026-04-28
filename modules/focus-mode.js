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
        this.isActive = true;
        this.seconds = minutes * 60;

        // Crea overlay focus
        const overlay = document.createElement('div');
        overlay.id = 'focus-overlay';
        overlay.innerHTML = `
            <div class="focus-container">
                <div class="focus-header">
                    <span class="focus-icon">🎯</span>
                    <h1>FOCUS MODE</h1>
                    <p class="focus-subtitle">Elimina le distrazioni. Concentrati.</p>
                </div>

                <div class="focus-timer-circle">
                    <svg class="focus-ring" width="250" height="250">
                        <circle class="focus-ring-bg" cx="125" cy="125" r="110" />
                        <circle class="focus-ring-progress" id="focus-ring-fill" cx="125" cy="125" r="110" />
                    </svg>
                    <div class="focus-timer-inner">
                        <span class="focus-time" id="focus-time-display">${this.formatTime(this.seconds)}</span>
                        <span class="focus-label">RIMANENTI</span>
                    </div>
                </div>

                <div class="focus-quote" id="focus-quote">
                    ${this.getRandomQuote()}
                </div>

                <div class="focus-breathe">
                    <div class="breathe-circle" id="breathe-circle"></div>
                    <span class="breathe-text" id="breathe-text">Respira...</span>
                </div>

                <button class="focus-end-btn" onclick="FocusMode.deactivate()">
                    ESCI DAL FOCUS
                </button>
            </div>
        `;
        document.body.appendChild(overlay);

        // Avvia timer
        this.startTimer(minutes);

        // Avvia animazione respiro
        this.startBreathing();

        // Cambia quote ogni 30 secondi
        this.quoteInterval = setInterval(() => {
            const quoteEl = document.getElementById('focus-quote');
            if (quoteEl) quoteEl.innerHTML = this.getRandomQuote();
        }, 30000);

        showMessage(`🎯 Focus Mode: ${minutes} minuti`, 'positive');
    },

    // Timer
    startTimer(minutes) {
        const totalSeconds = minutes * 60;

        this.timer = setInterval(() => {
            this.seconds--;

            // Aggiorna display
            const display = document.getElementById('focus-time-display');
            if (display) display.textContent = this.formatTime(this.seconds);

            // Aggiorna ring
            const ring = document.getElementById('focus-ring-fill');
            if (ring) {
                const circumference = 2 * Math.PI * 110;
                const progress = ((totalSeconds - this.seconds) / totalSeconds) * 100;
                const offset = circumference - (progress / 100) * circumference;
                ring.style.strokeDasharray = circumference;
                ring.style.strokeDashoffset = offset;
            }

            if (this.seconds <= 0) {
                this.complete();
            }
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

        showMessage(`🎯 Focus completato! +${xpGained} XP`, 'positive');

        // Particelle
        if (typeof Particles !== 'undefined') {
            Particles.xpGainBurst(window.innerWidth / 2, window.innerHeight / 2);
        }
    },

    // Disattiva manualmente
    deactivate() {
        if (!confirm('Sei sicuro di voler uscire dal Focus Mode?')) return;

        clearInterval(this.timer);
        clearInterval(this.quoteInterval);
        this.isActive = false;

        const overlay = document.getElementById('focus-overlay');
        if (overlay) overlay.remove();

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
                <h3>🎯 Scegli la durata</h3>
                <div class="focus-duration-grid">
                    <button class="focus-dur-btn" onclick="FocusMode.activate(15)">
                        <span class="dur-time">15</span>
                        <span class="dur-label">minuti</span>
                    </button>
                    <button class="focus-dur-btn" onclick="FocusMode.activate(25)">
                        <span class="dur-time">25</span>
                        <span class="dur-label">minuti</span>
                    </button>
                    <button class="focus-dur-btn" onclick="FocusMode.activate(45)">
                        <span class="dur-time">45</span>
                        <span class="dur-label">minuti</span>
                    </button>
                    <button class="focus-dur-btn" onclick="FocusMode.activate(60)">
                        <span class="dur-time">60</span>
                        <span class="dur-label">minuti</span>
                    </button>
                    <button class="focus-dur-btn" onclick="FocusMode.activate(90)">
                        <span class="dur-time">90</span>
                        <span class="dur-label">minuti</span>
                    </button>
                    <button class="focus-dur-btn" onclick="FocusMode.activate(120)">
                        <span class="dur-time">120</span>
                        <span class="dur-label">minuti</span>
                    </button>
                </div>
                <p class="focus-desc">Il Focus Mode nasconde tutto e ti aiuta a concentrarti. Completalo per guadagnare XP bonus.</p>
            </div>
        `;
    }
};