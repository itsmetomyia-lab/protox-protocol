// ============================================
// PROTOX PROTOCOL - dark-light.js
// Modulo: Shades toggle (NO SHADES <-> SHADES)
// Versione: 2.0
// Dipende da: storage.js
// ============================================

const DarkLight = {

  // stato
isShadesMode() {
  try {
    // default: ON
    // diventa OFF solo se l'utente lo spegne (shades_mode === false)
    return Storage.load('shades_mode') !== false;
  } catch {
    return true;
  }
},

  toggle() {

    const on = this.isShadesMode();

    try {
      Storage.save('shades_mode', !on);
    } catch {}

    this.apply();

    // zero spiegoni, solo vibe
    if (typeof showMessage === 'function') {
      showMessage(!on ? '🎨 SHADES' : '◻️ FLAT', 'positive');
    }
  },

  apply() {

    const on = this.isShadesMode();

    // toggle classe
    if (on) document.body.classList.add('shades-mode');
    else document.body.classList.remove('shades-mode');

    // aggiorna icona
    const toggleIcon = document.getElementById('darklight-icon');
    if (toggleIcon) toggleIcon.textContent = on ? '🎨' : '◻️';

    // calcola sempre le variabili shade (così se accendi è instant)
    this._computeShadeVars();
  },

  // chiamala quando cambia tema (setTheme/applyCustomColor)
  onThemeChange() {
    this._computeShadeVars();
  },

  _computeShadeVars() {

    const rootStyle = getComputedStyle(document.documentElement);
    const accentRaw = (rootStyle.getPropertyValue('--purple-main') || '').trim();

    const accentHex = this._toHex(accentRaw) || '#8b5cf6';

    // base palette (dark UI)
    const baseCard  = '#0f0f1a';
    const baseCard2 = '#13131f';
    const baseInput = '#0a0a16';

    // mix più “vivo” quando sei in shades-mode (noi calcoliamo comunque)
    const bgCard  = this._mixHex(baseCard,  accentHex, 0.16);
    const bgCard2 = this._mixHex(baseCard2, accentHex, 0.18);
    const bgInput = this._mixHex(baseInput, accentHex, 0.14);

    // glow/border/veil (queste danno la sensazione premium)
    const borderShade  = this._hexToRGBA(accentHex, 0.28);
    const glowShade    = this._hexToRGBA(accentHex, 0.55);

    const softShade    = this._hexToRGBA(accentHex, 0.10);
    const soft2Shade   = this._hexToRGBA(accentHex, 0.18);
    const borderStrong = this._hexToRGBA(accentHex, 0.55);

    // scrivi “shade vars” (CSS le usa SOLO quando .shades-mode è attivo)
    document.documentElement.style.setProperty('--bg-card-shade', bgCard);
    document.documentElement.style.setProperty('--bg-card2-shade', bgCard2);
    document.documentElement.style.setProperty('--bg-input-shade', bgInput);

    document.documentElement.style.setProperty('--border-shade', borderShade);
    document.documentElement.style.setProperty('--purple-glow-shade', glowShade);

    document.documentElement.style.setProperty('--accent-soft-shade', softShade);
    document.documentElement.style.setProperty('--accent-soft2-shade', soft2Shade);
    document.documentElement.style.setProperty('--accent-border-strong-shade', borderStrong);
  },

  _toHex(color) {
    if (!color) return null;

    // già hex
    if (color.startsWith('#')) return color;

    // rgb(...) / rgba(...)
    const m = color.match(/rgba?\((\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
    if (!m) return null;

    const r = parseInt(m[1], 10);
    const g = parseInt(m[2], 10);
    const b = parseInt(m[3], 10);

    const to2 = (n) => Math.max(0, Math.min(255, n)).toString(16).padStart(2, '0');
    return `#${to2(r)}${to2(g)}${to2(b)}`;
  },

  _mixHex(a, b, t) {
    const A = a.replace('#','');
    const B = b.replace('#','');

    const ar = parseInt(A.slice(0,2), 16);
    const ag = parseInt(A.slice(2,4), 16);
    const ab = parseInt(A.slice(4,6), 16);

    const br = parseInt(B.slice(0,2), 16);
    const bg = parseInt(B.slice(2,4), 16);
    const bb = parseInt(B.slice(4,6), 16);

    const rr = Math.round(ar + (br - ar) * t);
    const rg = Math.round(ag + (bg - ag) * t);
    const rb = Math.round(ab + (bb - ab) * t);

    const to2 = (n) => Math.max(0, Math.min(255, n)).toString(16).padStart(2, '0');
    return `#${to2(rr)}${to2(rg)}${to2(rb)}`;
  },

  _hexToRGBA(hex, alpha) {
    hex = hex.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  },

  init() {
    this.apply();
  }

};