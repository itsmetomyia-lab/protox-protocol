// ============================================
// PROTOX PROTOCOL - missions.js
// Modulo: Missioni giornaliere random
// Versione: 1.0
// Dipende da: storage.js
// ============================================

const MISSION_POOL = [
    // MIND
    { id: 'read_1h', name: 'Leggi per 1 ora', xp: 60, icon: '📖', category: 'mind' },
    { id: 'no_phone_2h', name: 'Niente telefono per 2 ore', xp: 50, icon: '📵', category: 'mind' },
    { id: 'learn_new', name: 'Impara qualcosa di nuovo', xp: 40, icon: '🧠', category: 'mind' },
    { id: 'journal', name: 'Scrivi nel diario', xp: 30, icon: '📝', category: 'mind' },
    { id: 'deep_work', name: '2 ore di deep work', xp: 70, icon: '🎯', category: 'mind' },
    { id: 'no_social', name: 'Zero social media oggi', xp: 80, icon: '🚫', category: 'mind' },
    { id: 'plan_day', name: 'Pianifica la giornata', xp: 25, icon: '📋', category: 'mind' },

    // BODY
    { id: 'run_5k', name: 'Corri 5km', xp: 80, icon: '🏃', category: 'body' },
    { id: 'stretch_20', name: '20 min stretching', xp: 35, icon: '🤸', category: 'body' },
    { id: 'no_sugar', name: 'Zero zuccheri oggi', xp: 50, icon: '🍬', category: 'body' },
    { id: 'cook_healthy', name: 'Cucina un pasto sano', xp: 40, icon: '🥗', category: 'body' },
    { id: 'walk_30', name: 'Camminata 30 minuti', xp: 30, icon: '🚶', category: 'body' },
    { id: 'pushups_100', name: '100 pushups totali', xp: 60, icon: '💪', category: 'body' },
    { id: 'sleep_early', name: 'A letto entro le 23', xp: 45, icon: '🌙', category: 'body' },

    // WILL
    { id: 'cold_5min', name: 'Doccia fredda 5 minuti', xp: 70, icon: '🧊', category: 'will' },
    { id: 'hard_task', name: 'Fai la cosa che eviti', xp: 90, icon: '⚔️', category: 'will' },
    { id: 'no_complain', name: 'Zero lamentele oggi', xp: 50, icon: '🤐', category: 'will' },
    { id: 'discipline', name: 'Segui la routine perfetta', xp: 100, icon: '👑', category: 'will' },
    { id: 'uncomfortable', name: 'Fai qualcosa di scomodo', xp: 60, icon: '🔥', category: 'will' },
    { id: 'say_no', name: 'Dì NO a una tentazione', xp: 45, icon: '✋', category: 'will' },

    // SOUL
    { id: 'meditate_20', name: 'Medita 20 minuti', xp: 50, icon: '🕉️', category: 'soul' },
    { id: 'gratitude', name: 'Scrivi 3 cose per cui sei grato', xp: 30, icon: '🙏', category: 'soul' },
    { id: 'help_someone', name: 'Aiuta qualcuno', xp: 55, icon: '🤝', category: 'soul' },
    { id: 'nature', name: '30 minuti nella natura', xp: 40, icon: '🌿', category: 'soul' },
    { id: 'call_friend', name: 'Chiama un amico', xp: 35, icon: '📞', category: 'soul' },
    { id: 'forgive', name: 'Lascia andare qualcosa', xp: 45, icon: '🕊️', category: 'soul' }
];

const Missions = {

// Genera 5 missioni random per oggi
generateDaily() {
  const today = new Date().toDateString();
  const saved = Storage.load('missions');
  const DAILY_MISSION_COUNT = 5;

  // Helper: pesca missioni random, cercando prima di coprire più categorie possibili
  const pickMissions = (count, usedIds = new Set()) => {
    const missions = [];
    const categories = ['mind', 'body', 'will', 'soul'];
    const shuffledCats = [...categories].sort(() => Math.random() - 0.5);

    // 1) Una per categoria (finché serve)
    shuffledCats.forEach(cat => {
      if (missions.length >= count) return;

      const pool = MISSION_POOL.filter(m => m.category === cat && !usedIds.has(m.id));
      if (!pool.length) return;

      const random = pool[Math.floor(Math.random() * pool.length)];
      usedIds.add(random.id);
      missions.push({ ...random, completed: false });
    });

    // 2) Riempi il resto da tutto il pool (sempre evitando duplicati)
    let safety = 0;
    while (missions.length < count && safety < 2000) {
      safety++;

      const pool = MISSION_POOL.filter(m => !usedIds.has(m.id));
      if (!pool.length) break;

      const random = pool[Math.floor(Math.random() * pool.length)];
      usedIds.add(random.id);
      missions.push({ ...random, completed: false });
    }

    return missions;
  };

  // Se già generate oggi:
  // - se erano 3 (vecchio formato), ne aggiunge 2 senza perdere i progressi di oggi
  if (saved && saved.date === today && Array.isArray(saved.missions)) {
    if (saved.missions.length >= DAILY_MISSION_COUNT) return saved;

    const usedIds = new Set(saved.missions.map(m => m.id));
    const extra = pickMissions(DAILY_MISSION_COUNT - saved.missions.length, usedIds);

    saved.missions = saved.missions.concat(extra);
    saved.allCompleted = saved.missions.every(m => m.completed);

    Storage.save('missions', saved);
    return saved;
  }

  // Nuova generazione (5 missioni)
  const missions = pickMissions(DAILY_MISSION_COUNT);

  const data = {
    date: today,
    missions: missions,
    allCompleted: false
  };

  Storage.save('missions', data);
  return data;
},

    // Completa una missione
    complete(missionId) {
        const data = Storage.load('missions');
        if (!data) return null;

        const mission = data.missions.find(m => m.id === missionId);
        if (!mission || mission.completed) return null;

        mission.completed = true;

        // Controlla se tutte completate (bonus)
        data.allCompleted = data.missions.every(m => m.completed);

        Storage.save('missions', data);
        return mission;
    },

    // Bonus per tutte completate
    getBonusXP() {
        return 100;
    },

    // Renderizza le missioni nella UI
    render() {
        const container = document.getElementById('missions-list');
        if (!container) return;

        const data = this.generateDaily();
        container.innerHTML = '';

        data.missions.forEach(mission => {
            const div = document.createElement('div');
            div.className = `mission-item ${mission.completed ? 'mission-done' : ''}`;
            div.onclick = () => {
                if (!mission.completed) {
                    this.completeMission(mission.id);
                }
            };

            div.innerHTML = `
                <span class="mission-icon">${mission.icon}</span>
                <div class="mission-info">
                    <span class="mission-name">${mission.name}</span>
                    <span class="mission-cat">${mission.category.toUpperCase()}</span>
                </div>
                <span class="mission-xp">${mission.completed ? '✅' : '+' + mission.xp + ' XP'}</span>
            `;

            container.appendChild(div);
        });

        // Bonus bar
        const bonusDiv = document.getElementById('missions-bonus');
        if (bonusDiv) {
            const completed = data.missions.filter(m => m.completed).length;
            bonusDiv.innerHTML = `
                <div class="bonus-progress">
                    <div class="bonus-dots">
                        ${data.missions.map((m, i) => `<span class="bonus-dot ${m.completed ? 'filled' : ''}"></span>`).join('')}
                    </div>
                    <span class="bonus-text">${completed}/${data.missions.length} — ${data.allCompleted ? 'BONUS +100 XP ✅' : 'Completa tutte per +100 XP'}</span>
                </div>
            `;
        }
    },

    // Gestisci completamento
    completeMission(missionId) {
        const mission = this.complete(missionId);
        if (!mission) {
            showMessage('✅ Già completata!', 'warning');
            return;
        }

        // Applica moltiplicatore streak
        const multiplier = XPMultiplier.getCurrent();
        const finalXP = Math.floor(mission.xp * multiplier);

        addXP(finalXP, `Missione: ${mission.name}`);
        showMessage(`+${finalXP} XP — ${mission.name} (x${multiplier})`, 'positive');

        // Controlla bonus tutte completate
        const data = Storage.load('missions');
        if (data.allCompleted) {
            const bonusXP = Math.floor(this.getBonusXP() * multiplier);
            setTimeout(() => {
                addXP(bonusXP, 'BONUS: Tutte le missioni completate!');
                showMessage(`🏆 BONUS +${bonusXP} XP — Tutte completate!`, 'positive');
            }, 500);
        }

        this.render();
    }
};