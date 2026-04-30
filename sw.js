// ============================================
// PROTOX PROTOCOL - Service Worker
// Permette funzionamento offline
// ============================================

const CACHE_NAME = 'protox-v4';

const ASSETS = [
  '/',
  '/index.html',
  '/styles.css',
  '/manifest.json',

  '/modules/storage.js',

  '/modules/supabase-config.js',
  '/modules/auth.js',
  '/modules/cloud-sync.js',

  '/modules/sounds.js',
  '/modules/particles.js',
  '/modules/dark-light.js',
  '/modules/xp-multiplier.js',
  '/modules/records.js',
  '/modules/achievements.js',
  '/modules/missions.js',
  '/modules/protox-tracker.js',
  '/modules/timer.js',
  '/modules/focus-mode.js',
  '/modules/profile.js',
  '/modules/daily-reset.js',
  '/modules/notifications.js',
  '/modules/navigation.js',
  '/modules/player-stats.js',

  '/modules/friends.js'
];

// Install - salva tutto in cache
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            console.log('Cache aperta');
            return cache.addAll(ASSETS);
        })
    );
    self.skipWaiting();
});

// Activate - pulisci vecchie cache
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(
                keys.filter(key => key !== CACHE_NAME)
                    .map(key => caches.delete(key))
            );
        })
    );
    self.clients.claim();
});

// Fetch - servi da cache, poi network
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request).then(response => {
            // Se in cache, usa quella
            if (response) {
                // Ma aggiorna in background
                fetch(event.request).then(freshResponse => {
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, freshResponse);
                    });
                }).catch(() => {});

                return response;
            }

            // Se non in cache, vai online
            return fetch(event.request).then(response => {
                // Salva in cache per dopo
                const responseClone = response.clone();
                caches.open(CACHE_NAME).then(cache => {
                    cache.put(event.request, responseClone);
                });
                return response;
            }).catch(() => {
                // Offline e non in cache
                return new Response('Offline - ricarica quando hai connessione');
            });
        })
    );
});