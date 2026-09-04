
self.addEventListener('install', e => {
  e.waitUntil(caches.open('ts-web-v2').then(c => c.addAll(['/', '/ts-web-standalone.html', '/manifest.json'])));
});
self.addEventListener('fetch', e => {
  e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
});
