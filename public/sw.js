/**
 * Minimál service worker: app-shell cache, hogy a játék offline is elinduljon.
 * Idle játéknál ez nem luxus — a "megnyitom a buszon, nincs net" eset gyakori,
 * és a visszatérő session a bevétel alapja.
 *
 * Stratégia: navigációra network-first (friss build), assetre cache-first.
 */
const CACHE = 'sushi-empire-v1';
// Relatív útvonalak (nem gyökér-abszolút): a service worker saját URL-jéhez
// képest oldódnak fel, tehát a GitHub Pages alkönyvtáras tesztverzión
// (/SushiTycoon/) is helyesen a saját mappájára mutatnak, nem a domain gyökerére.
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon-192.svg', './icon-512.svg'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;

  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((res) => {
          caches.open(CACHE).then((c) => c.put('./index.html', res.clone()));
          return res;
        })
        .catch(() => caches.match('./index.html')),
    );
    return;
  }

  e.respondWith(
    caches.match(req).then(
      (hit) =>
        hit ||
        fetch(req).then((res) => {
          if (res.ok) caches.open(CACHE).then((c) => c.put(req, res.clone()));
          return res;
        }),
    ),
  );
});
