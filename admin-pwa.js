/* ============================================================
   ШАБАШКА ADMIN — регистрация отдельного service worker для
   панели администратора + баннер "доступно обновление".
   Подключается тегом <script src="/admin-pwa.js"></script>
   на всех страницах admin-*.html.
   ============================================================ */
(function () {
  'use strict';

  function registerSW() {
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/admin-sw.js', { scope: '/admin' })
      .then(function (reg) {
        console.log('[Admin PWA] Service Worker зарегистрирован:', reg.scope);
        reg.update().catch(function () {});
        document.addEventListener('visibilitychange', function () {
          if (document.visibilityState === 'visible') reg.update().catch(function () {});
        });
      })
      .catch(function (err) {
        console.warn('[Admin PWA] Service Worker не зарегистрирован:', err);
      });

    var hadController = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.addEventListener('controllerchange', function () {
      if (!hadController) { hadController = true; return; }
      showUpdateBanner();
    });
  }

  function showUpdateBanner() {
    if (document.getElementById('admin-update-banner')) return;
    var banner = document.createElement('div');
    banner.id = 'admin-update-banner';
    banner.innerHTML =
      '<div style="flex:1;font-size:13.5px;font-weight:600;color:#fff">🔄 Доступна новая версия админки</div>' +
      '<button id="admin-update-reload-btn" style="flex-shrink:0;padding:8px 16px;background:#185FA5;color:#fff;border:none;border-radius:9px;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit">Обновить</button>';
    Object.assign(banner.style, {
      position: 'fixed', top: '0', left: '0', right: '0',
      background: '#14151A', borderBottom: '1px solid #2A2A28',
      padding: 'calc(12px + env(safe-area-inset-top, 0px)) 16px 12px',
      display: 'flex', alignItems: 'center', gap: '12px',
      zIndex: '10000', boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
    });
    document.body.appendChild(banner);
    document.getElementById('admin-update-reload-btn').addEventListener('click', function () {
      window.location.reload();
    });
  }

  // Подсказка установить приложение (Android/Chrome) — та же механика,
  // что на основном сайте, только для админского manifest/scope.
  var deferredPrompt = null;
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    deferredPrompt = e;
  });
  window.ShabashkaAdminPWA = {
    install: function () {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then(function () { deferredPrompt = null; });
      }
    },
    isInstallable: function () { return !!deferredPrompt; },
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', registerSW);
  } else {
    registerSW();
  }
})();
