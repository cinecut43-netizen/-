/* ============================================================
   ШАБАШКА — уведомление об использовании localStorage (152-ФЗ).
   Подключается тегом <script src="/cookie-banner.js"></script>
   на любой странице, независимо от data.js/nav.js — работает
   самостоятельно, чтобы баннер видели и незалогиненные посетители
   (лендинг, регистрация) — именно им важнее всего это увидеть.
   ============================================================ */
(function () {
  'use strict';

  var KEY = 'shabashka_cookie_consent';

  function init() {
    try {
      if (localStorage.getItem(KEY)) return;
    } catch (e) { return; } // localStorage недоступен (приватный режим и т.п.) — не мешаем

    if (document.getElementById('cookie-consent-banner')) return;

    var banner = document.createElement('div');
    banner.id = 'cookie-consent-banner';
    banner.innerHTML =
      '<div style="flex:1;font-size:13px;line-height:1.5;color:#14151A">' +
      'Сайт использует localStorage браузера для хранения данных вашей сессии (вход, настройки, черновики). ' +
      'Продолжая пользоваться сайтом, вы соглашаетесь с ' +
      '<a href="/privacy" target="_blank" style="color:#E8510A;text-decoration:underline">Политикой обработки персональных данных</a>.' +
      '</div>' +
      '<button id="cookie-consent-ok" style="flex-shrink:0;padding:9px 18px;background:#E8510A;color:#fff;border:none;border-radius:9px;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;white-space:nowrap">Понятно</button>';

    Object.assign(banner.style, {
      position: 'fixed', left: '0', right: '0', bottom: '0',
      background: '#fff', borderTop: '1px solid #E5E4E0',
      padding: '14px 20px', display: 'flex', alignItems: 'center', gap: '16px',
      zIndex: '9998', boxShadow: '0 -4px 20px rgba(0,0,0,0.08)',
      flexWrap: 'wrap',
    });

    document.body.appendChild(banner);

    document.getElementById('cookie-consent-ok').addEventListener('click', function () {
      try { localStorage.setItem(KEY, '1'); } catch (e) {}
      banner.remove();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
