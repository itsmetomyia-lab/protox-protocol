// ============================================
// PROTOX PROTOCOL - friends.js
// Modulo: Sistema amicizie (UI + ID locale)
// Versione: 1.0 (placeholder - backend in v2)
// Dipende da: storage.js
// ============================================

const Friends = {

    // Genera o carica ID utente
    getMyId() {
        let id = Storage.load('user_id');
        if (!id) {
            id = this.generateId();
            Storage.save('user_id', id);
        }
        return id;
    },

    // Genera ID random
    generateId() {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let id = 'PX-';
        for (let i = 0; i < 8; i++) {
            id += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return id;
    },

    // Carica lista amici (locale per ora)
    loadFriends() {
        return Storage.load('friends_list') || [];
    },

    // Salva lista amici
    saveFriends(list) {
        Storage.save('friends_list', list);
    },

    // Carica richieste pendenti
    loadRequests() {
        return Storage.load('friend_requests') || [];
    },

    // Conta amici
    getCount() {
        return this.loadFriends().length;
    },

    // Apri pagina amici (overlay come planner)
    open() {
        const overlay = document.createElement('div');
        overlay.id = 'friends-overlay';
        overlay.innerHTML = `
            <div id="friends-panel">
                <div class="friends-panel-header">
                    <h2>👥 AMICI</h2>
                    <p class="friends-panel-subtitle">Collabora e cresci insieme</p>
                    <button class="friends-close-btn" onclick="Friends.close()">✕</button>
                </div>
                <div id="friends-content"></div>
            </div>
        `;
        document.body.appendChild(overlay);
        document.body.style.overflow = 'hidden';

        this.render();
    },

    // Chiudi
    close() {
        const overlay = document.getElementById('friends-overlay');
        if (overlay) {
            overlay.style.animation = 'changelogOut 0.3s ease forwards';
            setTimeout(() => {
                overlay.remove();
                document.body.style.overflow = '';
            }, 300);
        }
    },

    // Copia ID
    copyId() {
        const id = this.getMyId();
        navigator.clipboard.writeText(id).then(() => {
            showMessage('ID copiato! Condividilo con i tuoi amici', 'positive');
        }).catch(() => {
            // Fallback
            const input = document.createElement('input');
            input.value = id;
            document.body.appendChild(input);
            input.select();
            document.execCommand('copy');
            input.remove();
            showMessage('ID copiato!', 'positive');
        });
    },

    // Invia richiesta (placeholder)
    sendRequest() {
        const input = document.getElementById('friend-id-input');
        if (!input) return;

        const friendId = input.value.trim().toUpperCase();

        if (!friendId) {
            showMessage('Inserisci un ID!', 'warning');
            return;
        }

        if (friendId === this.getMyId()) {
            showMessage('Non puoi aggiungerti da solo bro 😂', 'warning');
            return;
        }

        if (friendId.length < 11) {
            showMessage('ID non valido!', 'warning');
            return;
        }

        // Check se già amici
        const friends = this.loadFriends();
        if (friends.some(f => f.id === friendId)) {
            showMessage('Siete già amici!', 'warning');
            return;
        }

        // Per ora salva localmente come "pending"
        const requests = this.loadRequests();
        if (requests.some(r => r.id === friendId)) {
            showMessage('Richiesta già inviata!', 'warning');
            return;
        }

        requests.push({
            id: friendId,
            status: 'pending',
            sentAt: Date.now()
        });
        Storage.save('friend_requests', requests);

        input.value = '';
        showMessage(`Richiesta inviata a ${friendId}! (Funzionalità completa in arrivo)`, 'positive');
        this.render();
    },

    // Simula accetta amico (per test)
    acceptTest(requestId) {
        const requests = this.loadRequests();
        const request = requests.find(r => r.id === requestId);
        if (!request) return;

        // Sposta da requests a friends
        const friends = this.loadFriends();
        friends.push({
            id: request.id,
            name: `Player_${request.id.slice(-4)}`,
            addedAt: Date.now(),
            level: Math.floor(Math.random() * 10) + 1
        });
        this.saveFriends(friends);

        // Rimuovi dalla richiesta
        const updated = requests.filter(r => r.id !== requestId);
        Storage.save('friend_requests', updated);

        showMessage('Amico aggiunto!', 'positive');
        this.render();
    },

    // Rimuovi amico
    removeFriend(friendId) {
        const friends = this.loadFriends();
        const friend = friends.find(f => f.id === friendId);
        if (!friend) return;

        if (!confirm(`Rimuovere ${friend.name} dagli amici?`)) return;

        const updated = friends.filter(f => f.id !== friendId);
        this.saveFriends(updated);

        showMessage(`${friend.name} rimosso`, 'warning');
        this.render();
    },

    // Apri profilo amico (placeholder viola)
    openFriendProfile(friendId) {
        const friends = this.loadFriends();
        const friend = friends.find(f => f.id === friendId);
        if (!friend) return;

        const content = document.getElementById('friends-content');
        if (!content) return;

        content.innerHTML = `
            <div class="friend-profile-placeholder">
                <button class="friend-back-btn" onclick="Friends.render()">← Torna agli amici</button>

                <div class="friend-profile-card">
                    <div class="friend-avatar">👤</div>
                    <h2 class="friend-name">${friend.name}</h2>
                    <p class="friend-id-display">${friend.id}</p>
                    <span class="friend-level-badge">Level ${friend.level}</span>
                </div>

                <div class="friend-coming-soon">
                    <div class="coming-soon-icon">🚧</div>
                    <h3>IN ARRIVO</h3>
                    <p>In un prossimo aggiornamento potrai:</p>
                    <div class="coming-soon-list">
                        <div class="coming-soon-item">📊 Vedere le stats del tuo amico</div>
                        <div class="coming-soon-item">🎯 Programmare sfide insieme</div>
                        <div class="coming-soon-item">🏆 Competere in classifiche</div>
                        <div class="coming-soon-item">💬 Mandare messaggi</div>
                        <div class="coming-soon-item">🔥 Streak condivise</div>
                    </div>
                </div>

                <button class="friend-remove-btn" onclick="Friends.removeFriend('${friend.id}')">
                    🗑️ Rimuovi amico
                </button>
            </div>
        `;
    },

    // Render principale
    render() {
        const content = document.getElementById('friends-content');
        if (!content) return;

        const myId = this.getMyId();
        const friends = this.loadFriends();
        const requests = this.loadRequests();

        content.innerHTML = `
            <!-- IL TUO ID -->
            <div class="friends-id-card">
                <div class="friends-id-label">IL TUO CODICE AMICO</div>
                <div class="friends-id-display">
                    <span class="friends-id-text">${myId}</span>
                    <button class="friends-id-copy" onclick="Friends.copyId()">📋 Copia</button>
                </div>
                <p class="friends-id-note">Condividi questo codice con chi vuoi aggiungere</p>
            </div>

            <!-- AGGIUNGI AMICO -->
            <div class="friends-add-section">
                <h3>➕ Aggiungi Amico</h3>
                <div class="friends-add-row">
                    <input type="text"
                           id="friend-id-input"
                           class="friends-add-input"
                           placeholder="Inserisci codice PX-XXXXXXXX"
                           maxlength="11"
                           autocomplete="off"
                           autocapitalize="characters"
                           oninput="this.value = this.value.toUpperCase()">
                    <button class="friends-add-btn" onclick="Friends.sendRequest()">INVIA</button>
                </div>
            </div>

            <!-- RICHIESTE PENDENTI -->
            ${requests.length > 0 ? `
                <div class="friends-requests-section">
                    <h3>📨 Richieste (${requests.length})</h3>
                    ${requests.map(r => `
                        <div class="friend-request-item">
                            <span class="request-id">${r.id}</span>
                            <span class="request-status">In attesa...</span>
                            <button class="request-test-btn" onclick="Friends.acceptTest('${r.id}')">Simula ✓</button>
                        </div>
                    `).join('')}
                </div>
            ` : ''}

            <!-- LISTA AMICI -->
            <div class="friends-list-section">
                <h3>👥 Amici (${friends.length})</h3>
                ${friends.length === 0 ? `
                    <div class="friends-empty">
                        <span class="friends-empty-icon">👥</span>
                        <p>Nessun amico ancora</p>
                        <p class="friends-empty-hint">Condividi il tuo codice per iniziare!</p>
                    </div>
                ` : `
                    ${friends.map(f => `
                        <div class="friend-item" onclick="Friends.openFriendProfile('${f.id}')">
                            <span class="friend-item-avatar">👤</span>
                            <div class="friend-item-info">
                                <span class="friend-item-name">${f.name}</span>
                                <span class="friend-item-id">${f.id}</span>
                            </div>
                            <span class="friend-item-level">Lv.${f.level}</span>
                            <span class="friend-item-arrow">→</span>
                        </div>
                    `).join('')}
                `}
            </div>

            <!-- COMING SOON NOTE -->
            <div class="friends-footer-note">
                <span>🚧</span>
                <p>Il sistema amicizie completo arriverà in un prossimo aggiornamento con backend online. Per ora puoi generare il tuo ID e preparare la lista!</p>
            </div>
        `;
    }
};