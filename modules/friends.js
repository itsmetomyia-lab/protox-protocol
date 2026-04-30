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
    friendProfile: null
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

  this.render();
  this.refresh();
},

close() {
  const overlay = document.getElementById('friends-overlay');
  if (!overlay) return;

  overlay.style.animation = 'friendsOut 0.18s ease forwards';
  setTimeout(() => {
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
    try {
      this._state.loading = true;
      this.render();

      if (typeof Auth === 'undefined' || !Auth.client()) {
        this._state.loading = false;
        this.render();
        return;
      }

      if (!Auth.isLoggedIn()) {
        this._state.loading = false;
        this.render();
        return;
      }

      // Sync stats (non obbligatorio ma utile)
      if (typeof CloudSync !== 'undefined') {
        CloudSync.pushMyStats(false);
      }

      const client = Auth.client();
      const uid = Auth.userId();

      // 1) mio profilo + friend_code
      const { data: myProfile, error: meErr } = await client
        .from('profiles')
        .select('id, username, friend_code, level, xp, reps, streak')
        .eq('id', uid)
        .single();

      if (meErr) {
        console.warn('Friends: errore fetch profilo:', meErr.message);
      } else {
        this._state.myProfile = myProfile;
        if (myProfile?.friend_code) Storage.save('friend_code', myProfile.friend_code);
      }

      // 2) richieste
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

      // 3) friendships
      const { data: frRows, error: frErr } = await client
        .from('friendships')
        .select('user_a, user_b, created_at')
        .or(`user_a.eq.${uid},user_b.eq.${uid}`)
        .order('created_at', { ascending: false });

      if (frErr) console.warn('Friends: friendships error:', frErr.message);

      const friendIds = (frRows || []).map(r => (r.user_a === uid ? r.user_b : r.user_a));
      const incomingIds = incoming.map(r => r.from_id);
      const outgoingIds = outgoing.map(r => r.to_id);

      const idsToFetch = Array.from(new Set([...friendIds, ...incomingIds, ...outgoingIds].filter(Boolean)));

      let profilesById = {};
      if (idsToFetch.length) {
        const { data: profs, error: pErr } = await client
          .from('profiles')
          .select('id, username, friend_code, level, xp, reps, streak')
          .in('id', idsToFetch);

        if (pErr) console.warn('Friends: profiles batch error:', pErr.message);

        (profs || []).forEach(p => { profilesById[p.id] = p; });
      }

      // 4) costruisci UI models
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

      this._state.friends = friends;
      this._state.incoming = incomingUI;
      this._state.outgoing = outgoingUI;

      // cache per Profile.getCount()
      Storage.save('friends_cache', friends);

      this._state.loading = false;
      this.render();
    } catch (e) {
      console.error('Friends.refresh error:', e);
      this._state.loading = false;
      this.render();
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
            <input id="friend-id-input" class="manual-input" placeholder="PX-........" autocomplete="off" style="flex:1; margin:0"/>
            <button class="manual-btn" onclick="Friends.sendRequest()">INVIA</button>
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
              <div class="friends-item clickable" onclick="Friends.openFriendProfile('${f.id}')">
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
    const email = (document.getElementById('auth-email')?.value || '').trim();
    const pass = (document.getElementById('auth-pass')?.value || '').trim();
    if (!email || !pass) { showMessage('Inserisci email + password', 'warning'); return; }

    const res = await Auth.signUp(email, pass);
    if (!res.ok) { showMessage(res.error || 'Signup error', 'negative'); return; }

    showMessage('Account creato! (se hai conferma email attiva, controlla la mail)', 'positive');
    this.refresh();
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

  async sendRequest() {
    try {
      if (!Auth.isLoggedIn()) { showMessage('Devi fare login', 'warning'); return; }

      const input = document.getElementById('friend-id-input');
      const raw = (input?.value || '').trim().toUpperCase();
      if (!raw) { showMessage('Inserisci un codice amico', 'warning'); return; }

      const myCode = this.getMyId();
      if (raw === myCode) { showMessage('Non puoi aggiungerti da solo', 'warning'); return; }

      const client = Auth.client();
      const uid = Auth.userId();

      // trova profilo target via friend_code
const { data: target, error: tErr } = await client
  .from('profiles')
  .select('id, username, friend_code')
  .eq('friend_code', raw)
  .maybeSingle();

if (tErr) { showMessage(tErr.message || 'Errore lookup profilo', 'negative'); return; }
if (!target) { showMessage('Codice non trovato', 'negative'); return; }

      // evita se già amici (soft check)
      const { data: frRows } = await client
        .from('friendships')
        .select('user_a, user_b')
        .or(`user_a.eq.${uid},user_b.eq.${uid}`);

      const already = (frRows || []).some(r => (r.user_a === target.id || r.user_b === target.id));
      if (already) { showMessage('Siete già amici', 'warning'); return; }

      const { error } = await client
        .from('friend_requests')
        .insert({ from_id: uid, to_id: target.id, status: 'pending' });

      if (error) {
        showMessage(error.message.includes('duplicate') ? 'Richiesta già inviata' : error.message, 'warning');
        return;
      }

      if (input) input.value = '';
      showMessage(`Richiesta inviata a ${target.username || raw}`, 'positive');
      this.refresh();
    } catch (e) {
      console.error('sendRequest error:', e);
      showMessage('Errore invio richiesta', 'negative');
    }
  },

  async acceptRequest(requestId, fromId) {
    try {
      const client = Auth.client();
      const uid = Auth.userId();

      // aggiorna richiesta
      const { error: upErr } = await client
        .from('friend_requests')
        .update({ status: 'accepted' })
        .eq('id', requestId)
        .eq('to_id', uid);

      if (upErr) { showMessage(upErr.message, 'negative'); return; }

      // crea amicizia (ordine canonico per evitare doppi)
      const a = (fromId < uid) ? fromId : uid;
      const b = (fromId < uid) ? uid : fromId;

      const { error: insErr } = await client
        .from('friendships')
        .upsert({ user_a: a, user_b: b }, { onConflict: 'user_a,user_b' });

      if (insErr) { showMessage(insErr.message, 'negative'); return; }

      showMessage('Amico aggiunto!', 'positive');
      this.refresh();
    } catch (e) {
      console.error('acceptRequest error:', e);
      showMessage('Errore accettazione', 'negative');
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

  async removeFriend(friendId) {
    try {
      if (!confirm('Rimuovere questo amico?')) return;

      const client = Auth.client();
      const uid = Auth.userId();

      const a = (friendId < uid) ? friendId : uid;
      const b = (friendId < uid) ? uid : friendId;

      const { error } = await client
        .from('friendships')
        .delete()
        .eq('user_a', a)
        .eq('user_b', b);

      if (error) { showMessage(error.message, 'negative'); return; }

      showMessage('Amico rimosso', 'warning');
      this._backToList();
      this.refresh();
    } catch (e) {
      console.error('removeFriend error:', e);
      showMessage('Errore rimozione', 'negative');
    }
  },

  async openFriendProfile(friendId) {
    try {
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
  }
};