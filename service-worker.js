const CACHE_NAME = 'kdt-guru-cache-v1';
const urlsToCache = [
  '/index.html',
  '/app.js',
  '/styles.css', // Ganti dengan file CSS Anda
  '/presSantri.js'
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Kembalikan respons dari cache jika ada
        if (response) {
          return response;
        }
        // Jika tidak ada di cache, coba fetch dari jaringan
        return fetch(event.request).catch(() => {
          // Jika offline dan tidak ada cache, tampilkan fallback
          return caches.match('/index.html');
        });
      })
  );
});

self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (!cacheWhitelist.includes(cacheName)) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});