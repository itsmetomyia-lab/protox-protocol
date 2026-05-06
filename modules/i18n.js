// ============================================
// PROTOX PROTOCOL - i18n.js
// IT/EN (base) + apply() che aggiorna anche testi hardcoded
// Dipende da: storage.js
// ============================================

const I18N = {

  dict: {
    it: {
      // Tab bar
      tab_home: 'Home',
      tab_missions: 'Missioni',
      tab_timer: 'Timer',
      tab_stats: 'Stats',
      tab_feedback: 'Feedback',
      tab_profile: 'Profilo',

      // Page headers (index.html)
      missions_title: 'MISSIONI',
      missions_sub: '5 missioni ogni giorno',
      missions_today: 'Missioni di Oggi',
      missions_badges: 'Badge',

      timer_title: '⏱️ TIMER',
      timer_sub: 'Sessioni di allenamento',
      timer_session: 'Sessione Allenamento',
      timer_focus: 'Focus Mode',

      stats_title: 'STATISTICHE',
      stats_sub: 'I tuoi progressi',

      profile_title: 'PROFILO',
      profile_sub: 'Il tuo personaggio',

      feedback_title: 'FEEDBACK',
      feedback_sub: 'Aiutaci a migliorare Protox',

      planner_title: 'PLANNER',
      planner_sub: 'I tuoi 90 giorni',

      // Settings row label
      settings_language: 'Lingua'
    },

    en: {
      // Tab bar
      tab_home: 'Home',
      tab_missions: 'Missions',
      tab_timer: 'Timer',
      tab_stats: 'Stats',
      tab_feedback: 'Feedback',
      tab_profile: 'Profile',

      // Page headers (index.html)
      missions_title: 'MISSIONS',
      missions_sub: '5 missions every day',
      missions_today: "Today's Missions",
      missions_badges: 'Badges',

      timer_title: '⏱️ TIMER',
      timer_sub: 'Training sessions',
      timer_session: 'Training Session',
      timer_focus: 'Focus Mode',

      stats_title: 'STATS',
      stats_sub: 'Your progress',

      profile_title: 'PROFILE',
      profile_sub: 'Your character',

      feedback_title: 'FEEDBACK',
      feedback_sub: 'Help us improve Protox',

      planner_title: 'PLANNER',
      planner_sub: 'Your 90 days',

      // Settings row label
      settings_language: 'Language'
    }
  },

  get() {
    return Storage.load('lang') || 'it';
  },

  t(key) {
    const lang = this.get();
    return this.dict[lang]?.[key] || this.dict.it[key] || key;
  },

  set(lang) {
    if (lang !== 'it' && lang !== 'en') lang = 'it';

    Storage.save('lang', lang);
    document.documentElement.lang = lang;

    this.apply();
    this.renderLanguageUI();

    // se sei in profile, rerender (per aggiornare anche la riga lingua ecc.)
    try {
      if (typeof Navigation !== 'undefined' && Navigation.currentPage === 'profile') {
        if (typeof Profile !== 'undefined') Profile.render();
      }
    } catch (e) {}
  },

  // Aggiorna TUTTO quello che possiamo senza toccare l’HTML (hardcoded-safe)
  apply() {

    const set = (sel, key) => {
      const el = document.querySelector(sel);
      if (el) el.textContent = this.t(key);
    };

    // Tab bar labels
    set('#tab-home .tab-label', 'tab_home');
    set('#tab-missions .tab-label', 'tab_missions');
    set('#tab-timer .tab-label', 'tab_timer');
    set('#tab-stats .tab-label', 'tab_stats');
    set('#tab-feedback .tab-label', 'tab_feedback');
    set('#tab-profile .tab-label', 'tab_profile');

    // Page headers
    set('#page-missions .page-header h2', 'missions_title');
    set('#page-missions .page-header .page-subtitle', 'missions_sub');
    set('#page-missions #missions-list', ''); // no-op, qui renderizza Missions.js

    set('#page-missions .section-card:nth-of-type(1) .section-card-header h3', 'missions_today');
    set('#page-missions .section-card:nth-of-type(2) .section-card-header h3', 'missions_badges');

    set('#page-timer .page-header h2', 'timer_title');
    set('#page-timer .page-header .page-subtitle', 'timer_sub');
    set('#page-timer .section-card:nth-of-type(1) h3', 'timer_session');
    set('#page-timer .section-card:nth-of-type(2) .section-card-header h3', 'timer_focus');

    set('#page-stats .page-header h2', 'stats_title');
    set('#page-stats .page-header .page-subtitle', 'stats_sub');

    set('#page-profile .page-header h2', 'profile_title');
    set('#page-profile .page-header .page-subtitle', 'profile_sub');

    set('#page-feedback .page-header h2', 'feedback_title');
    set('#page-feedback .page-header .page-subtitle', 'feedback_sub');

    // Planner overlay
    set('#planner-panel .planner-panel-header h2', 'planner_title');
    set('#planner-panel .planner-panel-header .planner-panel-subtitle', 'planner_sub');
  },

  renderLanguageUI() {
    const lang = this.get();
    document.getElementById('lang-it')?.classList.toggle('active', lang === 'it');
    document.getElementById('lang-en')?.classList.toggle('active', lang === 'en');
  },

  init() {
    document.documentElement.lang = this.get();
    // appena DOM è pronto, applica
  // provvisoriamente rimosso  setTimeout(() => this.apply(), 0);
  }

};

I18N.init();