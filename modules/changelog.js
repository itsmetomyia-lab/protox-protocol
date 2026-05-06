// ============================================
// PROTOX PROTOCOL - changelog.js
// Modulo: Sistema aggiornamenti e changelog
// Versione: 1.0
// Dipende da: storage.js
// ============================================

const Changelog = {

    // TUTTI GLI AGGIORNAMENTI
    // Quando aggiungi un update, metti un nuovo oggetto IN CIMA all'array
    // L'utente vedrà il popup UNA SOLA VOLTA per ogni versione
    updates: [

{
  version: 'RC 0.0.3',
  date: '2026-05-06',
  title: '🎨 SHADES MODE + 📱 MOBILE FIX PASS',
  highlights: [
    '🎛️ Toggle FLAT ↔ SHADES (tema monocromo o con sfumature vive)',
    '🧊 No-shades zones: Changelog + Timer/Focus restano clean anche con SHADES',
    '🗓️ Planner mobile: numeri giorni leggibili + glow + layout stabile',
    '📜 Recent activity: amount badge leggibile su mobile',
    '♾️ Actions mobile: fix overflow “∞” + nome sempre leggibile',
    '🧠 Profile: Change Name / Protocol Name con animazione Friends (identica) + UI unica'
  ],
  type: 'major'
},

{
  version: 'RC 0.0.2',
  date: '2026-05-03',
  title: '🤝 CO-OP + ⚡ ACTIONS HUB (PREMIUM)',
  highlights: [
    '⏳ Friends co-op: WAITLIST con countdown live quando sei in anticipo',
    '📩 Fix inviti: label sempre visibile + stabilità (no doppie funzioni/override)',
    '📊 Friends hub: STATS in overlay “stack” con BACK (super premium)',
    '🧩 Home Actions: quick deck = recently used (zero scroll infinito)',
    '🔎 Actions Hub: overlay ALL + search + filtri',
    '✨ Smart Create: Fair XP (emoji/categoria/xp più “giusti” mentre scrivi)'
  ],
  type: 'EXTREME'
},
        

{
  version: 'RC 0.0.1',
  date: '2026-05-02',
  title: '🚀 RC: PREMIUM POLISH PASS',
  highlights: [
    'UI premium end-to-end: Home, Timer, Focus Mode, Planner, Friends, Stats',
    'Fix PWA caching: JS/CSS in network-first → niente più hard refresh per vedere gli update',
    'Planner: overlay + griglia 90 giorni + day detail + azioni pianificate super polished',
    'Friends: overlay premium + stats friend + tab + conferme più pulite',
    'Stats: redesign completo (countdown 90 giorni, ultimi 7 giorni, calendario attività, barre categorie, record)',
    'Onboarding/WELCOME: welcome + “come funziona” + nome con look premium + animazioni',
    'Reset Totale: modal premium + animazione destroy'
  ],
  type: 'major'
},

        {
  version: 'BETA 0.0.2',
  date: '2026-04-30',
  title: '👥 FRIENDS ONLINE + AUTH',
  highlights: [
    '👥 Sistema AMICI finalmente ONLINE e 100% funzionante',
    '🔐 Sign-Up / Log-In reale — addio placeholder',
    '🆔 Friend Code cloud (PX-XXXXXXXX) copiabile in 1 tap',
    '📨 Richieste amicizia: invia / annulla / accetta / rifiuta (tutto live)',
    '🤝 Friendship bidirezionale: aggiunta + rimozione istantanea e stabile',
    '🧠 Smart-request: se c’è una richiesta inversa → auto-accept immediata',
    '🌐 Sync cross-device: amici e richieste uguali su tutti i dispositivi',
    '📊 Profili amici con stats vere: level / xp / reps / streak dal cloud',
    '🛡️ Backend solido: Postgres + RLS + RPC anti-bug (niente 409 / niente ghost rows)',
    '✨ Friends UI PREMIUM: glow soffuso, tabs, modal super polished',
    '✅ Popup conferma custom per aggiungere amici',
    '🧰 Service Worker fix: niente cache su POST/Auth (stabilità totale)'
  ],
  type: 'major'
},
        {
            version: 'BETA 0.0.1',
            date: '2026-01-28',
            title: '📅 Planner & Feedback',
            highlights: [
                '📅 Planner 90 giorni con pianificazione attività',
                '💬 Sistema feedback con invio email',
                '🎨 Color picker personalizzato per il tema',
                '🔍 Barra ricerca azioni con filtri',
                '➕ Crea azioni personalizzate',
                '📜 Onboarding ridisegnato con disclaimer',
                '🗑️ Reset con conferma "scrivi RESET"',
                '✏️ Cambio nome con UI dedicata',
                '👁️ Toggle show/hide azioni'
            ],
            type: 'major'
        },
        {
            version: 'BETA 0.0.0',
            date: '2026-01-27',
            title: '⚡ Lancio Protox Protocol',
            highlights: [
                '🧠 Sistema XP e livelli completo',
                '💪 Tracker 100K reps con input manuale',
                '🎯 Missioni giornaliere random',
                '🏆 25 achievements e badge',
                '⏱️ Timer allenamento e Focus Mode',
                '📊 Statistiche dettagliate con grafici',
                '🔥 Moltiplicatore XP basato su streak',
                '🌙 Dark/Light mode + 5 temi',
                '🔔 Notifiche browser',
                '📱 PWA installabile su telefono'
            ],
            type: 'launch'
        }
    ],

    // Ottieni ultima versione
    getLatestVersion() {
        return this.updates[0]?.version || '1.0.0';
    },

    // Ottieni ultima versione vista dall'utente
    getLastSeenVersion() {
        return Storage.load('last_seen_version') || null;
    },

    // Segna come vista
    markAsSeen(version) {
        Storage.save('last_seen_version', version);
    },

    // Controlla se ci sono aggiornamenti non visti
    hasUnseenUpdates() {
        const lastSeen = this.getLastSeenVersion();
        const latest = this.getLatestVersion();

        if (!lastSeen) return true;
        return lastSeen !== latest;
    },

    // Ottieni aggiornamenti non visti
    getUnseenUpdates() {
        const lastSeen = this.getLastSeenVersion();

        if (!lastSeen) return this.updates;

        const unseen = [];
        for (const update of this.updates) {
            if (update.version === lastSeen) break;
            unseen.push(update);
        }

        return unseen;
    },

    // Mostra popup aggiornamento
    showUpdatePopup() {
        if (!this.hasUnseenUpdates()) return;

        const unseen = this.getUnseenUpdates();
        if (unseen.length === 0) return;

        const latest = unseen[0];

        const popup = document.createElement('div');
        popup.id = 'changelog-popup';
        popup.classList.add('no-shades');
        popup.innerHTML = `
            <div class="changelog-popup-container">
                <div class="changelog-popup-header">
                    <div class="changelog-badge ${latest.type}">
                        ${latest.type === 'launch' ? '🚀 LANCIO' : latest.type === 'major' ? '⭐ MAJOR UPDATE' : '🔧 UPDATE'}
                    </div>
                    <button class="changelog-popup-close" onclick="Changelog.closePopup()">✕</button>
                </div>

                <div class="changelog-popup-version">
                    <h2>${latest.title}</h2>
                    <span class="changelog-version-tag">v${latest.version}</span>
                </div>

                <div class="changelog-popup-list">
                    ${latest.highlights.map(h => `
                        <div class="changelog-popup-item">
                            <span>${h}</span>
                        </div>
                    `).join('')}
                </div>

                ${unseen.length > 1 ? `
                    <div class="changelog-more">
                        <span>+ ${unseen.length - 1} ${unseen.length - 1 === 1 ? 'altro aggiornamento' : 'altri aggiornamenti'}</span>
                    </div>
                ` : ''}

                <button class="changelog-popup-btn" onclick="Changelog.closePopup()">
                    HO CAPITO ⚡
                </button>

                <p class="changelog-popup-note">
                    Trovi tutti gli aggiornamenti nel Profilo
                </p>
            </div>
        `;

        document.body.appendChild(popup);
    },

    // Chiudi popup
    closePopup() {
        const popup = document.getElementById('changelog-popup');
        if (popup) {
            popup.style.animation = 'changelogOut 0.3s ease forwards';
            setTimeout(() => {
                popup.remove();
            }, 300);
        }
        this.markAsSeen(this.getLatestVersion());
    },

    // Render nella pagina profilo
    render() {
        const container = document.getElementById('changelog-section');
        if (!container) return;

        let html = '';

        this.updates.forEach(update => {
            html += `
                <div class="changelog-card">
                    <div class="changelog-card-header">
                        <div class="changelog-card-title">
                            <h3>${update.title}</h3>
                            <div class="changelog-card-meta">
                                <span class="changelog-tag ${update.type}">v${update.version}</span>
                                <span class="changelog-date">${this.formatDate(update.date)}</span>
                            </div>
                        </div>
                    </div>
                    <div class="changelog-card-list">
                        ${update.highlights.map(h => `
                            <div class="changelog-item">
                                <span>${h}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;
    },

    // Formatta data
    formatDate(dateStr) {
        const date = new Date(dateStr);
        const months = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];
        return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
    },

    // Controlla e mostra al caricamento
    checkOnLoad() {
        // Aspetta che l'app sia caricata
        setTimeout(() => {
            if (this.hasUnseenUpdates()) {
                this.showUpdatePopup();
            }
        }, 1500);
    }
};