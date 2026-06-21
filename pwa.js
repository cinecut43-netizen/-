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
      })
      .catch(function (err) {
        console.warn('[PWA] Service Worker не зарегистрирован:', err);
      });
  }

  // ===== PUSH-УВЕДОМЛЕНИЯ =====
  // Показываем запрос на уведомления только исполнителям,
  // только после регистрации, и только один раз — не раздражаем людей.
  function askForPushPermission() {
    if (!('Notification' in window)) return;
    if (!('serviceWorker' in navigator)) return;
    if (Notification.permission !== 'default') return; // уже ответил

    // Проверяем что пользователь залогинен и он исполнитель
    if (!window.Shabashka) return;
    var user;
    try { user = Shabashka.getUser(); } catch (e) { return; }
    if (!user || user.role !== 'worker') return;

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
          showToast('Уведомления включены ✓');
          startJobPolling(); // сразу начинаем следить за заказами
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

  // ===== POLLING НОВЫХ СРОЧНЫХ ЗАКАЗОВ =====
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
  // когда браузер видит manifest + SW. Можно перехватить событие
  // и показать свою кнопку вместо стандартного пузыря.
  var deferredPrompt = null;

  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    deferredPrompt = e;

    // Показываем кнопку установки в профиле если функция есть
    if (window.showInstallButton) window.showInstallButton();
  });

  // Публичный API для вызова из страниц (например, из profile.html)
  window.ShabashkaPWA = {
    install: function () {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then(function (result) {
        deferredPrompt = null;
        if (result.outcome === 'accepted') {
          showToast('Приложение установлено ✓');
        }
      });
    },
    isInstallable: function () { return !!deferredPrompt; },
    showToast: showToast,
  };

  // ===== ЗАПУСК =====
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      registerSW();
      var dismissed = localStorage.getItem('shabashka_push_dismissed');
      var granted = localStorage.getItem('shabashka_push_granted');
      if (!dismissed && !granted) {
        setTimeout(askForPushPermission, 5000);
      }
      if (granted && Notification.permission === 'granted') {
        setTimeout(startJobPolling, 2000);
      }
    });
  } else {
    registerSW();
    var dismissed = localStorage.getItem('shabashka_push_dismissed');
    var granted = localStorage.getItem('shabashka_push_granted');
    if (!dismissed && !granted) {
      setTimeout(askForPushPermission, 5000);
    }
    // Если разрешение уже было выдано — сразу запускаем polling
    if (granted && Notification.permission === 'granted') {
      setTimeout(startJobPolling, 2000);
    }
  }
})();
