// ============================================
// PROTOX PROTOCOL - cloud-sync.js
// Sync stats locali -> Supabase profiles
// Dipende da: storage.js, auth.js
// ============================================

const CloudSync = {
  _lastPush: 0,

  init() {
    // quando login/logout, prova sync
    if (typeof Auth !== 'undefined') {
      Auth.onChange(() => this.pushMyStats(true));
    }

    // sync soft ogni 60s
    setInterval(() => this.pushMyStats(false), 60000);

    // sync quando torni sulla tab
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) this.pushMyStats(true);
    });

    // primo tentativo
    setTimeout(() => this.pushMyStats(true), 800);
  },

  async pushMyStats(force) {
    try {
      if (typeof Auth === 'undefined' || typeof Storage === 'undefined') return;
      if (!Auth.isLoggedIn()) return;

      const now = Date.now();
      if (!force && now - this._lastPush < 15000) return;

      const player = Storage.load('player');
      if (!player) return;

      const client = Auth.client();
      const uid = Auth.userId();
      if (!client || !uid) return;

      const payload = {
        level: player.level || 1,
        xp: player.xp || 0,
        reps: player.reps || 0,
        streak: player.streak || 0
      };

      const { error } = await client
        .from('profiles')
        .update(payload)
        .eq('id', uid);

      if (error) {
        console.warn('CloudSync push warning:', error.message);
        return;
      }

      this._lastPush = now;
    } catch (e) {
      console.error('CloudSync.pushMyStats error:', e);
    }
  }
};

CloudSync.init();