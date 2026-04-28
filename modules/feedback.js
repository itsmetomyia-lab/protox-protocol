// ============================================
// PROTOX PROTOCOL - feedback.js
// Modulo: Sistema feedback con invio email
// Versione: 1.0
// Dipende da: storage.js, EmailJS
// ============================================

const Feedback = {

    // SOSTITUISCI QUESTI CON I TUOI CODICI EMAILJS
    SERVICE_ID: 'service_62d21p8',
    TEMPLATE_ID: 'template_xnukbs7',
    PUBLIC_KEY: 'OFpP4mF_IWQuNNZX4',

    // Init EmailJS
    init() {
        try {
            emailjs.init(this.PUBLIC_KEY);
            console.log('EmailJS inizializzato');
        } catch (e) {
            console.log('EmailJS non disponibile');
        }
    },

    // Tipi di feedback
    types: [
        { id: 'bug', icon: '🐛', label: 'Bug / Errore', desc: 'Qualcosa non funziona' },
        { id: 'feature', icon: '💡', label: 'Idea / Feature', desc: 'Suggerisci una funzione' },
        { id: 'design', icon: '🎨', label: 'Design / UI', desc: 'Migliora l\'aspetto' },
        { id: 'general', icon: '💬', label: 'Generale', desc: 'Qualsiasi altra cosa' },
        { id: 'love', icon: '❤️', label: 'Apprezzamento', desc: 'Dicci cosa ti piace' }
    ],

    // Stato corrente
    selectedType: null,
    isSending: false,

    // Seleziona tipo
    selectType(typeId) {
        this.selectedType = typeId;
        document.querySelectorAll('.feedback-type-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        const activeBtn = document.getElementById(`ftype-${typeId}`);
        if (activeBtn) activeBtn.classList.add('active');

        // Abilita textarea
        const textarea = document.getElementById('feedback-message');
        if (textarea) {
            textarea.disabled = false;
            textarea.focus();
        }

        // Abilita bottone
        this.checkReady();
    },

    // Controlla se pronto per inviare
    checkReady() {
        const message = document.getElementById('feedback-message')?.value?.trim();
        const btn = document.getElementById('feedback-send-btn');

        if (this.selectedType && message && message.length >= 10 && !this.isSending) {
            btn.classList.add('ready');
            btn.disabled = false;
        } else {
            btn.classList.remove('ready');
            btn.disabled = true;
        }
    },

    // Invia feedback
    async send() {
        if (this.isSending) return;

        const message = document.getElementById('feedback-message')?.value?.trim();
        const name = document.getElementById('feedback-name')?.value?.trim() || 'Anonimo';

        if (!this.selectedType || !message || message.length < 10) {
            showMessage('Seleziona un tipo e scrivi almeno 10 caratteri', 'warning');
            return;
        }

        this.isSending = true;
        const btn = document.getElementById('feedback-send-btn');
        const btnText = btn.innerHTML;
        btn.innerHTML = '<span class="sending-spinner"></span> INVIO IN CORSO...';
        btn.classList.add('sending');

        const typeInfo = this.types.find(t => t.id === this.selectedType);
        const player = loadPlayer();

        const templateParams = {
            from_name: name,
            feedback_type: `${typeInfo.icon} ${typeInfo.label}`,
            message: message,
            date: new Date().toLocaleString('it-IT'),
            player_level: `Level ${player.level} — ${player.title}`,
            player_xp: player.xp,
            player_reps: player.reps,
            player_streak: player.streak
        };

        try {
            await emailjs.send(this.SERVICE_ID, this.TEMPLATE_ID, templateParams);

            // Successo
            this.isSending = false;
            this.selectedType = null;
            this.showSuccess();

            // Salva che ha inviato feedback
            const feedbackCount = Storage.load('feedback_count') || 0;
            Storage.save('feedback_count', feedbackCount + 1);

            // XP reward
            addXP(25, 'Feedback inviato');

            if (typeof SoundSystem !== 'undefined') {
                SoundSystem.playAchievement();
            }

        } catch (error) {
            console.error('Errore invio:', error);
            this.isSending = false;
            btn.innerHTML = btnText;
            btn.classList.remove('sending');
            showMessage('Errore di invio. Riprova.', 'negative');
        }
    },

    // Mostra schermata successo
    showSuccess() {
        const container = document.getElementById('feedback-content');
        if (!container) return;

        container.innerHTML = `
            <div class="feedback-success">
                <div class="success-icon">✅</div>
                <h2>FEEDBACK INVIATO!</h2>
                <p>Grazie per averci aiutato a migliorare Protox.</p>
                <p class="success-xp">+25 XP guadagnati</p>
                <button class="feedback-again-btn" onclick="Feedback.render()">
                    INVIA ALTRO FEEDBACK
                </button>
            </div>
        `;
    },

    // Render pagina feedback
    render() {
        const container = document.getElementById('feedback-content');
        if (!container) return;

        this.selectedType = null;
        this.isSending = false;

        const player = loadPlayer();
        const feedbackCount = Storage.load('feedback_count') || 0;

        container.innerHTML = `
            <!-- TIPO FEEDBACK -->
            <div class="section-card">
                <h3>COSA VUOI DIRCI?</h3>
                <div class="feedback-types">
                    ${this.types.map(t => `
                        <button class="feedback-type-btn" id="ftype-${t.id}"
                                onclick="Feedback.selectType('${t.id}')">
                            <span class="ftype-icon">${t.icon}</span>
                            <div class="ftype-info">
                                <span class="ftype-label">${t.label}</span>
                                <span class="ftype-desc">${t.desc}</span>
                            </div>
                        </button>
                    `).join('')}
                </div>
            </div>

            <!-- MESSAGGIO -->
            <div class="section-card">
                <h3>IL TUO MESSAGGIO</h3>

                <input type="text"
                       id="feedback-name"
                       class="feedback-input"
                       placeholder="Nome (opzionale)"
                       value="${player.name || ''}"
                       maxlength="30">

                <textarea
                    id="feedback-message"
                    class="feedback-textarea"
                    placeholder="Scrivi il tuo feedback... (min 10 caratteri)"
                    maxlength="1000"
                    disabled
                    oninput="Feedback.checkReady(); Feedback.updateCharCount();"
                ></textarea>

                <div class="feedback-char-count">
                    <span id="feedback-chars">0</span>/1000
                </div>

                <button class="feedback-send-btn" id="feedback-send-btn"
                        onclick="Feedback.send()" disabled>
                    INVIA FEEDBACK ⚡
                </button>

                <p class="feedback-note">
                    Il feedback arriva direttamente a noi. 
                    ${feedbackCount > 0 ? `Hai già inviato ${feedbackCount} feedback. Grazie!` : 'Ogni messaggio viene letto.'}
                </p>
            </div>

            <!-- INFO -->
            <div class="section-card feedback-info-card">
                <div class="feedback-info-row">
                    <span>📧</span>
                    <span>I feedback arrivano su newlife0newbrain@gmail.com</span>
                </div>
                <div class="feedback-info-row">
                    <span>🎁</span>
                    <span>Ogni feedback inviato = +25 XP</span>
                </div>
                <div class="feedback-info-row">
                    <span>🔒</span>
                    <span>Nessun dato personale viene salvato</span>
                </div>
            </div>
        `;
    },

    // Aggiorna contatore caratteri
    updateCharCount() {
        const textarea = document.getElementById('feedback-message');
        const counter = document.getElementById('feedback-chars');
        if (textarea && counter) {
            counter.textContent = textarea.value.length;
        }
    }
};