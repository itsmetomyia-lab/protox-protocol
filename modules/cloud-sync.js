// ============================================
// PROTOX PROTOCOL - cloud-sync.js
// Sync stats locali <-> Supabase profiles
// Dipende da: storage.js, auth.js
// ============================================

const CloudSync = {

  _lastPush: 0,
  _lastPull: 0,
  _syncBusy: false,

  init() {

    if (typeof Auth !== 'undefined') {

      Auth.onChange(() => {
        // su login: prima PULL poi PUSH (anti-azzero)
        this.syncOnLogin();
      });

    }

    // soft push ogni 60s (solo se loggato)
    setInterval(() => this.pushMyStats(false), 60000);

    // quando torni sulla tab: prova sync veloce
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) this.pushMyStats(true);
    });

    // primo tentativo (non aggressivo)
    setTimeout(() => this.pushMyStats(true), 1200);

  },

  async syncOnLogin() {

    try {

      if (this._syncBusy) return;
      this._syncBusy = true;

      if (typeof Auth === 'undefined' || typeof Storage === 'undefined') return;
      if (!Auth.isLoggedIn()) return;

      // 1) Pull (se esiste cloud, ripristina)
      await this.pullMyStats(true);

      // 2) Push (in caso local > cloud, aggiorna cloud)
      await this.pushMyStats(true);

    } catch (e) {

      console.error('CloudSync.syncOnLogin error:', e);

    } finally {

      this._syncBusy = false;

    }
  },

  async pullMyStats(force) {

    try {

      if (typeof Auth === 'undefined' || typeof Storage === 'undefined') return;
      if (!Auth.isLoggedIn()) return;

      const now = Date.now();
      if (!force && now - this._lastPull < 15000) return;

      const client = Auth.client();
      const uid = Auth.userId();
      if (!client || !uid) return;

      const { data, error } = await client
        .from('profiles')
        .select('level, xp, reps, streak')
        .eq('id', uid)
        .single();

      if (error || !data) {
        console.warn('CloudSync pull warning:', error?.message || 'no data');
        return;
      }

      const cloudXP = Number(data.xp ?? 0);
      const cloudLevel = Number(data.level ?? 1);
      const cloudReps = Number(data.reps ?? 0);
      const cloudStreak = Number(data.streak ?? 0);

      // local player (può essere nuovo/reset)
      let player = Storage.load('player');

      // se non esiste proprio, creane uno minimal (player-stats poi lo arricchisce)
      if (!player) {
        player = {
          level: 1,
          title: 'NPC',
          xp: 0,
          streak: 0,
          reps: 0,
          log: [],
          actionsToday: {},
          cleanDays: 0,
          createdAt: Date.now()
        };
      }

      const localXP = Number(player.xp ?? 0);

      // regola semplice e safe:
      // - se cloud ha più XP -> ripristina local
      // - se local ha più XP -> non toccare (poi push aggiorna cloud)
      if (cloudXP > localXP) {

        player.xp = cloudXP;
        player.level = cloudLevel || player.level || 1;
        player.reps = cloudReps;
        player.streak = cloudStreak;

        // se player-stats è già caricato, calcola title/level corretti da XP
        if (typeof calculateLevel === 'function') {
          const lv = calculateLevel(player.xp);
          if (lv) {
            player.level = lv.level;
            player.title = lv.title;
          }
        } else {
          // fallback (evita "undefined" in UI)
          player.title = player.title || 'NPC';
        }

        Storage.save('player', player);

        // aggiorna UI se disponibile
        if (typeof updateUI === 'function') updateUI(player);

        // refresh quick actions se c'è
        if (typeof CustomActions !== 'undefined' && typeof CustomActions.renderHome === 'function') {
          CustomActions.renderHome();
        }
      }

      // se player-stats non era pronto al momento del pull, facciamo un "second pass"
      setTimeout(() => {
        try {
          if (typeof calculateLevel !== 'function') return;
          const p = Storage.load('player');
          if (!p) return;

          const lv = calculateLevel(p.xp || 0);
          if (!lv) return;

          p.level = lv.level;
          p.title = lv.title;
          Storage.save('player', p);

          if (typeof updateUI === 'function') updateUI(p);
        } catch (e) {}
      }, 900);

      this._lastPull = now;

    } catch (e) {

      console.error('CloudSync.pullMyStats error:', e);

    }
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
        id: uid,
        level: player.level || 1,
        xp: player.xp || 0,
        reps: player.reps || 0,
        streak: player.streak || 0
      };

      // upsert = sicuro anche se la riga profilo non esiste ancora
      const { error } = await client
        .from('profiles')
        .upsert(payload, { onConflict: 'id' });

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