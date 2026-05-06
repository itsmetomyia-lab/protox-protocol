// ============================================
// PROTOX PROTOCOL - Service Worker
// Permette funzionamento offline
// ============================================

const CACHE_NAME = 'protox-v14';

const ASSETS = [
  '/',
  '/index.html',
  '/styles.css',
  '/manifest.json',

  '/modules/storage.js',

  '/modules/i18n.js',

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
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // 1) Mai cache per richieste NON-GET (POST/PUT/DELETE) — es. Supabase auth
  if (req.method !== 'GET') {
    event.respondWith(fetch(req));
    return;
  }

  // 2) Non gestire richieste verso domini esterni (supabase.co, cdn, ecc.)
  if (url.origin !== self.location.origin) {
    event.respondWith(fetch(req));
    return;
  }

  // 3) Navigazione: fallback su index.html (SPA) se offline
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(() => caches.match('/index.html'))
    );
    return;
  }

// 4) CSS/JS: NETWORK FIRST (così non devi hard-refreshare per vedere update)
const isCodeAsset =
  url.pathname.endsWith('.js') ||
  url.pathname.endsWith('.css') ||
  url.pathname === '/index.html' ||
  url.pathname === '/';

if (isCodeAsset) {
  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res && res.ok) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
        }
        return res;
      })
      .catch(() => caches.match(req))
  );
  return;
}

// 5) Tutto il resto: cache-first
event.respondWith(
  caches.match(req).then((cached) => {
    if (cached) return cached;
    return fetch(req).then((res) => {
      if (!res || !res.ok) return res;
      const resClone = res.clone();
      caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
      return res;
    });
  })
);
});