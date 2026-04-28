// ============================================
// PROTOX PROTOCOL - timer.js
// Modulo: Timer sessione allenamento
// Versione: 1.0
// Dipende da: storage.js
// ============================================

const Timer = {

    interval: null,
    seconds: 0,
    isRunning: false,
    isPaused: false,
    mode: 'stopwatch', // 'stopwatch' o 'countdown'
    countdownFrom: 0,

    // Preset tempi
    presets: [
        { label: '5 min', seconds: 300 },
        { label: '10 min', seconds: 600 },
        { label: '15 min', seconds: 900 },
        { label: '20 min', seconds: 1200 },
        { label: '30 min', seconds: 1800 },
        { label: '45 min', seconds: 2700 },
        { label: '60 min', seconds: 3600 }
    ],

    // Avvia cronometro libero
    startStopwatch() {
        if (this.isRunning) return;
        this.mode = 'stopwatch';
        this.seconds = 0;
        this.isRunning = true;
        this.isPaused = false;
        this.tick();
        this.updateButtons();
    },

    // Avvia countdown
    startCountdown(totalSeconds) {
        if (this.isRunning) return;
        this.mode = 'countdown';
        this.countdownFrom = totalSeconds;
        this.seconds = totalSeconds;
        this.isRunning = true;
        this.isPaused = false;
        this.tick();
        this.updateButtons();
    },

    // Tick ogni secondo
    tick() {
        if (this.interval) clearInterval(this.interval);

        this.interval = setInterval(() => {
            if (this.isPaused) return;

            if (this.mode === 'stopwatch') {
                this.seconds++;
            } else {
                this.seconds--;
                if (this.seconds <= 0) {
                    this.seconds = 0;
                    this.complete();
                    return;
                }
            }

            this.updateDisplay();
        }, 1000);
    },

    // Pausa
    pause() {
        this.isPaused = true;
        this.updateButtons();
    },

    // Riprendi
    resume() {
        this.isPaused = false;
        this.updateButtons();
    },

    // Stop
    stop() {
        clearInterval(this.interval);
        this.interval = null;
        this.isRunning = false;
        this.isPaused = false;

        // Salva sessione se almeno 60 secondi
        if (this.mode === 'stopwatch' && this.seconds >= 60) {
            this.saveSession(this.seconds);
        } else if (this.mode === 'countdown') {
            const elapsed = this.countdownFrom - this.seconds;
            if (elapsed >= 60) {
                this.saveSession(elapsed);
            }
        }

        this.seconds = 0;
        this.updateDisplay();
        this.updateButtons();
    },

    // Completamento countdown
    complete() {
        clearInterval(this.interval);
        this.interval = null;
        this.isRunning = false;
        this.isPaused = false;

        // Suono
        this.playSound();

        // Vibrazione
        if (navigator.vibrate) {
            navigator.vibrate([200, 100, 200, 100, 200]);
        }

        // Salva sessione
        this.saveSession(this.countdownFrom);

        // XP bonus per sessione completata
        const minutes = Math.floor(this.countdownFrom / 60);
        const xpGained = Math.floor(minutes * 2);
        addXP(xpGained, `Sessione ${minutes} min completata`);
        showMessage(`⏱️ Sessione completata! +${xpGained} XP`, 'positive');

        this.seconds = 0;
        this.updateDisplay();
        this.updateButtons();
    },

    // Suono fine sessione
    playSound() {
        try {
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

            // Suona 3 beep
            [0, 0.3, 0.6].forEach(delay => {
                const oscillator = audioCtx.createOscillator();
                const gainNode = audioCtx.createGain();
                oscillator.connect(gainNode);
                gainNode.connect(audioCtx.destination);
                oscillator.frequency.value = 800;
                oscillator.type = 'sine';
                gainNode.gain.value = 0.3;
                oscillator.start(audioCtx.currentTime + delay);
                oscillator.stop(audioCtx.currentTime + delay + 0.2);
            });
        } catch (e) {
            console.log('Audio non supportato');
        }
    },

    // Salva sessione nella cronologia
    saveSession(durationSeconds) {
        const sessions = Storage.load('sessions') || [];
        sessions.unshift({
            date: new Date().toLocaleDateString('it-IT'),
            time: new Date().toLocaleTimeString('it-IT'),
            duration: durationSeconds,
            mode: this.mode
        });

        // Tieni massimo 50 sessioni
        if (sessions.length > 50) sessions.pop();
        Storage.save('sessions', sessions);
    },

    // Formatta secondi in MM:SS
    formatTime(secs) {
        const h = Math.floor(secs / 3600);
        const m = Math.floor((secs % 3600) / 60);
        const s = secs % 60;

        if (h > 0) {
            return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        }
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    },

    // Aggiorna display tempo
    updateDisplay() {
        const display = document.getElementById('timer-display');
        if (display) {
            display.textContent = this.formatTime(this.seconds);
        }

        // Progress ring per countdown
        if (this.mode === 'countdown' && this.countdownFrom > 0) {
            const progress = ((this.countdownFrom - this.seconds) / this.countdownFrom) * 100;
            const ring = document.getElementById('timer-ring-progress');
            if (ring) {
                const circumference = 2 * Math.PI * 90;
                const offset = circumference - (progress / 100) * circumference;
                ring.style.strokeDashoffset = offset;
            }
        }
    },

    // Aggiorna bottoni
    updateButtons() {
        const startBtn = document.getElementById('timer-start');
        const pauseBtn = document.getElementById('timer-pause');
        const stopBtn = document.getElementById('timer-stop');

        if (startBtn) startBtn.style.display = this.isRunning ? 'none' : 'flex';
        if (pauseBtn) {
            pauseBtn.style.display = this.isRunning ? 'flex' : 'none';
            pauseBtn.textContent = this.isPaused ? '▶ RIPRENDI' : '⏸ PAUSA';
            pauseBtn.onclick = () => this.isPaused ? this.resume() : this.pause();
        }
        if (stopBtn) stopBtn.style.display = this.isRunning ? 'flex' : 'none';
    },

    // Cronologia sessioni
    getHistory() {
        return Storage.load('sessions') || [];
    },

    // Renderizza timer
    render() {
        const container = document.getElementById('timer-section-content');
        if (!container) return;

        const sessions = this.getHistory();

        container.innerHTML = `
            <!-- TIMER DISPLAY -->
            <div class="timer-circle">
                <svg class="timer-ring" width="200" height="200">
                    <circle class="timer-ring-bg" cx="100" cy="100" r="90" />
                    <circle class="timer-ring-progress" id="timer-ring-progress" cx="100" cy="100" r="90" />
                </svg>
                <span class="timer-time" id="timer-display">00:00</span>
            </div>

            <!-- PRESET BUTTONS -->
            <div class="timer-presets">
                <button class="preset-btn" onclick="Timer.startStopwatch()">⏱️ Libero</button>
                ${this.presets.map(p => `
                    <button class="preset-btn" onclick="Timer.startCountdown(${p.seconds})">${p.label}</button>
                `).join('')}
            </div>

            <!-- CONTROL BUTTONS -->
            <div class="timer-controls">
                <button class="timer-ctrl-btn start" id="timer-start" onclick="Timer.startStopwatch()">▶ AVVIA</button>
                <button class="timer-ctrl-btn pause" id="timer-pause" style="display:none" onclick="Timer.pause()">⏸ PAUSA</button>
                <button class="timer-ctrl-btn stop" id="timer-stop" style="display:none" onclick="Timer.stop()">⏹ STOP</button>
            </div>

            <!-- CRONOLOGIA -->
            <div class="timer-history">
                <h3>📋 Ultime Sessioni</h3>
                ${sessions.length === 0 ? '<p class="empty-text">Nessuna sessione ancora</p>' : ''}
                ${sessions.slice(0, 10).map(s => `
                    <div class="session-item">
                        <span class="session-date">${s.date} ${s.time}</span>
                        <span class="session-duration">${this.formatTime(s.duration)}</span>
                    </div>
                `).join('')}
            </div>
        `;

        this.updateButtons();
    }
};