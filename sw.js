/* STUNTS KÖLLE 4D service worker: caches the game so it works offline / as a home-screen app. */
const VERSION = 'koelle4d-v31';
const FILES = ['./', './index.html', './style.css', './manifest.json', './icon.png', './og.png',
  './vendor/three.min.js', './js/pixel.js', './js/sprites.js', './js/track.js', './js/data.js', './js/cars.js', './js/world.js', './js/game.js'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(VERSION).then((c) => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return; // fonts etc. go straight to the network
  // network first for the app files (so updates arrive), cache as fallback; music files cache-first
  if (url.pathname.includes('/music/')) { e.respondWith(caches.match(e.request).then((r) => r || fetch(e.request))); return; }
  e.respondWith(fetch(e.request).then((res) => { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(e.request, copy)); return res; }).catch(() => caches.match(e.request)));
});
