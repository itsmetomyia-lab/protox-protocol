// ============================================
// PROTOX PROTOCOL - player-stats.js
// Modulo: Core logica giocatore
// Versione: 3.0 - FULL INTEGRATION
// Dipende da: storage.js + tutti i moduli
// ============================================

const LEVELS = [
    { level: 1,  xpRequired: 0,     title: 'NPC' },
    { level: 2,  xpRequired: 500,   title: 'NPC' },
    { level: 3,  xpRequired: 1000,  title: 'Awakened' },
    { level: 4,  xpRequired: 2000,  title: 'Awakened' },
    { level: 5,  xpRequired: 3500,  title: 'Awakened' },
    { level: 6,  xpRequired: 5500,  title: 'Warrior' },
    { level: 7,  xpRequired: 8000,  title: 'Warrior' },
    { level: 8,  xpRequired: 11000, title: 'Warrior' },
    { level: 9,  xpRequired: 15000, title: 'Elite' },
    { level: 10, xpRequired: 20000, title: 'Elite' },
    { level: 11, xpRequired: 27000, title: 'Elite' },
    { level: 12, xpRequired: 35000, title: 'PROTOX MASTER' }
];

// ---- AZIONI CONFIG ----
// ripetibile: true = ogni volta
// ripetibile: false = una volta al giorno
// categoria: per tracking stats
const ACTIONS_CONFIG = {
    // UNA VOLTA AL GIORNO
    workout:     { repeatable: false, category: 'body',  icon: '💪' },
    cold_shower: { repeatable: false, category: 'will',  icon: '🚿' },
    meditation:  { repeatable: false, category: 'soul',  icon: '🧘' },
    sleep:       { repeatable: false, category: 'body',  icon: '😴' },
    wakeup:      { repeatable: false, category: 'will',  icon: '🌅' },

    // RIPETIBILI POSITIVE (puoi fare più sessioni)
    reading:     { repeatable: true,  category: 'mind',  icon: '📚' },
    water:       { repeatable: true,  category: 'body',  icon: '💧' },
    journal:     { repeatable: true,  category: 'mind',  icon: '📝' },
    deep_work:   { repeatable: true,  category: 'mind',  icon: '🎯' },
    stretch:     { repeatable: true,  category: 'body',  icon: '🤸' },
    walk:        { repeatable: true,  category: 'body',  icon: '🚶' },
    gratitude:   { repeatable: true,  category: 'soul',  icon: '🙏' },
    clean_meal:  { repeatable: true,  category: 'body',  icon: '🥗' },

    // RIPETIBILI NEGATIVE
    junk_food:   { repeatable: true,  category: null,    icon: '🍕' },
    doom_scroll: { repeatable: true,  category: null,    icon: '📱' },
    addiction:   { repeatable: true,  category: null,    icon: '💀' },
    skip_workout:{ repeatable: true,  category: null,    icon: '🛋️' },
    late_sleep:  { repeatable: true,  category: null,    icon: '🌃' }
};

// ---- CREA NUOVO GIOCATORE ----
function createNewPlayer() {
    return {
        name: 'Player',
        xp: 0,
        level: 1,
        title: 'NPC',
        reps: 0,
        streak: 0,
        lastActiveDate: null,
        log: [],
        actionsToday: {},
        cleanDays: 0,
        createdAt: Date.now()
    };
}

// ---- CARICA O CREA GIOCATORE ----
function loadPlayer() {
    let player = Storage.load('player');
    if (!player) {
        player = createNewPlayer();
        Storage.save('player', player);
    }
    return player;
}

// ---- CALCOLA LIVELLO DA XP ----
function calculateLevel(xp) {
    let currentLevel = LEVELS[0];
    for (let i = LEVELS.length - 1; i >= 0; i--) {
        if (xp >= LEVELS[i].xpRequired) {
            currentLevel = LEVELS[i];
            break;
        }
    }
    return currentLevel;
}

// ---- XP PER PROSSIMO LIVELLO ----
function getNextLevelXP(currentLevel) {
    const next = LEVELS.find(l => l.level === currentLevel + 1);
    return next ? next.xpRequired : null;
}

// ---- AGGIORNA STREAK ----
function updateStreak(player) {
    const today = new Date().toDateString();
    const lastActive = player.lastActiveDate;

    if (!lastActive) {
        player.streak = 1;
        player.lastActiveDate = today;
        return player;
    }

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayString = yesterday.toDateString();

    if (lastActive === yesterdayString) {
        player.streak += 1;
    } else if (lastActive !== today) {
        player.streak = 1;
    }

    player.lastActiveDate = today;
    return player;
}

// ---- AGGIUNGI / RIMUOVI XP ----
function addXP(amount, reason, category = null) {
    let player = loadPlayer();
    const oldLevel = player.level;

    // Applica moltiplicatore se XP positivo
    let finalAmount = amount;
    if (amount > 0 && typeof XPMultiplier !== 'undefined') {
        const multiplier = XPMultiplier.getCurrent();
        finalAmount = Math.floor(amount * multiplier);
    }

    player.xp += finalAmount;
    if (player.xp < 0) player.xp = 0;

    // Aggiorna livello
    const levelData = calculateLevel(player.xp);
    player.level = levelData.level;
    player.title = levelData.title;

    // Aggiorna streak
    player = updateStreak(player);

    // Log
    const entry = {
        type: amount > 0 ? '+' : '-',
        amount: Math.abs(finalAmount),
        reason: reason,
        time: new Date().toLocaleTimeString()
    };
    player.log.unshift(entry);
    if (player.log.length > 50) player.log.pop();

    // Salva
    Storage.save('player', player);

    // Aggiorna Records
    if (typeof Records !== 'undefined') {
        Records.update(finalAmount, 0, category);
    }

    // Aggiorna UI
    updateUI(player);

    // Suoni
    if (typeof SoundSystem !== 'undefined') {
        if (amount > 0) {
            SoundSystem.playXPGain();
            SoundSystem.vibrate([30]);
        } else {
            SoundSystem.playXPLoss();
            SoundSystem.vibrate([100, 50, 100]);
        }
    }

    // Level up?
    if (player.level > oldLevel) {
        showLevelUp(player.level, player.title);

        // Suono level up
        if (typeof SoundSystem !== 'undefined') {
            SoundSystem.playLevelUp();
            SoundSystem.vibrate([100, 50, 100, 50, 200]);
        }

        // Particelle
        if (typeof Particles !== 'undefined') {
            setTimeout(() => Particles.levelUpExplosion(), 300);
        }
    }

    // Check achievements
    if (typeof Achievements !== 'undefined') {
        setTimeout(() => Achievements.checkAll(), 500);
    }

    // Aggiorna multiplier display
    if (typeof XPMultiplier !== 'undefined') {
        XPMultiplier.render();
    }

    return player;
}

// ---- AZIONE GIORNALIERA ----
function doAction(actionId, xpAmount, repeatable = false) {
    let player = loadPlayer();

    const today = new Date().toDateString();
    if (!player.actionsToday) player.actionsToday = {};
    if (!player.actionsToday[today]) player.actionsToday[today] = {};

    // Controlla config azione
    const config = ACTIONS_CONFIG[actionId];
    const isRepeatable = config ? config.repeatable : repeatable;
    const category = config ? config.category : null;

    // Blocca se non ripetibile e già fatta
    if (!isRepeatable && player.actionsToday[today][actionId]) {
        showMessage('✅ Già fatto oggi!', 'warning');
        if (typeof SoundSystem !== 'undefined') {
            SoundSystem.playClick();
        }
        return;
    }

    // Incrementa contatore
    if (!player.actionsToday[today][actionId]) {
        player.actionsToday[today][actionId] = 0;
    }
    player.actionsToday[today][actionId]++;

    // Aggiorna clean days
    if (xpAmount < 0) {
        player.cleanDays = 0;
    }

    Storage.save('player', player);

    // Particelle sul click
    if (typeof Particles !== 'undefined') {
        const el = event && event.target ? event.target : null;
        if (el) {
            const rect = el.getBoundingClientRect();
            const x = rect.left + rect.width / 2;
            const y = rect.top + rect.height / 2;
            if (xpAmount > 0) {
                Particles.xpGainBurst(x, y);
            } else {
                Particles.xpLossBurst(x, y);
            }
        }
    }

    const reason = actionId.replace(/_/g, ' ');

    // Applica moltiplicatore per mostrare nel messaggio
    let displayXP = xpAmount;
    if (xpAmount > 0 && typeof XPMultiplier !== 'undefined') {
        const mult = XPMultiplier.getCurrent();
        displayXP = Math.floor(xpAmount * mult);
    }

    addXP(xpAmount, reason, category);

    if (xpAmount > 0) {
        showMessage(`+${displayXP} XP — ${reason}`, 'positive');
        markActionDone(actionId);
    } else {
        showMessage(`${xpAmount} XP — ${reason}`, 'negative');
    }
}

// ---- SEGNA AZIONE COME FATTA ----
function markActionDone(actionId) {
    const config = ACTIONS_CONFIG[actionId];
    // Non segnare "done" le azioni ripetibili
    if (config && config.repeatable) return;

    const allActions = document.querySelectorAll('.action-item.positive');
    allActions.forEach(item => {
        const onclick = item.getAttribute('onclick');
        if (onclick && onclick.includes(`'${actionId}'`)) {
            item.classList.add('done');
        }
    });
}

// ---- CONTROLLA AZIONI GIÀ FATTE OGGI ----
function checkTodayActions() {
    const player = loadPlayer();
    const today = new Date().toDateString();
    if (!player.actionsToday || !player.actionsToday[today]) return;

    const doneToday = player.actionsToday[today];
    Object.keys(doneToday).forEach(actionId => {
        const config = ACTIONS_CONFIG[actionId];
        if (config && !config.repeatable) {
            markActionDone(actionId);
        }
    });
}

// ---- AGGIORNA TUTTA LA UI HOME ----
function updateUI(player) {
    // Stats principali
    const xpEl = document.getElementById('xp-display');
    const streakEl = document.getElementById('streak-display');
    const repsEl = document.getElementById('reps-display');
    const levelEl = document.getElementById('player-level');

    if (xpEl) xpEl.textContent = player.xp.toLocaleString();
    if (streakEl) streakEl.textContent = player.streak + ' 🔥';
    if (repsEl) repsEl.textContent = player.reps.toLocaleString();
    if (levelEl) levelEl.textContent = `LEVEL ${player.level} — ${player.title}`;

        // Protocol name
    const protocolName = Storage.load('protocol_name') || 'PROTOX PROTOCOL';
    const headerH1 = document.querySelector('#header h1');
    if (headerH1) headerH1.textContent = `⚡ ${protocolName}`;

    // XP Bar
    const nextLevelXP = getNextLevelXP(player.level);
    const currentLevelXP = LEVELS.find(l => l.level === player.level)?.xpRequired || 0;
    const xpBarFill = document.getElementById('xp-bar-fill');
    const xpBarText = document.getElementById('xp-bar-text');

    if (xpBarFill && xpBarText) {
        if (nextLevelXP) {
            const progress = ((player.xp - currentLevelXP) / (nextLevelXP - currentLevelXP)) * 100;
            xpBarFill.style.width = Math.min(progress, 100) + '%';
            xpBarText.textContent = `${player.xp.toLocaleString()} / ${nextLevelXP.toLocaleString()} XP`;
        } else {
            xpBarFill.style.width = '100%';
            xpBarText.textContent = 'MAX LEVEL ⚡';
        }
    }

    // Reps bar
    const repsProgress = (player.reps / 100000) * 100;
    const protoxFill = document.getElementById('protox-bar-fill');
    const repsTotal = document.getElementById('reps-total');
    if (protoxFill) protoxFill.style.width = repsProgress + '%';
    if (repsTotal) repsTotal.textContent = `${player.reps.toLocaleString()} / 100,000 REPS`;

        // Log azioni
    const logContainer = document.getElementById('action-log');
    if (logContainer) {
        logContainer.innerHTML = '';

        if (player.log.length === 0) {
            logContainer.innerHTML = '<div class="log-empty">Nessuna attività ancora</div>';
        }

        player.log.forEach(entry => {
            const config = ACTIONS_CONFIG[entry.reason.replace(/ /g, '_')] || {};
            const icon = config.icon || (entry.type === '+' ? '✅' : '❌');

            const div = document.createElement('div');
            div.className = `log-card ${entry.type === '+' ? 'log-positive' : 'log-negative'}`;
            div.innerHTML = `
                <div class="log-card-left">
                    <span class="log-card-icon">${icon}</span>
                    <div class="log-card-info">
                        <span class="log-card-reason">${entry.reason}</span>
                        <span class="log-card-time">${entry.time}</span>
                    </div>
                </div>
                <span class="log-card-xp">${entry.type}${entry.amount}</span>
            `;
            logContainer.appendChild(div);
        });
    }
    // Protox stats aggiuntive
    if (typeof ProtoxTracker !== 'undefined') {
        ProtoxTracker.updateDisplay();
    }

    // Multiplier
    if (typeof XPMultiplier !== 'undefined') {
        XPMultiplier.render();
    }

    // Profile name
    const nameEl = document.getElementById('profile-name-header');
    if (nameEl) nameEl.textContent = player.name || 'Player';
}

// ---- LEVEL UP POPUP ----
function showLevelUp(level, title) {
    const popup = document.getElementById('levelup-popup');
    const text = document.getElementById('levelup-text');
    if (popup) popup.classList.remove('hidden');
    if (text) text.textContent = `Sei ora Level ${level} — ${title}`;
}

function closeLevelUp() {
    const popup = document.getElementById('levelup-popup');
    if (popup) popup.classList.add('hidden');
}

// ---- FLASH MESSAGE ----
function showMessage(text, type) {
    // Rimuovi messaggi esistenti
    const existing = document.querySelectorAll('.flash-message');
    existing.forEach(m => m.remove());

    const msg = document.createElement('div');
    msg.className = `flash-message flash-${type}`;
    msg.textContent = text;
    document.body.appendChild(msg);
    setTimeout(() => {
        if (msg.parentNode) msg.remove();
    }, 2000);
}

function openColorPicker() {
    const picker = document.getElementById('custom-color-picker');
    if (!picker) return;

    // iOS fix: creiamo un nuovo input ogni volta
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

    if (isIOS) {
        const tempPicker = document.createElement('input');
        tempPicker.type = 'color';
        tempPicker.value = picker.value;
        tempPicker.style.cssText = 'position:fixed;top:-100px;left:-100px;opacity:0;';
        document.body.appendChild(tempPicker);

        tempPicker.addEventListener('input', (e) => {
            applyCustomColor(e.target.value);
            picker.value = e.target.value;
        });

        tempPicker.addEventListener('change', (e) => {
            applyCustomColor(e.target.value);
            picker.value = e.target.value;
            setTimeout(() => tempPicker.remove(), 100);
        });

        tempPicker.click();
    } else {
        picker.click();
    }
}

// ---- THEME SYSTEM ----
function setTheme(theme) {

  const palette = {
    purple: '#8b5cf6',
    red: '#ef4444',
    blue: '#3b82f6',
    green: '#10b981',
    gold: '#f59e0b'
  };

  const hex = palette[theme] || palette.purple;

  // reset classi (le lasciamo per compat, ma la verità sono le CSS vars)
  document.body.classList.remove('theme-red','theme-blue','theme-green','theme-gold','theme-custom');

  // calcola varianti
  const dark = adjustColor(hex, -30);
  const glow = hexToRGBA(hex, 0.40);
  const border = hexToRGBA(hex, 0.20);

  const repsColor = adjustColor(hex, 20);

  // soft layers per UI (niente verde morto)
  const soft = hexToRGBA(hex, 0.06);
  const soft2 = hexToRGBA(hex, 0.12);
  const borderStrong = hexToRGBA(hex, 0.45);

  // applica vars
  document.documentElement.style.setProperty('--purple-main', hex);
  document.documentElement.style.setProperty('--purple-dark', dark);
  document.documentElement.style.setProperty('--purple-glow', glow);
  document.documentElement.style.setProperty('--border', border);

  // “green-xp” diventa semplicemente accent-lite (non verde)
  document.documentElement.style.setProperty('--green-xp', repsColor);

  // extra vars (usate per eliminare hardcode verde nei background)
  document.documentElement.style.setProperty('--accent-soft', soft);
  document.documentElement.style.setProperty('--accent-soft2', soft2);
  document.documentElement.style.setProperty('--accent-border-strong', borderStrong);

  // background coerente col tema
  document.body.style.backgroundImage = `
    radial-gradient(ellipse at top, ${hexToRGBA(hex, 0.15)} 0%, transparent 60%),
    radial-gradient(ellipse at bottom, ${hexToRGBA(repsColor, 0.05)} 0%, transparent 60%)
  `;

  // Aggiorna bottoni attivi
  document.querySelectorAll('.theme-btn').forEach(btn => btn.classList.remove('active'));
  const activeBtn = document.getElementById('theme-' + theme);
  if (activeBtn) activeBtn.classList.add('active');

  Storage.save('theme', theme);
  Storage.save('customColor', null);

  // IMPORTANT: se SHADES è attivo, ricalcola subito le shade vars
  if (typeof DarkLight !== 'undefined' && typeof DarkLight.onThemeChange === 'function') {
    DarkLight.onThemeChange();
  }
}

function applyCustomColor(hex) {
    // Rimuovi temi predefiniti
    document.body.classList.remove(
        'theme-red', 'theme-blue', 'theme-green', 'theme-gold'
    );
    document.body.classList.add('theme-custom');

    // Calcola varianti del colore
    const dark = adjustColor(hex, -30);
    const glow = hexToRGBA(hex, 0.4);
    const border = hexToRGBA(hex, 0.2);
    const repsColor = adjustColor(hex, 20);

    // Applica
    document.documentElement.style.setProperty('--purple-main', hex);
    document.documentElement.style.setProperty('--purple-dark', dark);
    document.documentElement.style.setProperty('--purple-glow', glow);
    document.documentElement.style.setProperty('--border', border);
    document.documentElement.style.setProperty('--green-xp', repsColor);
    // extra vars “premium”
    document.documentElement.style.setProperty('--accent-soft', hexToRGBA(hex, 0.06));
    document.documentElement.style.setProperty('--accent-soft2', hexToRGBA(hex, 0.12));
    document.documentElement.style.setProperty('--accent-border-strong', hexToRGBA(hex, 0.45));

    // Aggiorna background
    document.body.style.backgroundImage = `
        radial-gradient(ellipse at top, ${hexToRGBA(hex, 0.15)} 0%, transparent 60%),
        radial-gradient(ellipse at bottom, ${hexToRGBA(repsColor, 0.05)} 0%, transparent 60%)
    `;

    // Aggiorna bottoni attivi
    document.querySelectorAll('.theme-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.getElementById('theme-custom').classList.add('active');

    // Aggiorna il dot del custom picker
    const customDot = document.querySelector('.custom-dot');
    if (customDot) {
        customDot.style.background = hex;
        customDot.textContent = '';
    }

    // Salva
    Storage.save('theme', 'custom');
    Storage.save('customColor', hex);
}

function loadTheme() {
    const savedTheme = Storage.load('theme');
    const customColor = Storage.load('customColor');

    if (savedTheme === 'custom' && customColor) {
        applyCustomColor(customColor);
        const picker = document.getElementById('custom-color-picker');
        if (picker) picker.value = customColor;
    } else if (savedTheme) {
        setTheme(savedTheme);
    }
}

// Utility: scurisci/schiarisci colore
function adjustColor(hex, amount) {
    hex = hex.replace('#', '');
    let r = parseInt(hex.substring(0, 2), 16);
    let g = parseInt(hex.substring(2, 4), 16);
    let b = parseInt(hex.substring(4, 6), 16);

    r = Math.max(0, Math.min(255, r + amount));
    g = Math.max(0, Math.min(255, g + amount));
    b = Math.max(0, Math.min(255, b + amount));

    return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
}

// Utility: hex a rgba
function hexToRGBA(hex, alpha) {
    hex = hex.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// ---- INIT ----
window.onload = function() {

    // PWA theme
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) metaTheme.setAttribute('content', '#080810');

    // Init audio
    if (typeof SoundSystem !== 'undefined') {
        SoundSystem.init();
    }

        // Init Feedback/EmailJS
    if (typeof Feedback !== 'undefined') {
        Feedback.init();
    }

    // Dark/Light mode
    if (typeof DarkLight !== 'undefined') {
        DarkLight.init();
    }

    // Prima volta? Mostra onboarding
    if (typeof Profile !== 'undefined' && Profile.isFirstTime()) {
        Profile.showOnboarding();
        return;
    }

    // Carica giocatore
    const player = loadPlayer();

    // Reset giornaliero
    if (typeof DailyReset !== 'undefined') {
        DailyReset.check();
    }

    // Init navigazione
    if (typeof Navigation !== 'undefined') {
        Navigation.init();
    }

        // Check changelog
    if (typeof Changelog !== 'undefined') {
        Changelog.checkOnLoad();
    }

        // Render azioni
    if (typeof CustomActions !== 'undefined') {
        CustomActions.renderHome();
    }
    // UI
    updateUI(player);
    checkTodayActions();
    loadTheme();

    // Notifiche
    if (typeof Notifications !== 'undefined' && Notifications.isEnabled()) {
        Notifications.scheduleReminders();
    }

    console.log('⚡ PROTOX PROTOCOL v3.0 inizializzato');
};