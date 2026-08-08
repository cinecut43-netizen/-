/* ============================================================
   ШАБАШКА ADMIN — отдельный, минимальный service worker для
   панели администратора. В отличие от основного sw.js, здесь
   почти нет кэширования — админке всегда нужны самые свежие
   данные (пользователи, заказы, жалобы), кэш тут скорее вреден.
   Существует в основном чтобы PWA считался "устанавливаемым" —
   отдельная иконка на телефоне со своим именем и цветом.
   ============================================================ */

const CACHE_VERSION = 'shabashka-admin-v1';

self.addEventListener('install', function (e) {
  self.skipWaiting();
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (key) { return key.startsWith('shabashka-admin-') && key !== CACHE_VERSION; })
            .map(function (key) { return caches.delete(key); })
      );
    }).then(function () { return self.clients.claim(); })
  );
});

// Всегда сеть — если сети нет, отдаём что-нибудь из кэша как крайний
// случай (лучше старая версия админки, чем совсем белый экран).
self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request)
      .then(function (response) {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_VERSION).then(function (cache) { cache.put(e.request, clone); });
        }
        return response;
      })
      .catch(function () { return caches.match(e.request); })
  );
});
