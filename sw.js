/* sw.js — Service Worker Шабашки
   Версия кэша: при обновлении сайта меняй CACHE_VERSION,
   чтобы старый кэш сбросился автоматически. */
const CACHE_VERSION = 'shabashka-v10';
const CACHE_STATIC = 'static-v1';

// Файлы, которые кэшируются при первой установке
const PRECACHE = [
  '/',
  '/index.html',
  '/data.js',
  '/nav.js',
  '/icons.js',
  '/logo-v2.png',
  'https://unpkg.com/@phosphor-icons/web@2.1.1/src/bold/style.css',
];

// ===== УСТАНОВКА =====
self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE_STATIC).then(function (cache) {
      // Добавляем файлы в кэш. Если какой-то не загрузится — не падаем.
      return Promise.allSettled(
        PRECACHE.map(function (url) { return cache.add(url).catch(function () {}); })
      );
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

// ===== АКТИВАЦИЯ (чистим старые кэши) =====
self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (key) {
          return key !== CACHE_STATIC;
        }).map(function (key) {
          return caches.delete(key);
        })
      );
    }).then(function () {
      return self.clients.claim();
    })
  );
});

// ===== ПЕРЕХВАТ ЗАПРОСОВ =====
// Стратегия: Network First для HTML-страниц (всегда свежее),
// Cache First для статики (иконки, JS, CSS — они меняются редко).
self.addEventListener('fetch', function (e) {
  var url = new URL(e.request.url);

  // Пропускаем не-GET, API-запросы, внешние ресурсы кроме Phosphor
  if (e.request.method !== 'GET') return;
  if (url.pathname.startsWith('/api/')) return;

  // HTML-страницы: Network First → Cache fallback
  if (e.request.headers.get('accept') && e.request.headers.get('accept').includes('text/html')) {
    e.respondWith(
      fetch(e.request)
        .then(function (response) {
          var clone = response.clone();
          caches.open(CACHE_STATIC).then(function (cache) { cache.put(e.request, clone); });
          return response;
        })
        .catch(function () {
          return caches.match(e.request).then(function (cached) {
            return cached || caches.match('/');
          });
        })
    );
    return;
  }

  // Статика: Cache First → Network fallback
  e.respondWith(
    caches.match(e.request).then(function (cached) {
      if (cached) return cached;
      return fetch(e.request).then(function (response) {
        if (response && response.status === 200) {
          var clone = response.clone();
          caches.open(CACHE_STATIC).then(function (cache) { cache.put(e.request, clone); });
        }
        return response;
      });
    })
  );
});

// ===== PUSH-УВЕДОМЛЕНИЯ =====
self.addEventListener('push', function (e) {
  var data = {};
  if (e.data) {
    try { data = e.data.json(); } catch (err) { data = { title: e.data.text() }; }
  }

  var title = data.title || 'Шабашка';
  var options = {
    body: data.body || 'У вас новое уведомление',
    icon: '/logo-v2.png',
    badge: '/logo-v2.png',
    tag: data.tag || 'shabashka-notification',
    data: { url: data.url || '/' },
    actions: data.actions || [
      { action: 'open', title: 'Открыть' },
      { action: 'close', title: 'Закрыть' },
    ],
  };

  e.waitUntil(self.registration.showNotification(title, options));
});

// Клик по уведомлению — открываем нужную страницу
self.addEventListener('notificationclick', function (e) {
  e.notification.close();
  var url = (e.notification.data && e.notification.data.url) ? e.notification.data.url : '/';
  if (e.action === 'close') return;

  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (windows) {
      // Если приложение уже открыто — фокусируемся на него
      for (var i = 0; i < windows.length; i++) {
        var win = windows[i];
        if (win.url.includes(self.location.origin) && 'focus' in win) {
          win.navigate(url);
          return win.focus();
        }
      }
      // Иначе открываем новую вкладку
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
