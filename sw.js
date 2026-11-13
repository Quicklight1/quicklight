// Offline support for the Quick Light phone app.
// With internet: the page always loads the NEWEST version from the website
// (and saves a copy). Without internet: the saved copy opens instead.
const CACHE = 'rgb-light-v16';
const FILES = ['./', './index.html', './manifest.webmanifest', './icon-180.png', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE)
    .then(c => c.addAll(FILES.map(f => new Request(f, { cache: 'reload' }))))
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

// fetch with a time limit, so a weak signal falls back to the saved copy quickly
function fetchFresh(req, ms) {
  return new Promise(resolve => {
    const t = setTimeout(() => resolve(null), ms);
    fetch(req, { cache: 'no-cache' }).then(r => { clearTimeout(t); resolve(r && r.ok ? r : null); })
      .catch(() => { clearTimeout(t); resolve(null); });
  });
}

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(caches.open(CACHE).then(async cache => {
    const fresh = await fetchFresh(e.request, 4000);       // newest first
    if (fresh) { cache.put(e.request, fresh.clone()); return fresh; }
    const saved = await cache.match(e.request, { ignoreSearch: true });
    return saved || cache.match('./index.html');            // no internet: saved copy
  }));
});
