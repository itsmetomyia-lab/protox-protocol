// ============================================
// PROTOX PROTOCOL - friends.js
// Sistema amicizie REALE (Supabase Auth + Postgres)
// Dipende da: storage.js, auth.js, cloud-sync.js (opzionale)
// ============================================

const Friends = {
_state: {
  loading: false,
  view: 'list', // list | friend
  myProfile: null,

  friends: [],
  incoming: [],
  outgoing: [],

  invitesIncoming: [],
  invitesOutgoing: [],

  friendProfile: null,

  // UI invite modal
  inviteActivity: 'party'
},

  // Compat: Profile.render() lo usa già
  getMyId() {
    // se loggato: friend_code cache
    const code = Storage.load('friend_code');
    if (code) return code;

    // fallback vecchio placeholder locale (così non rompi nulla se non configuri Supabase)
    let local = Storage.load('user_id');
    if (!local) {
      local = this._generateLocalId();
      Storage.save('user_id', local);
    }
    return local;
  },

  getCount() {
    const cached = Storage.load('friends_cache');
    return Array.isArray(cached) ? cached.length : 0;
  },

  _generateLocalId() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let id = 'PX-';
    for (let i = 0; i < 8; i++) id += chars.charAt(Math.floor(Math.random() * chars.length));
    return id;
  },

open() {

  const existing = document.getElementById('friends-overlay');
  if (existing) existing.remove();

  if (!this._state) this._state = {};
  if (!this._state.tab) this._state.tab = 'friends';
  if (!this._state.view) this._state.view = 'list';

  const overlay = document.createElement('div');
  overlay.id = 'friends-overlay';

  overlay.innerHTML = `
    <div id="friends-panel">
      <div class="friends-header">
        <div class="friends-title">
          <h2>AMICI</h2>
          <p class="friends-subtitle">Protox network: richieste, stats, squad</p>
        </div>
        <button class="friends-icon-btn" onclick="Friends.close()">✕</button>
      </div>
      <div id="friends-content"></div>
    </div>
  `;

  // click fuori = chiude
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) this.close();
  });

document.body.appendChild(overlay);
document.body.style.overflow = 'hidden';

// 1 frame per permettere al browser di “pitturare” lo stato iniziale
requestAnimationFrame(() => {

  overlay.classList.add('friends-in');

  // render al frame dopo (ok), ma refresh lo facciamo DOPO il pop-in del pannello
  requestAnimationFrame(() => {

    this.render();

    this._ensureInviteRealtime();
    this._ensureCollabRealtime();

    const panel = overlay.querySelector('#friends-panel');

    const reduced = window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const kickRefresh = () => {
      const ov = document.getElementById('friends-overlay');

      // se nel frattempo hai chiuso o stai chiudendo, non refreshare
      if (!ov) return;
      if ((ov.style.animation || '').includes('friendsOut')) return;

      this.refresh();
    };

    // Se reduce motion, l’animazione può essere disattivata (quindi niente animationend): refresh subito
    if (reduced || !panel) {
      kickRefresh();
      return;
    }

    // Aspetta la fine dell’animazione di ingresso del pannello (friendsPanelIn)
    panel.addEventListener('animationend', (e) => {
      if (e.animationName === 'friendsPanelIn') kickRefresh();
    }, { once: true });

    // Fallback safety (nel caso l’event non arrivi)
    setTimeout(kickRefresh, 420);

  });

});
},

close() {
  const overlay = document.getElementById('friends-overlay');
  if (!overlay) return;

  overlay.style.animation = 'friendsOut 0.18s ease forwards';
  setTimeout(() => {
    this._teardownCollabRealtime();
    overlay.remove();
    document.body.style.overflow = '';
  }, 180);
},

setTab(tab) {
  this._state.tab = tab;
  this.render();
},

  copyId() {
    const id = this.getMyId();
    navigator.clipboard.writeText(id).then(() => {
      showMessage('Codice copiato!', 'positive');
    }).catch(() => {
      const input = document.createElement('input');
      input.value = id;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      input.remove();
      showMessage('Codice copiato!', 'positive');
    });
  },

async refresh() {
  // evita refresh sovrapposti che possono lasciare loading appeso
  if (this._state.refreshBusy) return;
this._state.refreshBusy = true;

const keepFocus = this._isAddInputFocused();

this._state.loading = true;

if (!keepFocus) this.render();
else this._state._deferredRender = true;

  // safety: se qualcosa resta appeso (mobile/cambio rete), sblocca comunque UI
  const safety = setTimeout(() => {
    if (this._state.loading) {
      this._state.loading = false;
      this._state.refreshBusy = false;
      this.render();
    }
  }, 12000);

  try {
    // Se Auth/Supabase non disponibile -> stop pulito
    if (typeof Auth === 'undefined' || !Auth.client()) return;

    // Se non loggato -> stop pulito
    if (!Auth.isLoggedIn()) return;

    // Sync stats (opzionale)
    if (typeof CloudSync !== 'undefined') {
      CloudSync.pushMyStats(false);
    }

    const client = Auth.client();
    const uid = Auth.userId();
    if (!uid) return;

    // 1) mio profilo
    const { data: myProfile, error: meErr } = await client
      .from('profiles')
      .select('id, username, friend_code, level, xp, reps, streak')
      .eq('id', uid)
      .single();

    if (meErr) {
      console.warn('Friends.refresh: profilo error:', meErr.message);
    } else {
      this._state.myProfile = myProfile;
      if (myProfile?.friend_code) Storage.save('friend_code', myProfile.friend_code);
    }

    // 2) richieste incoming/outgoing
    const [incomingRes, outgoingRes] = await Promise.all([
      client.from('friend_requests')
        .select('id, from_id, to_id, status, created_at')
        .eq('to_id', uid)
        .eq('status', 'pending')
        .order('created_at', { ascending: false }),

      client.from('friend_requests')
        .select('id, from_id, to_id, status, created_at')
        .eq('from_id', uid)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
    ]);

    const incoming = incomingRes.data || [];
    const outgoing = outgoingRes.data || [];

    // 2b) inviti (pending)
const [invInRes, invOutRes] = await Promise.all([
  client.from('friend_invites')
    .select('id, from_id, to_id, activity_type, created_at')
    .eq('to_id', uid)
    .eq('status', 'pending')
    .order('created_at', { ascending: false }),

  client.from('friend_invites')
    .select('id, from_id, to_id, activity_type, created_at')
    .eq('from_id', uid)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
]);

const invIn = invInRes.data || [];
const invOut = invOutRes.data || [];

    // 3) amicizie
    const { data: frRows, error: frErr } = await client
      .from('friendships')
      .select('user_a, user_b, created_at')
      .or(`user_a.eq.${uid},user_b.eq.${uid}`)
      .order('created_at', { ascending: false });

    if (frErr) console.warn('Friends.refresh: friendships error:', frErr.message);

    const friendIds = (frRows || []).map(r => (r.user_a === uid ? r.user_b : r.user_a));
    const incomingIds = incoming.map(r => r.from_id);
    const outgoingIds = outgoing.map(r => r.to_id);
    const invitesIncomingIds = invIn.map(r => r.from_id);
    const invitesOutgoingIds = invOut.map(r => r.to_id);

    const idsToFetch = Array.from(
      new Set([
  ...friendIds,
  ...incomingIds,
  ...outgoingIds,
  ...invitesIncomingIds,
  ...invitesOutgoingIds
].filter(Boolean))
    );

    // 4) profili coinvolti
    let profilesById = {};
    if (idsToFetch.length) {
      const { data: profs, error: pErr } = await client
        .from('profiles')
        .select('id, username, friend_code, level, xp, reps, streak')
        .in('id', idsToFetch);

      if (pErr) console.warn('Friends.refresh: profiles batch error:', pErr.message);

      (profs || []).forEach(p => { profilesById[p.id] = p; });
    }

    // 5) modelli UI
    const friends = friendIds.map(id => profilesById[id]).filter(Boolean);

    const incomingUI = incoming.map(r => ({
      id: r.id,
      from: profilesById[r.from_id] || { id: r.from_id, username: 'Sconosciuto', friend_code: '—' },
      created_at: r.created_at
    }));

    const outgoingUI = outgoing.map(r => ({
      id: r.id,
      to: profilesById[r.to_id] || { id: r.to_id, username: 'Sconosciuto', friend_code: '—' },
      created_at: r.created_at
    }));

const invitesIncomingUI = invIn.map(r => ({
  id: r.id,
  from: profilesById[r.from_id] || { id: r.from_id, username: 'Sconosciuto', friend_code: '—' },
  activity_type: r.activity_type,
  label: this._inviteLabel(r.activity_type),
  created_at: r.created_at
}));

const invitesOutgoingUI = invOut.map(r => ({
  id: r.id,
  to: profilesById[r.to_id] || { id: r.to_id, username: 'Sconosciuto', friend_code: '—' },
  activity_type: r.activity_type,
  label: this._inviteLabel(r.activity_type),
  created_at: r.created_at
}));

    this._state.friends = friends;
    this._state.incoming = incomingUI;
    this._state.outgoing = outgoingUI;
    this._state.invitesIncoming = invitesIncomingUI;
    this._state.invitesOutgoing = invitesOutgoingUI;

    Storage.save('friends_cache', friends);
  } catch (e) {
    console.error('Friends.refresh error:', e);
    if (typeof showMessage !== 'undefined') showMessage('Sync error (controlla rete)', 'warning');
  } finally {
clearTimeout(safety);

this._state.loading = false;
this._state.refreshBusy = false;

if (this._isAddInputFocused()) {
  this._state._deferredRender = true;
} else {
  this.render();
}
  }
},

render() {
  const content = document.getElementById('friends-content');
  if (!content) return;

  // fallback
  if (typeof Auth === 'undefined' || !Auth.client()) {
    content.innerHTML = `
      <div class="section-card">
        <div class="section-card-header">
          <h3>BACKEND</h3>
        </div>
        <p class="friends-subtitle">Configura <b>modules/supabase-config.js</b> (url + anonKey).</p>
        <div class="friends-topbar" style="margin-top:12px">
          <div class="friends-code">
            <div class="friends-code-pill">${this.getMyId()}</div>
          </div>
          <button class="manual-btn" onclick="Friends.copyId()">COPIA</button>
        </div>
      </div>
    `;
    return;
  }

  // NOT LOGGED
  if (!Auth.isLoggedIn()) {
    content.innerHTML = `
      <div class="section-card">
        <div class="section-card-header">
          <h3>ACCESSO</h3>
        </div>

        <label class="friends-meta" style="display:block; margin:10px 0 6px">EMAIL</label>
        <input id="auth-email" type="email" class="manual-input" placeholder="you@email.com" autocomplete="email"/>

        <label class="friends-meta" style="display:block; margin:10px 0 6px">PASSWORD</label>
        <div style="display:flex; gap:10px; align-items:center">
          <input id="auth-pass" type="password" class="manual-input" placeholder="••••••••" autocomplete="current-password" style="flex:1; margin:0"/>
          <button id="toggle-pass-btn" class="manual-btn" onclick="Friends.togglePassword()">MOSTRA</button>
        </div>

        <div style="display:flex; gap:10px; margin-top:12px">
          <button class="manual-btn" style="flex:1" onclick="Friends._login()">LOGIN</button>
          <button class="manual-btn" style="flex:1" onclick="Friends._signup()">SIGN UP</button>
        </div>

        <p class="friends-subtitle" style="margin-top:10px">
          Login = friend code cloud + amicizie vere + stats condivise.
        </p>
      </div>
    `;
    return;
  }

  // FRIEND PROFILE VIEW
  if (this._state?.view === 'friend' && this._state.friendProfile) {
    const f = this._state.friendProfile;

    content.innerHTML = `
      <div class="friends-topbar">
        <div class="friends-code">
          <div>
            <div class="friends-name" style="font-size:1.05rem">${f.username || 'Player'}</div>
            <div class="friends-meta">${f.friend_code || ''}</div>
          </div>
        </div>
        <button class="manual-btn" onclick="Friends._backToList()">←</button>
      </div>

      <div class="friends-stat-grid">
        <div class="friends-stat"><div class="label">LEVEL</div><div class="value">${(f.level ?? 1)}</div></div>
        <div class="friends-stat"><div class="label">STREAK</div><div class="value">${(f.streak ?? 0)}</div></div>
        <div class="friends-stat"><div class="label">XP</div><div class="value">${(f.xp ?? 0).toLocaleString()}</div></div>
        <div class="friends-stat"><div class="label">REPS</div><div class="value">${(f.reps ?? 0).toLocaleString()}</div></div>
      </div>

      <div style="margin-top:12px">
        <button class="manual-btn" style="width:100%" onclick="Friends.removeFriend('${f.id}')">RIMUOVI AMICO</button>
      </div>
    `;
    return;
  }

  // LOGGED LIST VIEW
  const myCode = this.getMyId();
  const tab = this._state.tab || 'friends';

  content.innerHTML = `
    <div class="friends-topbar">
      <div class="friends-code">
        <div class="friends-code-pill">${myCode}</div>
        <button class="manual-btn" onclick="Friends.copyId()">COPIA</button>
      </div>
      <button class="manual-btn" onclick="Auth.signOut().then(()=>{showMessage('Logout', 'warning'); Friends.refresh();})">LOGOUT</button>
    </div>

    <div class="friends-tabs">
      <button class="friends-tab ${tab==='friends'?'active':''}" onclick="Friends.setTab('friends')">
        AMICI <span class="friends-badge">${this._state.friends.length}</span>
      </button>
      <button class="friends-tab ${tab==='incoming'?'active':''}" onclick="Friends.setTab('incoming')">
        RICHIESTE <span class="friends-badge">${this._state.incoming.length}</span>
      </button>
      <button class="friends-tab ${tab==='invites'?'active':''}" onclick="Friends.setTab('invites')">
        INVITI <span class="friends-badge">${this._state.invitesIncoming.length}</span>
      </button>
      <button class="friends-tab ${tab==='add'?'active':''}" onclick="Friends.setTab('add')">
        AGGIUNGI <span class="friends-badge">${this._state.outgoing.length}</span>
      </button>
    </div>

    ${
      tab === 'add' ? `
        <div class="section-card" style="margin-top:12px">
          <div class="section-card-header">
            <h3>INVIA RICHIESTA</h3>
          </div>
          <div style="display:flex; gap:10px; align-items:center">
<input
  id="friend-id-input"
  class="manual-input"
  placeholder="PX-........"
  autocomplete="off"
  autocapitalize="characters"
  autocorrect="off"
  spellcheck="false"
  inputmode="text"
  value="${this._state.addDraft || ''}"
  oninput="Friends._setAddDraft(this.value)"
  onkeydown="Friends._onAddKey(event)"
  onblur="Friends._onAddBlur()"
  style="flex:1; margin:0"
/>

<button id="friend-send-btn" class="manual-btn" onclick="Friends.sendRequest()">INVIA</button>
          </div>

          <div class="friends-list">
            ${(this._state.outgoing.length === 0) ? `<div class="friends-subtitle">Nessuna richiesta inviata.</div>` : ``}
            ${this._state.outgoing.map(r => `
              <div class="friends-item">
                <div class="friends-left">
                  <div class="friends-name">${r.to.username || 'Player'}</div>
                  <div class="friends-meta">${r.to.friend_code || ''}</div>
                </div>
                <div class="friends-right">
                  <button class="manual-btn" onclick="Friends.cancelRequest('${r.id}')">ANNULLA</button>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      ` 
      
      
      : tab === 'invites' ? `
  <div class="section-card" style="margin-top:12px">
    <div class="section-card-header">
      <h3>INVITI</h3>
    </div>

    <p class="friends-subtitle">IN ARRIVO</p>
    <div class="friends-list">
      ${(this._state.invitesIncoming.length === 0) ? `<div class="friends-subtitle">Nessun invito.</div>` : ``}
      ${this._state.invitesIncoming.map(i => `
        <div class="friends-item">
          <div class="friends-left">
            <div class="friends-name">${i.from.username || 'Player'}</div>
            <div class="friends-meta">${i.label}</div>
          </div>
          <div class="friends-right">
            <button class="manual-btn" onclick="Friends.acceptInvite('${i.id}')">OK</button>
            <button class="manual-btn" onclick="Friends.declineInvite('${i.id}')">NO</button>
          </div>
        </div>
      `).join('')}
    </div>

    <p class="friends-subtitle" style="margin-top:12px">INVIATI</p>
    <div class="friends-list">
      ${(this._state.invitesOutgoing.length === 0) ? `<div class="friends-subtitle">Nessun invito inviato.</div>` : ``}
      ${this._state.invitesOutgoing.map(i => `
        <div class="friends-item">
          <div class="friends-left">
            <div class="friends-name">${i.to.username || 'Player'}</div>
            <div class="friends-meta">${i.label}</div>
          </div>
          <div class="friends-right">
            <button class="manual-btn" onclick="Friends.cancelInvite('${i.id}')">ANNULLA</button>
          </div>
        </div>
      `).join('')}
    </div>
  </div>
` : tab === 'incoming' ? `
        <div class="section-card" style="margin-top:12px">
          <div class="section-card-header">
            <h3>RICHIESTE IN ARRIVO</h3>
          </div>

          <div class="friends-list">
            ${(this._state.incoming.length === 0) ? `<div class="friends-subtitle">Nessuna richiesta.</div>` : ``}
            ${this._state.incoming.map(r => `
              <div class="friends-item">
                <div class="friends-left">
                  <div class="friends-name">${r.from.username || 'Player'}</div>
                  <div class="friends-meta">${r.from.friend_code || ''}</div>
                </div>
                <div class="friends-right">
                  <button class="manual-btn" onclick="Friends.acceptRequest('${r.id}','${r.from.id}')">OK</button>
                  <button class="manual-btn" onclick="Friends.rejectRequest('${r.id}')">NO</button>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
        
      ` : `
        <div class="section-card" style="margin-top:12px">
          <div class="section-card-header">
            <h3>LISTA AMICI</h3>
          </div>

          <div class="friends-list">
            ${(this._state.friends.length === 0) ? `<div class="friends-subtitle">Nessun amico ancora.</div>` : ``}
            ${this._state.friends.map(f => `
              <div class="friends-item clickable" onclick="Friends.openFriendHub('${f.id}')">
                <div class="friends-left">
                  <div class="friends-name">${f.username || 'Player'}</div>
                  <div class="friends-meta">${f.friend_code || ''}</div>
                </div>
                <div class="friends-right">
                  <div class="friends-meta">Lv.${f.level ?? 1}</div>
                </div>
              </div>
            `).join('')}
          </div>

          ${this._state.loading ? `<div class="friends-subtitle" style="margin-top:10px">Sync in corso...</div>` : ``}
        </div>
      `
    }
  `;
},


confirmPopup({ title = 'CONFERMA', message = '', okText = 'OK', cancelText = 'ANNULLA', danger = false } = {}) {
  return new Promise((resolve) => {
    // evita doppioni
    const existing = document.getElementById('friends-confirm-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'friends-confirm-overlay';

    overlay.innerHTML = `
      <div class="friends-confirm-card" role="dialog" aria-modal="true">
        <div class="friends-confirm-head">
          <h3 class="friends-confirm-title">${title}</h3>
        </div>
        <div class="friends-confirm-body">${message}</div>
        <div class="friends-confirm-actions">
          <button class="manual-btn friends-btn-ghost" id="friends-confirm-cancel">${cancelText}</button>
          <button class="manual-btn ${danger ? 'friends-confirm-danger' : ''}" id="friends-confirm-ok">${okText}</button>
        </div>
      </div>
    `;

    const cleanup = (value) => {
      document.removeEventListener('keydown', onKey);
      overlay.remove();
      resolve(value);
    };

    const onKey = (e) => {
      if (e.key === 'Escape') cleanup(false);
    };

    document.addEventListener('keydown', onKey);

    overlay.addEventListener('click', (e) => {
      // click fuori dalla card = cancel
      if (e.target === overlay) cleanup(false);
    });

    overlay.querySelector('#friends-confirm-cancel').onclick = () => cleanup(false);
    overlay.querySelector('#friends-confirm-ok').onclick = () => cleanup(true);

    const host = document.getElementById('friends-overlay') || document.body;
host.appendChild(overlay);
  });
},

  async _login() {
    const email = (document.getElementById('auth-email')?.value || '').trim();
    const pass = (document.getElementById('auth-pass')?.value || '').trim();
    if (!email || !pass) { showMessage('Inserisci email + password', 'warning'); return; }

    const res = await Auth.signIn(email, pass);
    if (!res.ok) { showMessage(res.error || 'Login error', 'negative'); return; }

    showMessage('Login OK', 'positive');
    this.refresh();
  },

async _signup() {
  if (this._state.authBusy) return;
  this._state.authBusy = true;

  try {
    const email = (document.getElementById('auth-email')?.value || '').trim();
    const pass = (document.getElementById('auth-pass')?.value || '').trim();
    if (!email || !pass) { showMessage('Inserisci email + password', 'warning'); return; }

    const res = await Auth.signUp(email, pass);
    if (!res.ok) { showMessage(res.error || 'Signup error', 'negative'); return; }

    showMessage('Account creato!', 'positive');
    this.refresh();
  } finally {
    this._state.authBusy = false;
  }
},

togglePassword() {
  const input = document.getElementById('auth-pass');
  const btn = document.getElementById('toggle-pass-btn');
  if (!input) return;

  const hidden = input.type === 'password';
  input.type = hidden ? 'text' : 'password';
  if (btn) btn.textContent = hidden ? 'NASCONDI' : 'MOSTRA';
},

  _backToList() {
    this._state.view = 'list';
    this._state.friendProfile = null;
    this.render();
  },

_setAddDraft(v) {
  if (!this._state) this._state = {};
  this._state.addDraft = String(v || '');
},

_isAddInputFocused() {
  return (this._state?.tab === 'add') && (document.activeElement?.id === 'friend-id-input');
},

_onAddKey(e) {
  if (!e) return;
  if (e.key === 'Enter') {
    e.preventDefault();
    e.stopPropagation();
    this.sendRequest();
  }
},

_onAddBlur() {
  if (this._state?._deferredRender) {
    this._state._deferredRender = false;
    this.render();
  }
},


async sendRequest() {
  try {
    if (this._state.requestBusy) return;
    this._state.requestBusy = true;

    if (!Auth.isLoggedIn()) { showMessage('Devi fare login', 'warning'); return; }

const input = document.getElementById('friend-id-input');
const btn = document.getElementById('friend-send-btn');

const draft = (this._state?.addDraft ?? input?.value ?? '');
const raw = String(draft).trim().toUpperCase();
    if (!raw) { showMessage('Inserisci un codice amico', 'warning'); return; }

    const myCode = this.getMyId();
    if (raw === myCode) { showMessage('Non puoi aggiungerti da solo', 'warning'); return; }

    const client = Auth.client();
    if (!client) { showMessage('Client non pronto', 'negative'); return; }

// UI feedback (senza rerender mentre scrivi)
this._state.loading = true;

if (input) input.disabled = true;
if (btn) btn.disabled = true;

    const { data, error } = await client.rpc('send_friend_request_by_code', { target_code: raw });

    if (error) {
      console.error('send_friend_request_by_code error:', error);
      showMessage(error.message || 'Errore invio richiesta', 'negative');
      return;
    }

    if (!data || data.ok !== true) {
      const reason = data?.reason;
      if (reason === 'not_found') showMessage('Codice non trovato', 'negative');
      else if (reason === 'self') showMessage('Non puoi aggiungerti da solo', 'warning');
      else showMessage('Operazione non riuscita', 'negative');
      return;
    }

this._state.addDraft = '';
if (input) input.value = '';

    if (data.action === 'accepted') {
      showMessage('Richiesta trovata: amicizia creata ✅', 'positive');
    } else {
      showMessage('Richiesta inviata', 'positive');
    }

    this.refresh();
  } catch (e) {
    console.error('sendRequest error:', e);
    showMessage('Errore invio richiesta', 'negative');
  } finally {
this._state.requestBusy = false;
this._state.loading = false;

if (input) input.disabled = false;
if (btn) btn.disabled = false;

// se l'input è (o era) in focus, non rubare la tastiera con un rerender
if (this._isAddInputFocused()) {
  this._state._deferredRender = true;
} else {
  this.render();
}
  }
},

  async rejectRequest(requestId) {
    try {
      const client = Auth.client();
      const uid = Auth.userId();

      const { error } = await client
        .from('friend_requests')
        .update({ status: 'rejected' })
        .eq('id', requestId)
        .eq('to_id', uid);

      if (error) { showMessage(error.message, 'negative'); return; }

      showMessage('Richiesta rifiutata', 'warning');
      this.refresh();
    } catch (e) {
      console.error('rejectRequest error:', e);
      showMessage('Errore rifiuto', 'negative');
    }
  },

async acceptRequest(requestId, fromId) {
  try {
    const client = Auth.client();
    const uid = Auth.userId();
    if (!client || !uid) { showMessage('Sessione non valida', 'negative'); return; }

    this._state.loading = true;
    this.render();

    // 1) accetta richiesta (solo se è indirizzata a me)
    const { data: updated, error: upErr } = await client
      .from('friend_requests')
      .update({ status: 'accepted' })
      .eq('id', requestId)
      .eq('to_id', uid)
      .select('id')
      .maybeSingle();

    if (upErr) { showMessage(upErr.message || 'Errore accettazione', 'negative'); return; }
    if (!updated?.id) { showMessage('Richiesta non valida o già gestita', 'warning'); return; }

    // 2) crea amicizia (ordine canonico per evitare duplicati)
    const a = (fromId < uid) ? fromId : uid;
    const b = (fromId < uid) ? uid : fromId;

    const { error: insErr } = await client
      .from('friendships')
      .upsert({ user_a: a, user_b: b }, { onConflict: 'user_a,user_b' });

    if (insErr) { showMessage(insErr.message || 'Errore creazione amicizia', 'negative'); return; }

    showMessage('AMICO AGGIUNTO ✅', 'positive');
    this.refresh();
  } catch (e) {
    console.error('acceptRequest error:', e);
    showMessage('Errore accettazione', 'negative');
  } finally {
    this._state.loading = false;
    this.render();
  }
},


  async cancelRequest(requestId) {
    try {
      const client = Auth.client();
      const { error } = await client
        .from('friend_requests')
        .delete()
        .eq('id', requestId);

      if (error) { showMessage(error.message, 'negative'); return; }

      showMessage('Richiesta annullata', 'warning');
      this.refresh();
    } catch (e) {
      console.error('cancelRequest error:', e);
      showMessage('Errore annullo', 'negative');
    }
  },

// =====================================================
// FRIEND HUB (stats + inviti + sfide + eventi) — PREMIUM
// incolla tra cancelRequest(...) e removeFriend(...)
// =====================================================

_pairKey(a, b) {
  const aa = String(a || '');
  const bb = String(b || '');
  return (aa < bb) ? `${aa}:${bb}` : `${bb}:${aa}`;
},

_activityMinutes(type) {
  if (type === 'coop') return 25;
  if (type === 'party') return 45;
  if (type === '1v1') return 5;
  return 25;
},

_fmtWhen(iso) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return d.toLocaleString();
  } catch (e) { return ''; }
},

_openPremiumOverlay(cardHtml) {
  const existing = document.getElementById('friends-confirm-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'friends-confirm-overlay';

  overlay.innerHTML = cardHtml;

  const cleanup = () => {
    document.removeEventListener('keydown', onKey);
    overlay.remove();
  };

  const onKey = (e) => { if (e.key === 'Escape') cleanup(); };
  document.addEventListener('keydown', onKey);

  overlay.addEventListener('click', (e) => { if (e.target === overlay) cleanup(); });

  const host = document.getElementById('friends-overlay') || document.body;
  host.appendChild(overlay);

  return { overlay, cleanup };
},


_openStackOverlay({ id = 'friends-stack-overlay', cardHtml = '' } = {}) {

  const existing = document.getElementById(id);
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = id;

  // overlay vero sopra tutto (premium stack)
  overlay.style.cssText = `
    position: fixed;
    inset: 0;
    z-index: 25000;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 18px;
    background: rgba(0,0,0,0.58);
    backdrop-filter: blur(10px);
  `;

  overlay.innerHTML = cardHtml;

  const cleanup = () => {
    document.removeEventListener('keydown', onKey);
    overlay.remove();
  };

  const onKey = (e) => { if (e.key === 'Escape') cleanup(); };

  document.addEventListener('keydown', onKey);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) cleanup(); });

  const host = document.getElementById('friends-overlay') || document.body;
  host.appendChild(overlay);

  return { overlay, cleanup };
},

// ----------------------
// REALTIME: solo refresh UI (no auto-start)
// ----------------------


_ensureInviteRealtime() {
  // legacy hook: ormai gestiamo tutto qui
  return this._ensureCollabRealtime();
},


_ensureCollabRealtime() {
  try {
    if (this._state._collabRtReady) return;
    if (!Auth.isLoggedIn()) return;

    const client = Auth.client();
    const uid = Auth.userId();
    if (!client || !uid) return;

    this._state._collabRtReady = true;

    if (this._state._collabChannel) {
      try { client.removeChannel(this._state._collabChannel); } catch (e) {}
      this._state._collabChannel = null;
    }

    const ch = client
      .channel(`friends-collab:${uid}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'friend_invites' }, () => this._onCollabPing())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'friend_events' }, () => this._onCollabPing())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'friend_activities' }, () => this._onCollabPing())
      .subscribe();

    this._state._collabChannel = ch;
  } catch (e) {
    console.warn('_ensureCollabRealtime error:', e);
  }
},

_teardownCollabRealtime() {
  try {
    const client = Auth.client();
    if (client && this._state._collabChannel) {
      client.removeChannel(this._state._collabChannel);
    }
  } catch (e) {}
  this._state._collabChannel = null;
  this._state._collabRtReady = false;
},

async _onCollabPing() {
  // Se l'hub è aperto, ricarica i dati e rerender
  if (!this._state?.hubFriendId) return;
  const id = this._state.hubFriendId;
  await this._loadFriendHubData(id);
  this._renderFriendHub();
},

// ----------------------
// HUB entrypoint
// ----------------------
openFriendHub(friendId) {
  if (!Auth.isLoggedIn()) { showMessage('Devi fare login', 'warning'); return; }

  const f = (this._state.friends || []).find(x => x && x.id === friendId)
    || { id: friendId, username: 'Player', friend_code: '' };

  this._state.hubFriendId = friendId;
  this._state.hubFriend = f;

  // placeholder immediato (premium)
  this._openPremiumOverlay(`
    <div class="friends-confirm-card" role="dialog" aria-modal="true" style="max-height:82vh; overflow:auto">
      <div class="friends-confirm-head">
        <h3 class="friends-confirm-title">${f.username || 'Player'}</h3>
      </div>
      <div class="friends-confirm-body">
        <div class="friends-subtitle">Loading hub…</div>
      </div>
      <div class="friends-confirm-actions">
        <button class="manual-btn friends-btn-ghost" onclick="document.getElementById('friends-confirm-overlay')?.remove()">CHIUDI</button>
        <button class="manual-btn" onclick="Friends.openFriendHubStats('${friendId}')">STATS</button>
      </div>
    </div>
  `);

  // carica dati e render vero
  this._loadFriendHubData(friendId).then(() => this._renderFriendHub());
},


async openFriendHubStats(friendId) {

  try {

    if (!Auth.isLoggedIn()) { showMessage('Devi fare login', 'warning'); return; }

    const fid = friendId || this._state?.hubFriendId;
    if (!fid) { showMessage('Friend id non valido', 'negative'); return; }

    // “lite” (se c’è già in hub state, usalo)
    const lite =
      (this._state?.hubFriendId === fid && this._state?.hubFriend)
        ? this._state.hubFriend
        : (this._state.friends || []).find(x => x && x.id === fid) || { id: fid, username: 'Player', friend_code: '' };

    const { overlay, cleanup } = this._openStackOverlay({
      id: 'friends-hub-stats-overlay',
      cardHtml: `
        <div class="friends-confirm-card" role="dialog" aria-modal="true" style="max-height:82vh; overflow:auto">
          <div class="friends-confirm-head">
            <h3 class="friends-confirm-title">STATS</h3>
          </div>

          <div class="friends-confirm-body" id="friends-hub-stats-body">
            <div class="friends-subtitle">Loading stats…</div>
          </div>

          <div class="friends-confirm-actions">
            <button class="manual-btn friends-btn-ghost" id="friends-hub-stats-back">BACK</button>
            <button class="manual-btn" id="friends-hub-stats-close">CHIUDI</button>
          </div>
        </div>
      `
    });

    // BACK = torna all’hub dietro (istantaneo)
    overlay.querySelector('#friends-hub-stats-back').onclick = () => cleanup();
    overlay.querySelector('#friends-hub-stats-close').onclick = () => cleanup();

    const body = overlay.querySelector('#friends-hub-stats-body');

    const client = Auth.client();
    if (!client) { showMessage('Client non pronto', 'negative'); cleanup(); return; }

    const { data: p, error } = await client
      .from('profiles')
      .select('id, username, friend_code, level, xp, reps, streak')
      .eq('id', fid)
      .single();

    if (error || !p) {
      console.error('openFriendHubStats error:', error);
      showMessage(error?.message || 'Stats non disponibili', 'warning');
      if (body) body.innerHTML = `<div class="friends-subtitle">Stats non disponibili.</div>`;
      return;
    }

    const username = p.username || lite.username || 'Player';
    const code = p.friend_code || lite.friend_code || '';

    const level = (p.level ?? 1);
    const streak = (p.streak ?? 0);
    const xp = (p.xp ?? 0);
    const reps = (p.reps ?? 0);

    if (body) body.innerHTML = `
      <div class="friends-name">${username}</div>
      <div class="friends-meta">${code}</div>

      <div style="height:12px"></div>

      <div class="friends-subtitle">Solo numeri. Zero scuse.</div>

      <div style="height:12px"></div>

      <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 10px;">
        <div class="stat-block">
          <span class="stat-label">LEVEL</span>
          <span class="stat-value">${level}</span>
        </div>

        <div class="stat-block">
          <span class="stat-label">STREAK</span>
          <span class="stat-value">${streak}</span>
        </div>

        <div class="stat-block" style="grid-column: 1 / -1;">
          <span class="stat-label">XP</span>
          <span class="stat-value">${Number(xp).toLocaleString()}</span>
        </div>

        <div class="stat-block" style="grid-column: 1 / -1;">
          <span class="stat-label">REPS</span>
          <span class="stat-value">${Number(reps).toLocaleString()}</span>
        </div>
      </div>
    `;

  } catch (e) {

    console.error('openFriendHubStats fatal:', e);
    showMessage('Errore stats', 'negative');

  }
},

async _loadFriendHubData(friendId) {
  const client = Auth.client();
  const uid = Auth.userId();
  if (!client || !uid) return;

  const pairKey = this._pairKey(uid, friendId);

  const [invInRes, invOutRes, actRes, evRes] = await Promise.all([
    client.from('friend_invites')
      .select('id, from_id, to_id, activity_type, created_at, status')
      .eq('to_id', uid)
      .eq('from_id', friendId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false }),

    client.from('friend_invites')
      .select('id, from_id, to_id, activity_type, created_at, status')
      .eq('from_id', uid)
      .eq('to_id', friendId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false }),

    client.from('friend_activities')
      .select('id, activity_type, status, start_at, end_at, created_by, created_at')
      .eq('pair_key', pairKey)
      .in('status', ['pending','scheduled'])
      .order('created_at', { ascending: false }),

    client.from('friend_events')
      .select('id, from_id, to_id, activity_type, scheduled_for, status, created_at')
      .eq('pair_key', pairKey)
      .in('status', ['proposed','accepted'])
      .order('scheduled_for', { ascending: true }),
  ]);

  this._state.hubInvIn = invInRes.data || [];
  this._state.hubInvOut = invOutRes.data || [];
  this._state.hubActs = actRes.data || [];
  this._state.hubEvents = evRes.data || [];
},

_renderFriendHub() {
  const friendId = this._state?.hubFriendId;
  const f = this._state?.hubFriend;
  if (!friendId || !f) return;

  const uid = Auth.userId();

  const invIn = this._state.hubInvIn || [];
  const invOut = this._state.hubInvOut || [];
  const acts = this._state.hubActs || [];
  const events = this._state.hubEvents || [];

  const inviteRows = `
    ${(invIn.length === 0 && invOut.length === 0) ? `<div class="friends-subtitle">Nessun invito tra voi.</div>` : ``}

    ${invIn.map(i => `
      <div class="friends-item">
        <div class="friends-left">
          <div class="friends-name">INVITO</div>
          <div class="friends-meta">${i.activity_type.toUpperCase()}</div>
        </div>
        <div class="friends-right">
          <button class="manual-btn" onclick="Friends.acceptInvite('${i.id}')">OK</button>
          <button class="manual-btn" onclick="Friends.declineInvite('${i.id}')">NO</button>
        </div>
      </div>
    `).join('')}

    ${invOut.map(i => `
      <div class="friends-item">
        <div class="friends-left">
          <div class="friends-name">INVITO INVIATO</div>
          <div class="friends-meta">${i.activity_type.toUpperCase()}</div>
        </div>
        <div class="friends-right">
          <button class="manual-btn" onclick="Friends.cancelInvite('${i.id}')">ANNULLA</button>
        </div>
      </div>
    `).join('')}
  `;

  const actsRows = `
    ${(acts.length === 0) ? `<div class="friends-subtitle">Nessuna sfida in corso.</div>` : ``}
    ${acts.map(a => `
      <div class="friends-item">
        <div class="friends-left">
          <div class="friends-name">${a.activity_type.toUpperCase()}</div>
          <div class="friends-meta">
            ${a.status === 'pending' ? 'DA SCHEDULARE' : `START: ${this._fmtWhen(a.start_at)}`}
          </div>
        </div>
        <div class="friends-right">
          ${a.status === 'pending'
            ? `<button class="manual-btn" onclick="Friends.openScheduleActivityModal('${a.id}')">SCHEDULA</button>`
            : `<button class="manual-btn" onclick="Friends.openActivity('${a.id}')">APRI</button>`
          }
          <button class="manual-btn" onclick="Friends.cancelActivity('${a.id}')">X</button>
        </div>
      </div>
    `).join('')}
  `;

  const evRows = `
    ${(events.length === 0) ? `<div class="friends-subtitle">Nessun evento.</div>` : ``}
    ${events.map(e => {
      const isReceiver = (e.to_id === uid);
      const label = `${e.activity_type.toUpperCase()} — ${this._fmtWhen(e.scheduled_for)}`;

      if (e.status === 'proposed') {
        if (isReceiver) {
          return `
            <div class="friends-item">
              <div class="friends-left">
                <div class="friends-name">EVENTO PROPOSTO</div>
                <div class="friends-meta">${label}</div>
              </div>
              <div class="friends-right">
                <button class="manual-btn" onclick="Friends.acceptEvent('${e.id}')">OK</button>
                <button class="manual-btn" onclick="Friends.declineEvent('${e.id}')">NO</button>
              </div>
            </div>
          `;
        }
        return `
          <div class="friends-item">
            <div class="friends-left">
              <div class="friends-name">EVENTO INVIATO</div>
              <div class="friends-meta">${label}</div>
            </div>
            <div class="friends-right">
              <button class="manual-btn" onclick="Friends.cancelEvent('${e.id}')">ANNULLA</button>
            </div>
          </div>
        `;
      }

      // accepted
      return `
        <div class="friends-item">
          <div class="friends-left">
            <div class="friends-name">EVENTO ACCETTATO</div>
            <div class="friends-meta">${label}</div>
          </div>
          <div class="friends-right">
            <button class="manual-btn" onclick="Friends._loadFriendHubData('${friendId}').then(()=>Friends._renderFriendHub())">REFRESH</button>
          </div>
        </div>
      `;
    }).join('')}
  `;

  // Render finale (premium)
  this._openPremiumOverlay(`
    <div class="friends-confirm-card" role="dialog" aria-modal="true" style="max-height:82vh; overflow:auto">
      <div class="friends-confirm-head">
        <h3 class="friends-confirm-title">${f.username || 'Player'}</h3>
      </div>

      <div class="friends-confirm-body">
        <div class="friends-subtitle">${f.friend_code || ''}</div>

        <div style="display:flex; gap:10px; margin-top:12px">
          <button class="manual-btn" style="flex:1" onclick="Friends.openFriendProfile('${friendId}')">VEDI STATS</button>
          <button class="manual-btn" style="flex:1" onclick="Friends.openInviteModal('${friendId}')">INVITA</button>
          <button class="manual-btn" style="flex:1" onclick="Friends.openEventModal('${friendId}')">EVENTO</button>
        </div>

        <div class="section-card" style="margin-top:12px">
          <div class="section-card-header"><h3>INVITI</h3></div>
          <div class="friends-list">${inviteRows}</div>
        </div>

        <div class="section-card" style="margin-top:12px">
          <div class="section-card-header"><h3>SFIDE IN CORSO</h3></div>
          <div class="friends-list">${actsRows}</div>
        </div>

        <div class="section-card" style="margin-top:12px">
          <div class="section-card-header"><h3>EVENTI</h3></div>
          <div class="friends-list">${evRows}</div>
        </div>
      </div>

      <div class="friends-confirm-actions">
        <button class="manual-btn friends-btn-ghost" onclick="document.getElementById('friends-confirm-overlay')?.remove(); Friends._state.hubFriendId=null;">CHIUDI</button>
        <button class="manual-btn" onclick="Friends._loadFriendHubData('${friendId}').then(()=>Friends._renderFriendHub())">AGGIORNA</button>
      </div>
    </div>
  `);
},

// ----------------------
// INVITI (NON avviano nulla: creano una "sfida pending")
// ----------------------
openInviteModal(friendId) {
  this._state.inviteDraft = { friendId, type: (this._state.inviteDraft?.type || 'coop') };

  this._openPremiumOverlay(`
    <div class="friends-confirm-card" role="dialog" aria-modal="true">
      <div class="friends-confirm-head">
        <h3 class="friends-confirm-title">INVITA</h3>
      </div>

      <div class="friends-confirm-body">
        <div class="friends-subtitle">Scegli modalità:</div>

        <div class="friends-tabs" style="margin-top:10px">
          <button class="friends-tab ${this._state.inviteDraft.type==='coop'?'active':''}" onclick="Friends.setInviteDraftType('coop')">CO-OP</button>
          <button class="friends-tab ${this._state.inviteDraft.type==='party'?'active':''}" onclick="Friends.setInviteDraftType('party')">PARTY</button>
          <button class="friends-tab ${this._state.inviteDraft.type==='1v1'?'active':''}" onclick="Friends.setInviteDraftType('1v1')">1V1</button>
        </div>

        <div class="friends-subtitle" style="margin-top:10px">
         Non parte subito: quando accetta, finisce in “SFIDE IN CORSO”. (CO-OP 25m · PARTY 45m · 1V1 5m)
        </div>
      </div>

      <div class="friends-confirm-actions">
        <button class="manual-btn friends-btn-ghost" onclick="Friends.openFriendHub('${friendId}')">BACK</button>
        <button class="manual-btn" onclick="Friends.sendInvite('${friendId}')">INVIA</button>
      </div>
    </div>
  `);
},

setInviteDraftType(type) {
  if (!this._state.inviteDraft) this._state.inviteDraft = {};
  this._state.inviteDraft.type = type;
  this.openInviteModal(this._state.inviteDraft.friendId);
},

async sendInvite(friendId) {
  try {
    const client = Auth.client();
    const uid = Auth.userId();
    if (!client || !uid) return;

    const type = this._state.inviteDraft?.type || 'coop';

    const { error } = await client.from('friend_invites').insert({
      from_id: uid,
      to_id: friendId,
      activity_type: type,
      payload: {},
      status: 'pending'
    });

    if (error) {
      if (error.code === '23505') { showMessage('Invito già inviato', 'warning'); return; }
      showMessage(error.message || 'Errore invito', 'negative');
      return;
    }

    showMessage('Invito inviato ✅', 'positive');
    this.openFriendHub(friendId);
  } catch (e) {
    console.error('sendInvite error:', e);
    showMessage('Errore invito', 'negative');
  }
},

async acceptInvite(inviteId) {
  try {
    const client = Auth.client();
    const uid = Auth.userId();
    if (!client || !uid) return;

    // 1) prendi invito
    const { data: inv, error: e1 } = await client
      .from('friend_invites')
      .select('id, from_id, to_id, activity_type, status')
      .eq('id', inviteId)
      .single();

    if (e1 || !inv) { showMessage('Invito non valido', 'negative'); return; }
    if (inv.to_id !== uid) { showMessage('Non è un tuo invito', 'negative'); return; }
    if (inv.status !== 'pending') { showMessage('Invito già gestito', 'warning'); return; }

    // 2) segna accepted
    const { error: e2 } = await client
      .from('friend_invites')
      .update({ status: 'accepted' })
      .eq('id', inviteId)
      .eq('to_id', uid)
      .eq('status', 'pending');

    if (e2) { showMessage(e2.message || 'Errore accept', 'negative'); return; }

    // 3) crea activity PENDING (non parte)
    const otherId = inv.from_id;
    const user_a = (uid < otherId) ? uid : otherId;
    const user_b = (uid < otherId) ? otherId : uid;

    const { error: e3 } = await client.from('friend_activities').insert({
      user_a,
      user_b,
      activity_type: inv.activity_type,
      status: 'pending',
      created_by: uid,
      source_invite_id: inv.id,
      payload: { origin: 'invite' }
    });

    if (e3) {
      // se duplicata, ok: significa che c'era già una pending/scheduled
      showMessage(e3.message || 'Errore creazione sfida', 'warning');
    } else {
      showMessage('Accettato ✅ (sfida aggiunta)', 'positive');
    }

    this.openFriendHub(otherId);
  } catch (e) {
    console.error('acceptInvite error:', e);
    showMessage('Errore accept', 'negative');
  }
},

async declineInvite(inviteId) {
  try {
    const client = Auth.client();
    const uid = Auth.userId();
    const { error } = await client
      .from('friend_invites')
      .update({ status: 'declined' })
      .eq('id', inviteId)
      .eq('to_id', uid)
      .eq('status', 'pending');

    if (error) { showMessage(error.message || 'Errore', 'negative'); return; }
    showMessage('Invito rifiutato', 'warning');
if (this._state?.hubFriendId) {
  await this._loadFriendHubData(this._state.hubFriendId);
  this._renderFriendHub();
} else {
  this.refresh();
}
  } catch (e) {
    console.error('declineInvite error:', e);
    showMessage('Errore', 'negative');
  }
},

async cancelInvite(inviteId) {
  try {
    const client = Auth.client();
    const uid = Auth.userId();
    const { error } = await client
      .from('friend_invites')
      .update({ status: 'cancelled' })
      .eq('id', inviteId)
      .eq('from_id', uid)
      .eq('status', 'pending');

    if (error) { showMessage(error.message || 'Errore', 'negative'); return; }
    showMessage('Invito annullato', 'warning');
if (this._state?.hubFriendId) {
  await this._loadFriendHubData(this._state.hubFriendId);
  this._renderFriendHub();
} else {
  this.refresh();
}
  } catch (e) {
    console.error('cancelInvite error:', e);
    showMessage('Errore', 'negative');
  }
},

// ----------------------
// EVENTI (proposti, poi accettati)
// ----------------------
openEventModal(friendId) {
  this._state.eventDraft = {
    friendId,
    type: (this._state.eventDraft?.type || 'coop'),
    when: (this._state.eventDraft?.when || '')
  };

  this._openPremiumOverlay(`
    <div class="friends-confirm-card" role="dialog" aria-modal="true">
      <div class="friends-confirm-head">
        <h3 class="friends-confirm-title">NUOVO EVENTO</h3>
      </div>

      <div class="friends-confirm-body">
        <div class="friends-subtitle">Tipo:</div>
        <div class="friends-tabs" style="margin-top:10px">
          <button class="friends-tab ${this._state.eventDraft.type==='coop'?'active':''}" onclick="Friends.setEventDraftType('coop')">CO-OP</button>
          <button class="friends-tab ${this._state.eventDraft.type==='party'?'active':''}" onclick="Friends.setEventDraftType('party')">PARTY</button>
          <button class="friends-tab ${this._state.eventDraft.type==='1v1'?'active':''}" onclick="Friends.setEventDraftType('1v1')">1V1</button>
        </div>

        <div class="friends-subtitle" style="margin-top:12px">Quando:</div>
        <input id="event-when" class="manual-input" type="datetime-local" value="${this._state.eventDraft.when || ''}" />

        <div class="friends-subtitle" style="margin-top:10px">
          L’altro deve accettare: poi diventa una “SFIDA” schedulata.
        </div>
      </div>

      <div class="friends-confirm-actions">
        <button class="manual-btn friends-btn-ghost" onclick="Friends.openFriendHub('${friendId}')">BACK</button>
        <button class="manual-btn" onclick="Friends.createEvent('${friendId}')">INVIA</button>
      </div>
    </div>
  `);
},

setEventDraftType(type) {
  if (!this._state.eventDraft) this._state.eventDraft = {};
  this._state.eventDraft.type = type;
  this.openEventModal(this._state.eventDraft.friendId);
},

async createEvent(friendId) {
  try {
    const client = Auth.client();
    const uid = Auth.userId();
    if (!client || !uid) return;

    const when = document.getElementById('event-when')?.value || '';
    if (!when) { showMessage('Imposta data/ora', 'warning'); return; }

    const scheduled_for = new Date(when).toISOString();
    const type = this._state.eventDraft?.type || 'coop';

    const { error } = await client.from('friend_events').insert({
      from_id: uid,
      to_id: friendId,
      activity_type: type,
      scheduled_for,
      status: 'proposed',
      payload: {}
    });

    if (error) { showMessage(error.message || 'Errore evento', 'negative'); return; }
    showMessage('Evento proposto ✅', 'positive');
    this.openFriendHub(friendId);
  } catch (e) {
    console.error('createEvent error:', e);
    showMessage('Errore evento', 'negative');
  }
},

async acceptEvent(eventId) {
  try {
    const client = Auth.client();
    const uid = Auth.userId();
    if (!client || !uid) return;

    const { data: ev, error: e0 } = await client
      .from('friend_events')
      .select('id, from_id, to_id, activity_type, scheduled_for, status')
      .eq('id', eventId)
      .single();

    if (e0 || !ev) { showMessage('Evento non valido', 'negative'); return; }
    if (ev.to_id !== uid) { showMessage('Non è un tuo evento', 'negative'); return; }
    if (ev.status !== 'proposed') { showMessage('Evento già gestito', 'warning'); return; }

    const { error: e1 } = await client
      .from('friend_events')
      .update({ status: 'accepted' })
      .eq('id', eventId)
      .eq('to_id', uid)
      .eq('status', 'proposed');

    if (e1) { showMessage(e1.message || 'Errore accept', 'negative'); return; }

    // crea activity SCHEDULED
    const otherId = ev.from_id;
    const user_a = (uid < otherId) ? uid : otherId;
    const user_b = (uid < otherId) ? otherId : uid;

    const mins = this._activityMinutes(ev.activity_type);
    const start_at = ev.scheduled_for;
    const end_at = new Date(new Date(start_at).getTime() + mins * 60000).toISOString();

    const { error: e2 } = await client.from('friend_activities').insert({
      user_a,
      user_b,
      activity_type: ev.activity_type,
      status: 'scheduled',
      start_at,
      end_at,
      created_by: uid,
      source_event_id: ev.id,
      payload: { origin: 'event' }
    });

    if (e2) showMessage(e2.message || 'Errore creazione sfida', 'warning');
    else showMessage('Evento accettato ✅', 'positive');

    this.openFriendHub(otherId);
  } catch (e) {
    console.error('acceptEvent error:', e);
    showMessage('Errore accept evento', 'negative');
  }
},

async declineEvent(eventId) {
  try {
    const client = Auth.client();
    const uid = Auth.userId();
    const { error } = await client
      .from('friend_events')
      .update({ status: 'declined' })
      .eq('id', eventId)
      .eq('to_id', uid)
      .eq('status', 'proposed');

    if (error) { showMessage(error.message || 'Errore', 'negative'); return; }
    showMessage('Evento rifiutato', 'warning');
    await this._loadFriendHubData(this._state.hubFriendId);
    this._renderFriendHub();
  } catch (e) {
    console.error('declineEvent error:', e);
    showMessage('Errore', 'negative');
  }
},

async cancelEvent(eventId) {
  try {
    const client = Auth.client();
    const uid = Auth.userId();
    const { error } = await client
      .from('friend_events')
      .update({ status: 'cancelled' })
      .eq('id', eventId)
      .eq('from_id', uid)
      .eq('status', 'proposed');

    if (error) { showMessage(error.message || 'Errore', 'negative'); return; }
    showMessage('Evento annullato', 'warning');
    await this._loadFriendHubData(this._state.hubFriendId);
    this._renderFriendHub();
  } catch (e) {
    console.error('cancelEvent error:', e);
    showMessage('Errore', 'negative');
  }
},

// ----------------------
// SFIDE: schedula / apri / cancella (start MANUALE)
// ----------------------
openScheduleActivityModal(activityId) {
  const friendId = this._state?.hubFriendId;
  if (!friendId) return;

  this._openPremiumOverlay(`
    <div class="friends-confirm-card" role="dialog" aria-modal="true">
      <div class="friends-confirm-head">
        <h3 class="friends-confirm-title">SCHEDULA SFIDA</h3>
      </div>

      <div class="friends-confirm-body">
        <div class="friends-subtitle">Imposta start:</div>
        <input id="act-when" class="manual-input" type="datetime-local" />
        <div class="friends-subtitle" style="margin-top:10px">
          Non parte da sola: quando arriva l’ora, apri e premi “ENTRA”.
        </div>
      </div>

      <div class="friends-confirm-actions">
        <button class="manual-btn friends-btn-ghost" onclick="Friends.openFriendHub('${friendId}')">BACK</button>
        <button class="manual-btn" onclick="Friends.scheduleActivity('${activityId}')">SALVA</button>
      </div>
    </div>
  `);
},

async scheduleActivity(activityId) {
  try {
    const client = Auth.client();
    const uid = Auth.userId();
    if (!client || !uid) return;

    const when = document.getElementById('act-when')?.value || '';
    if (!when) { showMessage('Imposta data/ora', 'warning'); return; }

    const { data: row, error: e0 } = await client
      .from('friend_activities')
      .select('id, user_a, user_b, activity_type, status')
      .eq('id', activityId)
      .single();

    if (e0 || !row) { showMessage('Sfida non valida', 'negative'); return; }
    if (row.status !== 'pending') { showMessage('Già schedulata', 'warning'); return; }

    const mins = this._activityMinutes(row.activity_type);
    const start_at = new Date(when).toISOString();
    const end_at = new Date(new Date(start_at).getTime() + mins * 60000).toISOString();

    const { error } = await client
      .from('friend_activities')
      .update({ status: 'scheduled', start_at, end_at })
      .eq('id', activityId)
      .in('status', ['pending']);

    if (error) { showMessage(error.message || 'Errore schedula', 'negative'); return; }

    showMessage('Schedulata ✅', 'positive');

    await this._loadFriendHubData(this._state.hubFriendId);
    this._renderFriendHub();
  } catch (e) {
    console.error('scheduleActivity error:', e);
    showMessage('Errore schedula', 'negative');
  }
},

async cancelActivity(activityId) {
  try {
    const client = Auth.client();
    const uid = Auth.userId();
    if (!client || !uid) return;

    const { error } = await client
      .from('friend_activities')
      .update({ status: 'cancelled' })
      .eq('id', activityId)
      .in('status', ['pending','scheduled']);

    if (error) { showMessage(error.message || 'Errore', 'negative'); return; }
    showMessage('Sfida annullata', 'warning');

    await this._loadFriendHubData(this._state.hubFriendId);
    this._renderFriendHub();
  } catch (e) {
    console.error('cancelActivity error:', e);
    showMessage('Errore', 'negative');
  }
},

async openActivity(activityId) {
  try {
    const client = Auth.client();
    const uid = Auth.userId();
    if (!client || !uid) return;

    const { data: a, error: e0 } = await client
      .from('friend_activities')
      .select('id, user_a, user_b, activity_type, status, start_at, end_at')
      .eq('id', activityId)
      .single();

    if (e0 || !a) { showMessage('Sfida non valida', 'negative'); return; }

    const otherId = (a.user_a === uid) ? a.user_b : a.user_a;
    const { data: other } = await client
      .from('profiles')
      .select('id, username')
      .eq('id', otherId)
      .single();

    const otherName = other?.username || 'Player';
    const mins = this._activityMinutes(a.activity_type);

    const startAt = a.start_at ? new Date(a.start_at).getTime() : null;

    this._openPremiumOverlay(`
      <div class="friends-confirm-card" role="dialog" aria-modal="true">
        <div class="friends-confirm-head">
          <h3 class="friends-confirm-title">${a.activity_type.toUpperCase()}</h3>
        </div>

        <div class="friends-confirm-body">
          <div class="friends-subtitle">Con: <b>${otherName}</b></div>
          <div class="friends-subtitle" style="margin-top:8px">Durata: <b>${mins} min</b></div>
          <div class="friends-subtitle" style="margin-top:10px">
            Start: <b id="act-cd">${a.start_at ? this._fmtWhen(a.start_at) : 'NON SCHEDULATA'}</b>
          </div>
          <div class="friends-subtitle" style="margin-top:10px; opacity:.9">
            Non parte da sola: premi “ENTRA” quando vuoi iniziare (meglio insieme).
          </div>
        </div>

        <div class="friends-confirm-actions">
          <button class="manual-btn friends-btn-ghost" onclick="Friends.openFriendHub('${this._state.hubFriendId}')">BACK</button>
          <button class="manual-btn" id="act-enter" ${(!startAt || Date.now() < startAt) ? 'disabled' : ''}>
            ENTRA
          </button>
        </div>
      </div>
    `);

const btn = document.getElementById('act-enter');
if (!btn) return;

// niente disabled “muto”: se sei in anticipo -> WAITLIST con countdown
btn.disabled = false;

btn.onclick = () => {
  if (startAt && Date.now() < startAt) {
    return this._openWaitlistOverlay({
      activity: a,
      otherName,
      mins,
      startAt: a.start_at
    });
  }

  return this._startActivityNow(a);
};
  } catch (e) {
    console.error('openActivity error:', e);
    showMessage('Errore apertura', 'negative');
  }
},


async removeFriend(friendId) {
  try {
    const ok = await this.confirmPopup({
      title: 'RIMUOVI AMICO',
      message: 'Sei sicuro? Questa azione rimuove l’amicizia da entrambi i lati.',
      okText: 'RIMUOVI',
      cancelText: 'ANNULLA',
      danger: true
    });
    if (!ok) return;

    const client = Auth.client();
    if (!client) { showMessage('Client non pronto', 'negative'); return; }

    // piccolo feedback UI (evita spam-click)
    this._state.loading = true;
    this.render();

    const { data, error } = await client.rpc('remove_friend', { other_id: friendId });

    if (error) {
      console.error('remove_friend rpc error:', error);
      showMessage(error.message || 'Errore rimozione', 'negative');
      return;
    }

    const deletedCount = Number(data || 0);
    if (deletedCount <= 0) {
      showMessage('Non rimossa (0 righe cancellate). Riprova dopo sync.', 'warning');
      return;
    }

    // optimistic UI
    if (Array.isArray(this._state.friends)) {
      this._state.friends = this._state.friends.filter(f => f && f.id !== friendId);
      Storage.save('friends_cache', this._state.friends);
    }

    showMessage('AMICO RIMOSSO', 'warning');
    this._backToList();
  } catch (e) {
    console.error('removeFriend error:', e);
    showMessage('Errore rimozione', 'negative');
  } finally {
    this._state.loading = false;
    this.render();
    this.refresh(); // riallinea da DB
  }
},

  async openFriendProfile(friendId) {
    try {
      document.getElementById('friends-confirm-overlay')?.remove();
      const client = Auth.client();
      const { data, error } = await client
        .from('profiles')
        .select('id, username, friend_code, level, xp, reps, streak')
        .eq('id', friendId)
        .single();

      if (error || !data) {
        showMessage('Impossibile caricare profilo', 'negative');
        return;
      }

      this._state.view = 'friend';
      this._state.friendProfile = data;
      this.render();
    } catch (e) {
      console.error('openFriendProfile error:', e);
      showMessage('Errore profilo amico', 'negative');
    }
  },

  _inviteLabel(type){
  if (type === 'party') return 'Invito: Party';
  if (type === 'coop') return 'Invito: Co-op';
  if (type === '1v1') return 'Invito: 1v1';
  return `Invito: ${type}`;
},



openInviteModal(friendId){
  this._closeMiniOverlays();
  this._state.inviteActivity = this._state.inviteActivity || 'party';

  const overlay = document.createElement('div');
  overlay.id = 'friends-invite-overlay';

  const render = () => {
    overlay.innerHTML = `
      <div class="friends-confirm-card friends-invite-card">
        <h3 class="friends-confirm-title">INVITA A…</h3>
        <div class="friends-confirm-body">
          Seleziona cosa fare insieme:
        </div>

        <div class="friends-chip-row">
          <button class="friends-tab ${this._state.inviteActivity==='party'?'active':''}" onclick="Friends.setInviteActivity('party')">PARTY</button>
          <button class="friends-tab ${this._state.inviteActivity==='coop'?'active':''}" onclick="Friends.setInviteActivity('coop')">CO-OP</button>
          <button class="friends-tab ${this._state.inviteActivity==='1v1'?'active':''}" onclick="Friends.setInviteActivity('1v1')">1V1</button>
        </div>

        <div class="friends-actions-actions">
          <button class="manual-btn friends-btn-primary" onclick="Friends.sendInvite('${friendId}')">INVIA INVITO</button>
          <button class="manual-btn friends-btn-ghost" onclick="Friends._closeMiniOverlays()">ANNULLA</button>
        </div>
      </div>
    `;
  };

  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });

  const host = document.getElementById('friends-overlay') || document.body;
  host.appendChild(overlay);

  this._inviteModalRerender = render;
  render();
},

setInviteActivity(type){
  this._state.inviteActivity = type;
  this._inviteModalRerender?.();
},

async sendInvite(friendId){
  try{
    if (!Auth.isLoggedIn()) { showMessage('Devi fare login', 'warning'); return; }
    const client = Auth.client();
    const uid = Auth.userId();
    if (!client || !uid) { showMessage('Sessione non valida', 'negative'); return; }

    const activity = this._state.inviteActivity || 'party';

    const { error } = await client.from('friend_invites').insert({
      from_id: uid,
      to_id: friendId,
      activity_type: activity,
      payload: {},
      status: 'pending'
    });

    if (error){
      if (error.code === '23505') { showMessage('Invito già inviato', 'warning'); return; }
      showMessage(error.message || 'Errore invio invito', 'negative');
      return;
    }

    showMessage('Invito inviato ✅', 'positive');
    this._closeMiniOverlays();
    this.refresh();
  } catch(e){
    console.error('sendInvite error:', e);
    showMessage('Errore invio invito', 'negative');
  }
},

async acceptInvite(inviteId){
  try{
    const client = Auth.client();
    const uid = Auth.userId();
    const { error } = await client.from('friend_invites')
      .update({ status: 'accepted' })
      .eq('id', inviteId)
      .eq('to_id', uid);

    if (error){ showMessage(error.message, 'negative'); return; }
    showMessage('Invito accettato ✅', 'positive');
    this.refresh();
  } catch(e){
    console.error('acceptInvite error:', e);
    showMessage('Errore accettazione invito', 'negative');
  }
},

async declineInvite(inviteId){
  try{
    const client = Auth.client();
    const uid = Auth.userId();
    const { error } = await client.from('friend_invites')
      .update({ status: 'declined' })
      .eq('id', inviteId)
      .eq('to_id', uid);

    if (error){ showMessage(error.message, 'negative'); return; }
    showMessage('Invito rifiutato', 'warning');
    this.refresh();
  } catch(e){
    console.error('declineInvite error:', e);
    showMessage('Errore rifiuto invito', 'negative');
  }
},

async cancelInvite(inviteId){
  try{
    const client = Auth.client();
    const uid = Auth.userId();
    const { error } = await client.from('friend_invites')
      .update({ status: 'cancelled' })
      .eq('id', inviteId)
      .eq('from_id', uid);

    if (error){ showMessage(error.message, 'negative'); return; }
    showMessage('Invito annullato', 'warning');
    this.refresh();
  } catch(e){
    console.error('cancelInvite error:', e);
    showMessage('Errore annullo invito', 'negative');
  }
},

_startActivityNow(activity) {
  // chiudi overlay dettaglio/waitlist
  document.getElementById('friends-confirm-overlay')?.remove();

  // start MANUALE
  if (activity.activity_type === 'coop') return FocusMode.activate(25);
  if (activity.activity_type === 'party') return FocusMode.activate(45);

  if (activity.activity_type === '1v1') {
    showMessage('1V1: go grind reps. Refresh score nel tracker.', 'positive');
    return;
  }
},

_openWaitlistOverlay({ activity, otherName = 'Player', mins = 0, startAt }) {
  const startAtMs = startAt ? new Date(startAt).getTime() : null;

  this._openPremiumOverlay(`
    <div class="friends-confirm-card" role="dialog" aria-modal="true">
      <div class="friends-confirm-head">
        <h3 class="friends-confirm-title">WAITLIST</h3>
      </div>

      <div class="friends-confirm-body">
        <div class="friends-name">${String(activity.activity_type || '').toUpperCase()}</div>
        <div class="friends-meta">Con: ${otherName}</div>

        <div style="height:12px"></div>

        <div class="friends-meta">PARTENZA TRA</div>
        <div id="friends-wait-countdown"
             style="font-family:'Orbitron',sans-serif;font-size:2.1rem;font-weight:900;letter-spacing:2px;color:white">
          --:--
        </div>

        <div class="friends-subtitle" style="margin-top:10px">
          Se arrivi presto: aspetti qui. Quando va a zero: ENTRA.
        </div>
      </div>

      <div class="friends-confirm-actions">
        <button class="manual-btn friends-btn-ghost" id="friends-wait-back">BACK</button>
        <button class="manual-btn" id="friends-wait-enter" disabled>ENTRA</button>
      </div>
    </div>
  `);

  const back = document.getElementById('friends-wait-back');
  const enter = document.getElementById('friends-wait-enter');
  const out = document.getElementById('friends-wait-countdown');

  if (back) back.onclick = () => this.openActivity(activity.id);

  const pad = (n) => String(n).padStart(2, '0');
  const fmt = (ms) => {
    const s = Math.max(0, Math.floor(ms / 1000));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return (h > 0) ? `${pad(h)}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
  };

  const tick = () => {
    if (!out || !enter || !startAtMs) return;
    const left = startAtMs - Date.now();
    out.textContent = (left > 0) ? fmt(left) : '00:00';
    enter.disabled = left > 0;
    if (left <= 0) enter.textContent = 'ENTRA ORA';
  };

  const t = setInterval(() => {
    // stop automatico se overlay non esiste più
    if (!document.getElementById('friends-confirm-overlay') || !document.getElementById('friends-wait-countdown')) {
      clearInterval(t);
      return;
    }
    tick();
  }, 250);

  tick();

  if (enter) enter.onclick = () => {
    if (startAtMs && Date.now() < startAtMs) return;
    clearInterval(t);
    this._startActivityNow(activity);
  };
},

};