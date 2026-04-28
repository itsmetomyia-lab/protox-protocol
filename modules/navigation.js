// ============================================
// PROTOX PROTOCOL - navigation.js
// Modulo: Navigazione FORCE MODE
// Versione: 2.0
// ============================================

const Navigation = {

    currentPage: 'home',

    pages: ['home', 'missions', 'timer', 'stats', 'feedback', 'profile'],

    goTo(page) {
        if (!this.pages.includes(page)) return;

        this.currentPage = page;

        // FORZA nascondi TUTTE le pagine via JS
        this.pages.forEach(p => {
            const el = document.getElementById('page-' + p);
            if (el) {
                el.style.display = 'none';
            }
        });

        // FORZA mostra la pagina target
        const target = document.getElementById('page-' + page);
        if (target) {
            target.style.display = 'block';
        }

        // Scrolla in alto
        window.scrollTo(0, 0);

        // Aggiorna tab bar
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('tab-active');
        });
        const activeTab = document.getElementById('tab-' + page);
        if (activeTab) activeTab.classList.add('tab-active');

        // Renderizza contenuto
        this.renderPage(page);

        // Suono
        if (typeof SoundSystem !== 'undefined') {
            SoundSystem.playClick();
        }
    },

    renderPage(page) {
        switch (page) {
            case 'home':
                try {
                    const player = loadPlayer();
                    updateUI(player);
                    checkTodayActions();
                    if (typeof XPMultiplier !== 'undefined') XPMultiplier.render();
                } catch(e) { console.error('Home error:', e); }
                break;

            case 'missions':
                try {
                    if (typeof Missions !== 'undefined') Missions.render();
                    if (typeof Achievements !== 'undefined') Achievements.render();
                } catch(e) { console.error('Missions error:', e); }
                break;

            case 'timer':
                try {
                    if (typeof Timer !== 'undefined') Timer.render();
                    if (typeof FocusMode !== 'undefined') FocusMode.render();
                } catch(e) { console.error('Timer error:', e); }
                break;

            case 'stats':
                try {
                    if (typeof Records !== 'undefined') Records.render();
                } catch(e) { console.error('Stats error:', e); }
                break;

            case 'profile':
                try {
                    if (typeof Profile !== 'undefined') Profile.render();
                } catch(e) { console.error('Profile error:', e); }
                break;

            case 'home':
                const player = loadPlayer();
                updateUI(player);
                checkTodayActions();
                if (typeof XPMultiplier !== 'undefined') XPMultiplier.render();
                if (typeof CustomActions !== 'undefined') CustomActions.renderActions();
                break;  
                
            case 'feedback':
                if (typeof Feedback !== 'undefined') Feedback.render();
                break;
        }
    },

    init() {
        // Nascondi tutto
        this.pages.forEach(p => {
            const el = document.getElementById('page-' + p);
            if (el) {
                el.style.display = 'none';
            }
        });

        // Mostra home
        this.goTo('home');
    }
};