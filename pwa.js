/* pwa.js — регистрация PWA и push-уведомлений для Шабашки
   Подключается в конце <body> на всех основных страницах.
   Работает тихо в фоне — не мешает пользователю. */

(function () {
  'use strict';

  // ===== SERVICE WORKER =====
  function registerSW() {
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/sw.js', { scope: '/' })
      .then(function (reg) {
        console.log('[PWA] Service Worker зарегистрирован:', reg.scope);

        // Раньше проверка новой версии полагалась целиком на браузер — а он
        // делает это редко (раз в сутки максимум) и по своим правилам.
        // Для установленного на телефон PWA (иконка на главном экране) это
        // особенно плохо: там нет адресной строки и кнопки "обновить" — если
        // не проверять явно, человек может неделями сидеть на старой версии,
        // просто открывая иконку с рабочего стола.
        //
        // Проверяем сразу и каждый раз, когда возвращаются в приложение.
        reg.update().catch(function(){});
        document.addEventListener('visibilitychange', function () {
          if (document.visibilityState === 'visible') {
            reg.update().catch(function(){});
          }
        });
      })
      .catch(function (err) {
        console.warn('[PWA] Service Worker не зарегистрирован:', err);
      });

    // ===== БАННЕР "ДОСТУПНО ОБНОВЛЕНИЕ" =====
    // sw.js уже сам активируется сразу после установки (skipWaiting), но это
    // не обновляет уже открытую вкладку — код там продолжает работать старый,
    // пока страницу не перезагрузят. Ловим момент смены активного SW и
    // предлагаем обновиться одной кнопкой, вместо того чтобы люди сами
    // догадывались закрыть и открыть вкладку заново.
    var hadController = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.addEventListener('controllerchange', function () {
      if (!hadController) {
        // Самая первая установка SW на этой вкладке — не обновление, а просто
        // первый заход, показывать баннер незачем.
        hadController = true;
        return;
      }
      showUpdateBanner();
    });
  }

  function showUpdateBanner() {
    if (document.getElementById('update-banner')) return;

    var banner = document.createElement('div');
    banner.id = 'update-banner';
    banner.innerHTML =
      '<div style="flex:1;font-size:13.5px;font-weight:600;color:#14151A">🔄 Доступна новая версия сайта</div>' +
      '<button id="update-reload-btn" style="flex-shrink:0;padding:8px 16px;background:#E8510A;color:#fff;border:none;border-radius:9px;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit">Обновить</button>';

    Object.assign(banner.style, {
      position: 'fixed', top: '0', left: '0', right: '0',
      background: '#fff', borderBottom: '1px solid #E5E4E0',
      padding: 'calc(12px + env(safe-area-inset-top, 0px)) 16px 12px', display: 'flex', alignItems: 'center', gap: '12px',
      zIndex: '10000', boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
    });

    document.body.appendChild(banner);

    document.getElementById('update-reload-btn').addEventListener('click', function () {
      window.location.reload();
    });
  }

  // ===== PUSH-УВЕДОМЛЕНИЯ =====
  // Показываем запрос на уведомления только исполнителям,
  // только после регистрации, и только один раз — не раздражаем людей.
  function askForPushPermission() {
    if (!('Notification' in window)) return;
    if (!('serviceWorker' in navigator)) return;
    if (Notification.permission !== 'default') return; // уже ответил

    // Проверяем что пользователь залогинен
    if (!window.Shabashka) return;
    var user;
    try { user = Shabashka.getUser(); } catch (e) { return; }
    if (!user || !user.name) return;

    // Показываем наш собственный банер вместо стандартного браузерного попапа —
    // конверсия в согласие намного выше, когда человек понимает зачем
    var banner = document.createElement('div');
    banner.id = 'push-banner';
    banner.innerHTML = [
      '<div style="display:flex;align-items:center;gap:12px;flex:1">',
      '<span style="font-size:24px">🔔</span>',
      '<div>',
      '<div style="font-size:13.5px;font-weight:600;color:#14151A">Получать уведомления о новых заказах?</div>',
      '<div style="font-size:12px;color:#6B6B67;margin-top:2px">Узнавай первым — срочные заказы уходят за минуты</div>',
      '</div>',
      '</div>',
      '<button id="push-yes" style="padding:8px 16px;background:#E8510A;color:#fff;border:none;border-radius:9px;font-size:13px;font-weight:600;cursor:pointer;white-space:nowrap;font-family:inherit">Включить</button>',
      '<button id="push-no" style="padding:8px 12px;background:none;border:none;color:#6B6B67;font-size:13px;cursor:pointer;font-family:inherit">Не сейчас</button>',
    ].join('');

    Object.assign(banner.style, {
      position: 'fixed',
      bottom: '80px', // выше нижней навигации на мобильных
      left: '16px',
      right: '16px',
      background: '#fff',
      border: '1px solid #E5E4E0',
      borderRadius: '14px',
      padding: '14px 16px',
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      zIndex: '300',
      boxShadow: '0 4px 24px rgba(0,0,0,0.10)',
      maxWidth: '480px',
      margin: '0 auto',
    });

    document.body.appendChild(banner);

    document.getElementById('push-yes').addEventListener('click', function () {
      banner.remove();
      Notification.requestPermission().then(function (permission) {
        if (permission === 'granted') {
          localStorage.setItem('shabashka_push_granted', '1');
          subscribeToPush().then(function (ok) {
            showToast(ok ? 'Уведомления включены ✓' : 'Уведомления включены, но подписка не удалась — попробуйте позже');
          });
        }
      });
    });

    document.getElementById('push-no').addEventListener('click', function () {
      banner.remove();
      localStorage.setItem('shabashka_push_dismissed', '1');
    });
  }

  function showToast(msg) {
    var t = document.createElement('div');
    t.textContent = msg;
    Object.assign(t.style, {
      position: 'fixed', bottom: '90px', left: '50%',
      transform: 'translateX(-50%)',
      background: '#14151A', color: '#fff',
      padding: '10px 20px', borderRadius: '20px',
      fontSize: '13px', zIndex: '400', whiteSpace: 'nowrap',
      opacity: '0', transition: 'opacity 0.3s',
    });
    document.body.appendChild(t);
    setTimeout(function () { t.style.opacity = '1'; }, 10);
    setTimeout(function () { t.style.opacity = '0'; }, 2500);
    setTimeout(function () { t.remove(); }, 3000);
  }

  // ===== НАСТОЯЩАЯ WEB PUSH ПОДПИСКА =====
  // Работает даже при закрытом браузере — в отличие от старого поллинга,
  // который требовал открытой вкладки. Подписка сохраняется в БД и сервер
  // сам решает, когда отправлять (новый заказ, отклик, сообщение и т.д).
  function urlBase64ToUint8Array(base64String) {
    var padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    var base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    var rawData = window.atob(base64);
    var outputArray = new Uint8Array(rawData.length);
    for (var i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
    return outputArray;
  }

  function subscribeToPush() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return Promise.resolve(false);
    if (!window.Shabashka) return Promise.resolve(false);

    return fetch('/api/vapid-public-key')
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (!data.configured || !data.publicKey) {
          console.log('[PWA] Web Push не настроен на сервере (нет VAPID-ключей)');
          return false;
        }
        return navigator.serviceWorker.ready.then(function (reg) {
          return reg.pushManager.getSubscription().then(function (existing) {
            return existing || reg.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: urlBase64ToUint8Array(data.publicKey),
            });
          });
        }).then(function (subscription) {
          return Shabashka.ensureDbUserId().then(function (userId) {
            if (!userId) return false;
            return fetch('/api/push-subscribe', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ userId: userId, subscription: subscription.toJSON ? subscription.toJSON() : subscription }),
            }).then(function (r) { return r.ok; });
          });
        });
      })
      .catch(function (e) { console.warn('[PWA] Подписка на push не удалась:', e); return false; });
  }

  // ===== POLLING НОВЫХ СРОЧНЫХ ЗАКАЗОВ =====
  // Оставлен как запасной вариант на случай, если Web Push не настроен
  // (нет VAPID-ключей на сервере) или не поддерживается браузером —
  // работает только пока вкладка открыта.
  var lastCheckedAt = Date.now();
  var pollingInterval = null;

  function startJobPolling() {
    if (!window.Shabashka) return;
    var user;
    try { user = Shabashka.getUser(); } catch(e) { return; }
    if (!user || user.role !== 'worker') return;
    if (Notification.permission !== 'granted') return;
    clearInterval(pollingInterval);
    pollingInterval = setInterval(checkNewJobs, 30000);
  }

  function checkNewJobs() {
    fetch('/api/check-new-jobs?since=' + lastCheckedAt)
      .then(function(r){ return r.json(); })
      .then(function(data) {
        lastCheckedAt = data.checkedAt || Date.now();
        if (data.newJobs && data.newJobs.length > 0) {
          data.newJobs.forEach(showJobNotification);
        }
      })
      .catch(function(){});
  }

  function showJobNotification(job) {
    var title = job.urgent ? '🔥 Срочный заказ рядом!' : '💼 Новый заказ — Шабашка';
    var body = job.title + '\n' + job.pay.toLocaleString('ru') + ' ₽ · ' + job.location;
    var opts = {
      body: body,
      icon: '/logo-v2.png',
      badge: '/logo-v2.png',
      tag: 'new-job-' + job.id,
      renotify: true,
      vibrate: [200, 100, 200],
      data: { url: '/?job=' + job.id },
      actions: [
        { action: 'open', title: '👀 Смотреть заказ' },
        { action: 'close', title: 'Закрыть' },
      ],
    };

    if (!('serviceWorker' in navigator)) {
      if (Notification.permission === 'granted') {
        var n = new Notification(title, { body: body, icon: '/logo-v2.png' });
        n.onclick = function() { window.focus(); window.location.href = '/'; };
      }
      return;
    }
    navigator.serviceWorker.ready.then(function(sw) {
      sw.showNotification(title, opts);
    });
  }

  function showResponseNotification(jobTitle, workerName) {
    var title = '🎉 Новый отклик на ваш заказ';
    var body = workerName + ' откликнулся на «' + jobTitle + '»';
    var opts = {
      body: body,
      icon: '/logo-v2.png',
      badge: '/logo-v2.png',
      tag: 'response-' + Date.now(),
      vibrate: [100, 50, 100],
      data: { url: '/employer' },
      actions: [
        { action: 'open', title: '👤 Посмотреть' },
        { action: 'close', title: 'Закрыть' },
      ],
    };
    if (!('serviceWorker' in navigator)) {
      if (Notification.permission === 'granted') {
        new Notification(title, { body: body, icon: '/logo-v2.png' });
      }
      return;
    }
    navigator.serviceWorker.ready.then(function(sw) {
      sw.showNotification(title, opts);
    });
  }

  window.ShabashkaNotify = {
    startPolling: startJobPolling,
    checkNow: checkNewJobs,
    showJob: showJobNotification,
    showResponse: showResponseNotification,
  };

  // ===== КНОПКА "УСТАНОВИТЬ ПРИЛОЖЕНИЕ" =====
  // A2HS (Add to Home Screen) — появляется автоматически в Chrome/Android
  // когда браузер видит manifest + SW. Перехватываем событие и показываем
  // свой баннер вместо стандартного пузыря (конверсия выше, когда понятно
  // зачем). ВАЖНО: раньше здесь стандартный попап подавлялся (preventDefault),
  // а свой баннер никогда не был реализован — установка была никак недоступна.
  var deferredPrompt = null;
  var INSTALL_DISMISSED_KEY = 'shabashka_install_dismissed';

  function isStandalone() {
    return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  }

  function isIOS() {
    return /iPhone|iPad|iPod/.test(navigator.userAgent) && !window.MSStream;
  }

  function showInstallButton() {
    if (isStandalone()) return; // уже установлено
    if (localStorage.getItem(INSTALL_DISMISSED_KEY)) return;
    if (document.getElementById('install-banner')) return;
    if (document.getElementById('push-banner')) {
      // Не показываем два баннера поверх друг друга — подождём, пока
      // человек ответит на вопрос про уведомления, и попробуем позже.
      setTimeout(showInstallButton, 4000);
      return;
    }

    var banner = document.createElement('div');
    banner.id = 'install-banner';
    banner.innerHTML = [
      '<div style="display:flex;align-items:center;gap:12px;flex:1">',
      '<span style="font-size:24px">📲</span>',
      '<div>',
      '<div style="font-size:13.5px;font-weight:600;color:#14151A">Установить Шабашку на телефон?</div>',
      '<div style="font-size:12px;color:#6B6B67;margin-top:2px">Быстрый доступ с экрана, без браузера</div>',
      '</div>',
      '</div>',
      '<button id="install-yes" style="padding:8px 16px;background:#E8510A;color:#fff;border:none;border-radius:9px;font-size:13px;font-weight:600;cursor:pointer;white-space:nowrap;font-family:inherit">Установить</button>',
      '<button id="install-no" style="padding:8px 12px;background:none;border:none;color:#6B6B67;font-size:13px;cursor:pointer;font-family:inherit">Не сейчас</button>',
    ].join('');

    Object.assign(banner.style, {
      position: 'fixed', bottom: '80px', left: '16px', right: '16px',
      background: '#fff', border: '1px solid #E5E4E0', borderRadius: '14px',
      padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '10px',
      zIndex: '300', boxShadow: '0 4px 24px rgba(0,0,0,0.10)', maxWidth: '480px', margin: '0 auto',
    });

    document.body.appendChild(banner);

    document.getElementById('install-yes').addEventListener('click', function () {
      banner.remove();
      if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then(function (result) {
          deferredPrompt = null;
          if (result.outcome === 'accepted') showToast('Приложение установлено ✓');
        });
      } else if (isIOS()) {
        showIOSInstallInstructions();
      }
    });

    document.getElementById('install-no').addEventListener('click', function () {
      banner.remove();
      localStorage.setItem(INSTALL_DISMISSED_KEY, '1');
    });
  }

  // iOS Safari не поддерживает beforeinstallprompt вообще — единственный
  // способ установить PWA там: Поделиться → На экран «Домой», вручную.
  function showIOSInstallInstructions() {
    var overlay = document.createElement('div');
    overlay.id = 'ios-install-modal';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9999;display:flex;align-items:flex-end';
    overlay.addEventListener('click', function () { overlay.remove(); });

    var sheet = document.createElement('div');
    sheet.style.cssText = 'background:#fff;border-radius:16px 16px 0 0;padding:20px;width:100%;max-width:480px;margin:0 auto';
    sheet.addEventListener('click', function (e) { e.stopPropagation(); });
    sheet.innerHTML = [
      '<div style="font-size:16px;font-weight:700;margin-bottom:12px">Как установить на iPhone</div>',
      '<div style="font-size:14px;line-height:1.8;color:#14151A">',
      '1. Нажмите кнопку <b>«Поделиться»</b> внизу экрана (значок ⬆️ в квадрате)<br>',
      '2. Прокрутите вниз и выберите <b>«На экран «Домой»»</b><br>',
      '3. Нажмите <b>«Добавить»</b> в правом верхнем углу',
      '</div>',
      '<button id="ios-install-close" style="width:100%;margin-top:16px;padding:12px;background:#E8510A;color:#fff;border:none;border-radius:10px;font-size:14px;font-weight:600;cursor:pointer;font-family:inherit">Понятно</button>',
    ].join('');

    overlay.appendChild(sheet);
    document.body.appendChild(overlay);
    sheet.querySelector('#ios-install-close').addEventListener('click', function () { overlay.remove(); });
  }

  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    deferredPrompt = e;
    setTimeout(showInstallButton, 3000);
  });

  window.addEventListener('appinstalled', function () {
    localStorage.setItem(INSTALL_DISMISSED_KEY, '1');
    var b = document.getElementById('install-banner');
    if (b) b.remove();
  });

  // iOS: beforeinstallprompt никогда не сработает, поэтому показываем
  // баннер сами по таймеру, если сайт открыт в Safari не как standalone.
  if (isIOS() && !isStandalone()) {
    setTimeout(showInstallButton, 8000);
  }

  // Публичный API для вызова из страниц (например, из profile.html)
  window.ShabashkaPWA = {
    install: function () {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then(function (result) {
          deferredPrompt = null;
          if (result.outcome === 'accepted') showToast('Приложение установлено ✓');
        });
      } else if (isIOS()) {
        showIOSInstallInstructions();
      } else {
        showToast('Установка недоступна в этом браузере');
      }
    },
    isInstallable: function () { return !!deferredPrompt || isIOS(); },
    isInstalled: isStandalone,
    showToast: showToast,
  };

  // ===== ЗАПУСК =====
  function initPushOnReturn() {
    var granted = localStorage.getItem('shabashka_push_granted');
    if (!(granted && Notification.permission === 'granted')) return;
    // Переподписываемся на всякий случай (подписка могла истечь) и,
    // если Web Push не настроен на сервере, откатываемся на поллинг —
    // так уведомления продолжат работать даже без VAPID-ключей.
    subscribeToPush().then(function (ok) {
      if (!ok) setTimeout(startJobPolling, 2000);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      registerSW();
      var dismissed = localStorage.getItem('shabashka_push_dismissed');
      var granted = localStorage.getItem('shabashka_push_granted');
      if (!dismissed && !granted) {
        setTimeout(askForPushPermission, 5000);
      }
      initPushOnReturn();
    });
  } else {
    registerSW();
    var dismissed = localStorage.getItem('shabashka_push_dismissed');
    var granted = localStorage.getItem('shabashka_push_granted');
    if (!dismissed && !granted) {
      setTimeout(askForPushPermission, 5000);
    }
    initPushOnReturn();
  }
})();
