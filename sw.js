const CACHE = 'buliangren-jianghuxing-v0.4.9-stable';
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './responsive.css',
  './world-map.css',
  './src/app.js',
  './src/data.js',
  './src/state.js',
  './src/battle.js',
  './src/combatants.js',
  './src/statuses.js',
  './src/progression.js',
  './src/conditions.js',
  './src/events.js',
  './src/events-s1-longquan.js',
  './src/events-s1-finale.js',
  './src/events-s1-growth.js',
  './src/events-s1-balance.js',
  './src/version.js',
  './manifest.webmanifest',
  './assets/icon.svg'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith((async () => {
    try {
      const response = await fetch(request, { cache: 'no-store' });
      if (response && response.ok) {
        const cache = await caches.open(CACHE);
        cache.put(request, response.clone());
      }
      return response;
    } catch (error) {
      const cached = await caches.match(request);
      if (cached) return cached;
      if (request.mode === 'navigate') {
        const fallback = await caches.match('./index.html');
        if (fallback) return fallback;
      }
      throw error;
    }
  })());
});
