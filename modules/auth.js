// ============================================
// PROTOX PROTOCOL - auth.js
// Auth + sessione Supabase (vanilla)
// Dipende da: supabase-config.js
// ============================================

const Auth = {
  _client: null,
  _session: null,
  _listeners: [],

  init() {
    if (this._client) return this._client;

    try {
      if (!window.SUPABASE_CONFIG || !SUPABASE_CONFIG.url || !SUPABASE_CONFIG.anonKey) {
        console.warn('SUPABASE_CONFIG mancante: setta url e anonKey in modules/supabase-config.js');
        return null;
      }

      const lib = window.supabase;

        if (!lib || typeof lib.createClient !== 'function') {
         console.error('supabase-js non caricato: controlla lo script CDN in index.html');
        return null;
        }

       this._client = lib.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    storage: window.localStorage
  }
});

      // Sessione iniziale
      this._client.auth.getSession().then(({ data }) => {
        this._session = data ? data.session : null;
        this._emit();
      });

      // Listener cambi auth
this._manualSignOut = false;

this._client.auth.onAuthStateChange((event, session) => {

  // se arriva null ma NON è un vero signout, aspetta un attimo e ricontrolla
  if (!session && event !== 'SIGNED_OUT') {
    setTimeout(() => {
      this._client.auth.getSession().then(({ data }) => {
        if (data?.session) {
          this._session = data.session;
          this._emit();
        }
      });
    }, 250);
    return;
  }

  // vero logout
  if (event === 'SIGNED_OUT' && !this._manualSignOut) {
    try { if (typeof showMessage !== 'undefined') showMessage('Sessione finita. Rifai login.', 'warning'); } catch(e) {}
  }

  this._session = session;
  this._emit();
});

      return this._client;
    } catch (e) {
      console.error('Auth.init error:', e);
      return null;
    }
  },

  client() {
    return this.init();
  },

  isLoggedIn() {
    return !!(this._session && this._session.user);
  },

  userId() {
    return this._session?.user?.id || null;
  },

  email() {
    return this._session?.user?.email || null;
  },

  onChange(fn) {
    this._listeners.push(fn);
  },

  _emit() {
    this._listeners.forEach((fn) => {
      try { fn(this._session); } catch (e) {}
    });
  },

  async signUp(email, password) {
    const client = this.client();
    if (!client) return { ok: false, error: 'Supabase non inizializzato' };

    const { data, error } = await client.auth.signUp({ email, password });
    if (error) return { ok: false, error: error.message };

    return { ok: true, data };
  },

  async signIn(email, password) {
    const client = this.client();
    if (!client) return { ok: false, error: 'Supabase non inizializzato' };

    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error) return { ok: false, error: error.message };

    return { ok: true, data };
  },

async signOut() {
  const client = this.client();
  if (!client) return;

  this._manualSignOut = true;
  await client.auth.signOut();
  this._manualSignOut = false;
}
};

// auto-init
Auth.init();