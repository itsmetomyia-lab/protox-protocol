// ============================================
// PROTOX PROTOCOL - notifications.js
// Modulo: Notifiche browser
// Versione: 1.0
// Dipende da: storage.js
// ============================================

const Notifications = {

    // Controlla se abilitate
    isEnabled() {
        return Storage.load('notifications_enabled') === true;
    },

    // Toggle
    toggle() {
        if (this.isEnabled()) {
            Storage.save('notifications_enabled', false);
            showMessage('🔕 Notifiche disattivate', 'positive');
        } else {
            this.requestPermission();
        }
        const statusEl = document.getElementById('notif-status');
        if (statusEl) statusEl.textContent = this.isEnabled() ? 'ON' : 'OFF';
    },

    // Richiedi permesso
    requestPermission() {
        if (!('Notification' in window)) {
            showMessage('Notifiche non supportate dal browser', 'warning');
            return;
        }

        Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
                Storage.save('notifications_enabled', true);
                showMessage('🔔 Notifiche attivate!', 'positive');
                this.scheduleReminders();
            } else {
                showMessage('Permesso notifiche negato', 'warning');
            }
        });
    },

    // Invia notifica
    send(title, body, icon = '⚡') {
        if (!this.isEnabled()) return;
        if (Notification.permission !== 'granted') return;

        try {
            new Notification(title, {
                body: body,
                icon: icon,
                badge: icon,
                vibrate: [200, 100, 200]
            });
        } catch (e) {
            console.log('Errore notifica:', e);
        }
    },

    // Reminder programmati
    scheduleReminders() {
        // Reminder ogni 3 ore durante il giorno
        const reminderMessages = [
            'Hai fatto le tue reps oggi? 🧠',
            'Non dimenticare il workout! 💪',
            'Mantieni la streak! 🔥',
            'Tempo per una sessione Protox! ⚡',
            'Il tuo futuro te stesso ti ringrazierà 👑',
            'Ogni rep conta. Vai! 🎯'
        ];

        // Controlla ogni ora
        setInterval(() => {
            const now = new Date();
            const hour = now.getHours();

            // Solo tra le 8 e le 22
            if (hour >= 8 && hour <= 22) {
                // Ogni 3 ore circa
                if (hour % 3 === 0 && now.getMinutes() < 5) {
                    const msg = reminderMessages[Math.floor(Math.random() * reminderMessages.length)];
                    this.send('PROTOX PROTOCOL', msg);
                }
            }
        }, 60000 * 5); // Controlla ogni 5 minuti
    }
};