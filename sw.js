// Keeps Stuffie Town working offline after the first visit.
// Bump VERSION whenever files change so the iPad picks up the new game.
var VERSION = 'stuffie-v27';
self.addEventListener('install', function () { self.skipWaiting(); });
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== VERSION; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  // network first (so updates show up), fall back to the saved copy when offline.
  // cache: 'no-cache' makes the iPad ask GitHub for a fresh copy every time, so it never
  // mixes a new game file with an old stylesheet (that made Jeffrey's pieces float).
  e.respondWith(fetch(e.request, { cache: 'no-cache' }).then(function (r) {
    if (r && r.ok) { var c = r.clone(); caches.open(VERSION).then(function (cache) { cache.put(e.request, c); }); }
    return r;
  }).catch(function () { return caches.match(e.request, { ignoreSearch: true }); }));
});
