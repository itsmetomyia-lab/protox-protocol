// ============================================
// PROTOX PROTOCOL - sounds.js
// Modulo: Suoni e vibrazione
// Versione: 1.0
// Dipende da: storage.js
// ============================================

const SoundSystem = {

    audioCtx: null,

    // Init audio context
    init() {
        try {
            this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.log('Audio non supportato');
        }
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

    // Suono generico
    playTone(frequency, duration, type = 'sine', volume = 0.2) {
        if (!this.isEnabled() || !this.audioCtx) return;

        try {
            const oscillator = this.audioCtx.createOscillator();
            const gainNode = this.audioCtx.createGain();
            oscillator.connect(gainNode);
            gainNode.connect(this.audioCtx.destination);
            oscillator.frequency.value = frequency;
            oscillator.type = type;
            gainNode.gain.value = volume;
            gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + duration);
            oscillator.start(this.audioCtx.currentTime);
            oscillator.stop(this.audioCtx.currentTime + duration);
        } catch (e) {}
    },

    // XP guadagnato
    playXPGain() {
        this.playTone(523, 0.1);
        setTimeout(() => this.playTone(659, 0.1), 100);
        setTimeout(() => this.playTone(784, 0.15), 200);
    },

    // XP perso
    playXPLoss() {
        this.playTone(300, 0.2, 'sawtooth', 0.15);
        setTimeout(() => this.playTone(250, 0.3, 'sawtooth', 0.1), 200);
    },

    // Level up
    playLevelUp() {
        const notes = [523, 587, 659, 784, 880, 1047];
        notes.forEach((note, i) => {
            setTimeout(() => this.playTone(note, 0.2, 'sine', 0.15), i * 100);
        });
    },

    // Reps
    playReps() {
        this.playTone(440, 0.05);
    },

    // Achievement
    playAchievement() {
        const notes = [784, 880, 988, 1047, 1175, 1319];
        notes.forEach((note, i) => {
            setTimeout(() => this.playTone(note, 0.15, 'sine', 0.1), i * 80);
        });
    },

    // Click
    playClick() {
        this.playTone(1000, 0.03, 'square', 0.05);
    },

    // Vibra
    vibrate(pattern) {
        if (!this.isEnabled()) return;
        if (navigator.vibrate) {
            navigator.vibrate(pattern || [50]);
        }
    }
};