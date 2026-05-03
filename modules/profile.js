// ============================================
// PROTOX PROTOCOL - profile.js
// Modulo: Profilo giocatore e onboarding
// Versione: 1.0
// Dipende da: storage.js
// ============================================

const Profile = {

    // Controlla se è la prima volta
    isFirstTime() {
        return !Storage.exists('player');
    },

    showOnboarding() {
        document.body.classList.add('onboarding-active');

        const overlay = document.createElement('div');
        overlay.id = 'onboarding-overlay';
        overlay.innerHTML = `
            <div class="onboarding-container">

                <!-- STEP 1: Intro -->
                <div class="onboarding-step" id="onboard-step-1">
                    <div class="onboard-icon">⚡</div>
                    <h1>PROTOX PROTOCOL</h1>
                    <div class="onboard-divider"></div>
                    <p class="onboard-hero">90 giorni.<br>100.000 reps.<br>Una versione di te che ancora non esiste.</p>
                    <button class="onboard-btn" onclick="Profile.nextStep(2)">INIZIA →</button>
                </div>

                <!-- STEP 2: Cos'è -->
                <div class="onboarding-step hidden" id="onboard-step-2">
                    <div class="onboard-icon">🧠</div>
                    <h2>COS'È PROTOX</h2>
                    <div class="onboard-divider"></div>
                    <div class="onboard-block">
                        <p>Il tuo cervello cambia in base a quello che fai ogni giorno. Questo si chiama neuroplasticità.</p>
                        <p>Protox usa questo principio: ripeti un esercizio 100.000 volte, costruisci nuove connessioni neurali, e diventi una persona diversa.</p>
                        <p>Non è magia. È scienza applicata con disciplina.</p>
                    </div>
                    <button class="onboard-btn" onclick="Profile.nextStep(3)">AVANTI →</button>
                </div>

                <!-- STEP 3: Come funziona -->
                <div class="onboarding-step hidden" id="onboard-step-3">
                    <div class="onboard-icon">⚔️</div>
                    <h2>COME FUNZIONA</h2>
                    <div class="onboard-divider"></div>
                    <div class="onboard-rules">
                        <div class="onboard-rule">
                            <span class="rule-icon">🎯</span>
                            <div class="rule-text">
                                <strong>Azioni = XP</strong>
                                <span>Fai cose buone, guadagni punti esperienza. Fai cazzate, li perdi.</span>
                            </div>
                        </div>
                        <div class="onboard-rule">
                            <span class="rule-icon">🔥</span>
                            <div class="rule-text">
                                <strong>Streak = Potere</strong>
                                <span>Più giorni consecutivi, più alto il moltiplicatore XP.</span>
                            </div>
                        </div>
                        <div class="onboard-rule">
                            <span class="rule-icon">🧠</span>
                            <div class="rule-text">
                                <strong>Reps = Trasformazione</strong>
                                <span>100K reps in 90 giorni. Il tuo cervello si ricabla.</span>
                            </div>
                        </div>
                        <div class="onboard-rule">
                            <span class="rule-icon">📊</span>
                            <div class="rule-text">
                                <strong>Tutto è tracciato</strong>
                                <span>Statistiche, record, badge. Vedi chi stai diventando.</span>
                            </div>
                        </div>
                    </div>
                    <button class="onboard-btn" onclick="Profile.nextStep(4)">AVANTI →</button>
                </div>

                <!-- STEP 4: Disclaimer -->
                <div class="onboarding-step hidden" id="onboard-step-4">
                    <div class="onboard-icon">📜</div>
                    <h2>PRIMA DI INIZIARE</h2>
                    <div class="onboard-divider"></div>
                    <div class="onboard-disclaimer">
                        <div class="disclaimer-section">
                            <h3>Questa app è per te.</h3>
                            <p>Non per una classifica. Non per flexare. Non per competere con nessuno. È uno strumento che hai tra le mani per costruire la disciplina che vuoi avere.</p>
                        </div>
                        <div class="disclaimer-section">
                            <h3>Le regole le fai tu.</h3>
                            <p>Sei tu che decidi se hai davvero fatto quel workout. Sei tu che sai se hai ceduto a quella dipendenza. Nessuno controlla. Nessuno ti giudica. Ma se menti a te stesso, stai solo fregando te stesso.</p>
                        </div>
                        <div class="disclaimer-section">
                            <h3>Zero cheat. Zero scorciatoie.</h3>
                            <p>Potresti cliccare 500 reps senza farle. Potresti segnarti azioni che non hai fatto. Potresti barare in mille modi. Ma a che serve? I numeri sullo schermo non cambiano chi sei davvero. Le reps vere sì.</p>
                        </div>
                        <div class="disclaimer-section">
                            <h3>Non è un gioco.</h3>
                            <p>Ha la forma di un gioco perché funziona meglio così. Ma quello che stai facendo è reale. Il dolore delle cold shower è reale. La fatica del workout è reale. E la persona che diventi dopo 90 giorni è reale.</p>
                        </div>
                    </div>
                    <div class="disclaimer-accept">
                        <label class="accept-label">
                            <input type="checkbox" id="accept-check" onchange="Profile.checkAccept()">
                            <span class="accept-checkmark"></span>
                            <span class="accept-text">Ho capito. Sono qui per me stesso.</span>
                        </label>
                    </div>
                    <button class="onboard-btn disabled" id="accept-btn" onclick="Profile.nextStep(5)">ACCETTO →</button>
                </div>

                <!-- STEP 5: Nome -->
                <div class="onboarding-step hidden" id="onboard-step-5">
                    <div class="onboard-icon">👤</div>
                    <h2>CHI STAI PER DIVENTARE?</h2>
                    <div class="onboard-divider"></div>
                    <p class="onboard-name-desc">Non il tuo nome di adesso.<br>Il nome di chi sarai tra 90 giorni.</p>
                    <input type="text" id="onboard-name" class="onboard-input"
                           placeholder="Il tuo nome..." maxlength="20" autocomplete="off">
                    <button class="onboard-btn" onclick="Profile.completeOnboarding()">INIZIA IL PROTOCOLLO ⚡</button>
                </div>

            </div>
        `;
        document.body.appendChild(overlay);

        const blockAll = function(e) {
            e.preventDefault();
            e.stopPropagation();
            return false;
        };

        // Blocca scroll SOLO sul body, NON sull'overlay interno
        const blockBodyScroll = function(e) {
            // Permetti scroll dentro il disclaimer
            const disclaimer = document.querySelector('.onboard-disclaimer');
            if (disclaimer && disclaimer.contains(e.target)) {
                return; // Lascia scrollare
            }

            // Permetti scroll dentro l'input
            const input = document.getElementById('onboard-name');
            if (input && input.contains(e.target)) {
                return;
            }

            e.preventDefault();
            e.stopPropagation();
            return false;
        };

        overlay.addEventListener('touchmove', blockBodyScroll, { passive: false });
        document.addEventListener('touchmove', blockBodyScroll, { passive: false });

        window._onboardBlockAll = blockBodyScroll;
    },
    // Prossimo step onboarding
    nextStep(step) {
        // Blocca step 5 se disclaimer non accettato
        if (step === 5) {
            const checkbox = document.getElementById('accept-check');
            if (!checkbox || !checkbox.checked) {
                showMessage('Accetta il disclaimer per continuare', 'warning');
                return;
            }
        }

        document.querySelectorAll('.onboarding-step').forEach(s => s.classList.add('hidden'));
        document.getElementById(`onboard-step-${step}`).classList.remove('hidden');
    },

    checkAccept() {
        const checkbox = document.getElementById('accept-check');
        const btn = document.getElementById('accept-btn');

        if (checkbox && checkbox.checked) {
            btn.classList.remove('disabled');
        } else {
            btn.classList.add('disabled');
        }
    },

    // Completa onboarding
     completeOnboarding() {
        const nameInput = document.getElementById('onboard-name');
        const name = nameInput ? nameInput.value.trim() : '';

        if (!name) {
            showMessage('Inserisci il tuo nome!', 'warning');
            return;
        }

        // Crea giocatore
        const player = createNewPlayer();
        player.name = name;
        Storage.save('player', player);

        // Rimuovi blocco scroll
        if (window._onboardBlockAll) {
            document.removeEventListener('touchmove', window._onboardBlockAll);
            document.removeEventListener('wheel', window._onboardBlockAll);
            window._onboardBlockAll = null;
        }

        // Rimuovi overlay
        const overlay = document.getElementById('onboarding-overlay');
        if (overlay) overlay.remove();

        // SBLOCCA TUTTO
        document.body.classList.remove('onboarding-active');

        // Inizializza app
        updateUI(player);
        checkTodayActions();
        loadTheme();

        if (typeof Navigation !== 'undefined') {
            Navigation.init();
        }

        showMessage(`Benvenuto ${name}! Il Protocollo è iniziato.`, 'positive');
    },
    // Cambia nome
    changeName() {
        const popup = document.createElement('div');
        popup.id = 'changename-popup';
        
        const player = loadPlayer();
        
        popup.innerHTML = `
            <div class="changename-container">
                <div class="changename-header">
                    <h2>CAMBIA NOME</h2>
                    <button class="changename-close" onclick="Profile.closeChangeName()">✕</button>
                </div>

                <div class="changename-current">
                    <span class="changename-label">NOME ATTUALE</span>
                    <span class="changename-value">${player.name || 'Player'}</span>
                </div>

                <div class="changename-avatar">
                    ${this.getAvatarEmoji(player.level)}
                </div>

                <div class="changename-field">
                    <label>NUOVO NOME</label>
                    <input type="text"
                           id="new-name-input"
                           class="changename-input"
                           placeholder="Chi vuoi diventare?"
                           maxlength="20"
                           autocomplete="off"
                           value=""
                           oninput="Profile.checkNewName()">
                    <div class="changename-charcount">
                        <span id="name-char-count">0</span>/20
                    </div>
                </div>

                <button class="changename-submit disabled" id="changename-btn" onclick="Profile.submitNewName()">
                    CAMBIA IDENTITÀ ⚡
                </button>

                <p class="changename-note">Il tuo nome è solo per te. Nessuno lo vede.</p>
            </div>
        `;
        
        document.body.appendChild(popup);
        document.body.style.overflow = 'hidden';

// chiudi cliccando sul backdrop (fuori dalla card)
popup.addEventListener('mousedown', (e) => {
  if (e.target === popup) Profile.closeChangeName();
});

// chiudi con ESC
const onEsc = (e) => {
  if (e.key === 'Escape') Profile.closeChangeName();
};
popup._onEsc = onEsc;
document.addEventListener('keydown', onEsc);
    
        // Focus input
        setTimeout(() => {
            document.getElementById('new-name-input')?.focus();
        }, 300);
    },

    checkNewName() {
        const input = document.getElementById('new-name-input');
        const btn = document.getElementById('changename-btn');
        const counter = document.getElementById('name-char-count');

        if (!input || !btn) return;

        const value = input.value.trim();
        if (counter) counter.textContent = input.value.length;

        if (value.length >= 2) {
            btn.classList.remove('disabled');
        } else {
            btn.classList.add('disabled');
        }
    },

    submitNewName() {
        const input = document.getElementById('new-name-input');
        if (!input) return;

        const newName = input.value.trim();
        if (newName.length < 2) {
            showMessage('Almeno 2 caratteri!', 'warning');
            return;
        }

        const player = loadPlayer();
        const oldName = player.name;
        player.name = newName;
        Storage.save('player', player);

        // Animazione
        const container = document.querySelector('.changename-container');
        if (container) {
            container.style.animation = 'nameChangeFlash 0.5s ease';
        }

        setTimeout(() => {
            this.closeChangeName();
            this.updateName();
            updateUI(player);
            showMessage(`${oldName} → ${newName}`, 'positive');

            if (typeof Particles !== 'undefined') {
                Particles.xpGainBurst(window.innerWidth / 2, window.innerHeight / 2);
            }
        }, 500);
    },

closeChangeName() {

  const popup = document.getElementById('changename-popup');

  if (!popup) {
    document.body.style.overflow = '';
    return;
  }

  // evita doppia chiusura
  if (popup.dataset.closing === '1') return;
  popup.dataset.closing = '1';

  popup.style.animation = 'friendsOut 0.18s ease forwards';

  setTimeout(() => {

    popup.remove();
    document.body.style.overflow = '';

  }, 180);

},
    // Renderizza profilo
    render() {
        const container = document.getElementById('profile-content');
        if (!container) return;

        const player = loadPlayer();
        const records = typeof Records !== 'undefined' ? Records.load() : { maxStreak: 0 };
        const countdown = typeof Records !== 'undefined' ? Records.get90DayCountdown() : { day: 0 };
        const badges = typeof Achievements !== 'undefined' ? Achievements.getCount() : { unlocked: 0, total: 0 };
        const soundOn = typeof SoundSystem !== 'undefined' ? SoundSystem.isEnabled() : false;
        const notifOn = typeof Notifications !== 'undefined' ? Notifications.isEnabled() : false;


        container.innerHTML = `
            <div class="profile-hero">

  <div class="profile-header">
    <div class="profile-avatar">${this.getAvatarEmoji(player.level)}</div>

    <h2 class="profile-player-name" id="profile-name">${player.name || 'Player'}</h2>

    <p class="profile-title">LEVEL ${player.level} — ${player.title}</p>

    <div class="profile-mini-actions">
      <button class="profile-mini-btn" onclick="Profile.changeName()">✏️ MODIFICA</button>

      <button class="profile-mini-btn"
        onclick="if(typeof Friends!=='undefined'){Friends.copyId()}">
        🆔 COPIA ID
      </button>

      <button class="profile-mini-btn"
        onclick="if(typeof Friends!=='undefined'){Friends.open()}">
        👥 AMICI
      </button>
    </div>

    <div class="profile-code-row"
      onclick="if(typeof Friends!=='undefined'){Friends.copyId()}"
      title="Tocca per copiare">
      <span class="profile-code-label">CODICE</span>
      <span class="profile-code-pill">${typeof Friends !== 'undefined' ? Friends.getMyId() : '—'}</span>
    </div>
  </div>

  <div class="profile-stats-grid">

    <div class="profile-stat">
      <span class="ps-big">${player.xp.toLocaleString()}</span>
      <span class="ps-label">XP Totali</span>
    </div>

    <div class="profile-stat">
      <span class="ps-big">${player.reps.toLocaleString()}</span>
      <span class="ps-label">Reps Totali</span>
    </div>

    <div class="profile-stat">
      <span class="ps-big">${player.streak}</span>
      <span class="ps-label">Streak</span>
    </div>

    <div class="profile-stat">
      <span class="ps-big">${records.maxStreak}</span>
      <span class="ps-label">Max Streak</span>
    </div>

    <div class="profile-stat">
      <span class="ps-big">${badges.unlocked}/${badges.total}</span>
      <span class="ps-label">Badge</span>
    </div>

    <div class="profile-stat">
      <span class="ps-big">${countdown.day}/90</span>
      <span class="ps-label">Giorno</span>
    </div>

    <div class="profile-stat clickable" onclick="if(typeof Friends!=='undefined')Friends.open()">
      <span class="ps-big">${typeof Friends !== 'undefined' ? Friends.getCount() : 0}</span>
      <span class="ps-label">Amici</span>
    </div>

  </div>

</div>

            <div class="profile-section">
                <h3>⚙️ IMPOSTAZIONI</h3>
                <div class="profile-option" onclick="Profile.changeName()">
                    <span>✏️ Cambia Nome</span>
                    <span>${player.name || 'Player'}</span>
                </div>
                <div class="profile-option" onclick="Profile.changeProtocolName()">
                    <span>⚡ Nome Protocollo</span>
                    <span>${Storage.load('protocol_name') || 'PROTOX PROTOCOL'}</span>
                </div>
                <div class="profile-option" onclick="if(typeof SoundSystem!=='undefined')SoundSystem.toggle()">
                    <span>🔊 Suoni</span>
                    <span id="sound-status">${soundOn ? 'ON' : 'OFF'}</span>
                </div>
                <div class="profile-option" onclick="if(typeof Notifications!=='undefined')Notifications.toggle()">
                    <span>🔔 Notifiche</span>
                    <span id="notif-status">${notifOn ? 'ON' : 'OFF'}</span>
                </div>
                <div class="profile-option" onclick="if(typeof Friends!=='undefined')Friends.open()">
                    <span>👥 Amici</span>
                    <span>${typeof Friends !== 'undefined' ? Friends.getCount() : 0} amici</span>
                </div>
                <div class="profile-option" onclick="if(typeof Friends!=='undefined')Friends.copyId()">
                    <span>🆔 Il tuo Codice</span>
                    <span>${typeof Friends !== 'undefined' ? Friends.getMyId() : '...'}</span>
                </div>
            </div>

            <div class="profile-section">
                <div class="profile-section-header">
                    <h3>📋 CHANGELOG</h3>
                    <span class="changelog-version-current">v${typeof Changelog !== 'undefined' ? Changelog.getLatestVersion() : '1.0.0'}</span>
                </div>
                <div id="changelog-section"></div>
            </div>

            <div class="profile-danger">
                <button class="danger-btn" onclick="Profile.resetProgress()">🗑️ RESET TOTALE</button>
                <p class="danger-text">Cancella tutti i progressi</p>
            </div>
        `;

        // Render changelog dopo che il DOM è pronto
        setTimeout(() => {
            if (typeof Changelog !== 'undefined') {
                Changelog.render();
            }
        }, 100);
    },

    // Avatar basato su livello
    getAvatarEmoji(level) {
        if (level >= 12) return '🧠';
        if (level >= 9) return '⚡';
        if (level >= 6) return '⚔️';
        if (level >= 3) return '👁️';
        return '👤';
    },

    getMonogram(text) {
  const raw = String(text || '').trim().toUpperCase();
  const clean = raw.replace(/[^A-Z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!clean) return 'PX';

  const parts = clean.split(' ').filter(Boolean);
  const a = parts[0]?.[0] || 'P';
  const b = (parts[1]?.[0] || parts[0]?.[1] || 'X');

  return (a + b).slice(0, 2);
},

    // Reset progresso
    resetProgress() {
        const popup = document.createElement('div');
        popup.id = 'reset-popup';
        popup.innerHTML = `
            <div class="reset-container">
                <div class="reset-icon">⚠️</div>
                <h2>RESET TOTALE</h2>
                <p class="reset-warning">Stai per cancellare TUTTI i tuoi progressi.</p>

                <div class="reset-stats-preview">
                    <div class="reset-stat-row">
                        <span>XP che perderai</span>
                        <span class="reset-stat-value">${loadPlayer().xp.toLocaleString()}</span>
                    </div>
                    <div class="reset-stat-row">
                        <span>Reps che perderai</span>
                        <span class="reset-stat-value">${loadPlayer().reps.toLocaleString()}</span>
                    </div>
                    <div class="reset-stat-row">
                        <span>Streak che perderai</span>
                        <span class="reset-stat-value">${loadPlayer().streak} 🔥</span>
                    </div>
                    <div class="reset-stat-row">
                        <span>Badge che perderai</span>
                        <span class="reset-stat-value">${(typeof Achievements !== 'undefined' ? Achievements.getCount().unlocked : 0)}</span>
                    </div>
                </div>

                <p class="reset-confirm-text">Scrivi <strong>RESET</strong> per confermare</p>
                <input type="text" id="reset-confirm-input" class="reset-input"
                       placeholder="Scrivi RESET..." autocomplete="off" autocapitalize="characters">

                <div class="reset-buttons">
                    <button class="reset-cancel-btn" onclick="Profile.closeReset()">ANNULLA</button>
                    <button class="reset-confirm-btn" id="reset-confirm-btn" onclick="Profile.executeReset()">CANCELLA TUTTO</button>
                </div>

                <p class="reset-final-warning">Questa azione è irreversibile.</p>
            </div>
        `;
        document.body.appendChild(popup);
        document.body.style.overflow = 'hidden';

        // Blocca scroll
        popup.addEventListener('touchmove', e => e.preventDefault(), { passive: false });

        // Abilita bottone solo quando scritto RESET
        const input = document.getElementById('reset-confirm-input');
        const btn = document.getElementById('reset-confirm-btn');

        input.addEventListener('input', () => {
            if (input.value.trim().toUpperCase() === 'RESET') {
                btn.classList.add('enabled');
            } else {
                btn.classList.remove('enabled');
            }
        });
    },

    closeReset() {
        const popup = document.getElementById('reset-popup');
        if (popup) popup.remove();
        document.body.style.overflow = '';
    },

    executeReset() {
        const input = document.getElementById('reset-confirm-input');
        if (!input || input.value.trim().toUpperCase() !== 'RESET') {
            showMessage('Scrivi RESET per confermare', 'warning');
            return;
        }

        // Animazione distruzione
        const container = document.querySelector('.reset-container');
        if (container) {
            container.style.animation = 'resetDestroy 0.5s ease forwards';
        }

        setTimeout(() => {
            Storage.resetAll();
            location.reload();
        }, 600);
    },

changeProtocolName() {

  const popup = document.createElement('div');

  popup.id = 'changename-popup';

  const currentName = Storage.load('protocol_name') || 'PROTOX PROTOCOL';

  popup.innerHTML = `

  <div class="changename-container protocol-rename">

    <div class="changename-header">

      <h2>NOME PROTOCOLLO</h2>

      <button class="changename-close" onclick="Profile.closeProtocolName()">✕</button>

    </div>

    <div class="changename-current">

      <span class="changename-label">NOME ATTUALE</span>

      <span class="changename-value">${currentName}</span>

    </div>

    <!-- NEW: anteprima premium al posto dell’orb -->
    <div class="protocol-preview-card">

      <div class="protocol-preview-top">

        <span class="protocol-preview-kicker">ANTEPRIMA HEADER</span>

      </div>

      <div class="protocol-preview-title" id="protocol-preview-title">${currentName}</div>

      <div class="protocol-preview-sub">Così lo vedrai in alto nell’app.</div>

    </div>

    <div class="changename-field">

      <label>NUOVO NOME</label>

      <input type="text"
        id="protocol-name-input"
        class="changename-input"
        placeholder="Il nome del tuo protocollo..."
        maxlength="25"
        autocomplete="off"
        value=""
        data-current="${currentName}"
        oninput="Profile.checkProtocolName()">

      <div class="changename-charcount">
        <span id="protocol-char-count">0</span>/25
      </div>

    </div>

    <button class="changename-submit disabled" id="protocol-name-btn" onclick="Profile.submitProtocolName()">
      RINOMINA
    </button>

    <p class="changename-note">Questo nome apparirà nell’header dell’app.</p>

  </div>

  `;

  document.body.appendChild(popup);

  document.body.style.overflow = 'hidden';

  setTimeout(() => {

    document.getElementById('protocol-name-input')?.focus();

  }, 300);

},

 checkProtocolName() {

  const input = document.getElementById('protocol-name-input');

  const btn = document.getElementById('protocol-name-btn');

  const counter = document.getElementById('protocol-char-count');

  const preview = document.getElementById('protocol-preview-title');

  if (!input || !btn) return;

  const raw = input.value || '';
  const value = raw.trim();
  const upper = value.toUpperCase();

  if (counter) counter.textContent = raw.length;

  // preview: se vuoto, torna al nome attuale (salvato in data-current)
  if (preview) {
    preview.textContent = upper || (input.dataset.current || 'PROTOX PROTOCOL');
  }

  if (value.length >= 3) {

    btn.classList.remove('disabled');

  } else {

    btn.classList.add('disabled');

  }

},


submitProtocolName() {

  const input = document.getElementById('protocol-name-input');

  if (!input || input.value.trim().length < 3) return;

  const newName = input.value.trim().toUpperCase();

  Storage.save('protocol_name', newName);

  // Aggiorna header
  const header = document.querySelector('#header h1');
  if (header) header.textContent = `⚡ ${newName}`;

  this.closeProtocolName();

  showMessage(`Protocollo rinominato: ${newName}`, 'positive');

  if (typeof Particles !== 'undefined') {
    Particles.xpGainBurst(window.innerWidth / 2, window.innerHeight / 2);
  }

},

closeProtocolName() {

  const popup = document.getElementById('changename-popup');

  if (!popup) {
    document.body.style.overflow = '';
    return;
  }

  if (popup.dataset.closing === '1') return;
  popup.dataset.closing = '1';

  popup.style.animation = 'friendsOut 0.18s ease forwards';

  setTimeout(() => {

    popup.remove();
    document.body.style.overflow = '';

  }, 180);

},
    
};