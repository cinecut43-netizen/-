/* ============================================================
   ШАБАШКА — общая навигация для всех страниц.
   Подключается тегом <script src="nav.js"></script> ПОСЛЕ data.js.
   Использование: вызвать Shabashka.renderNav('index') внутри
   контейнера <div id="shabashka-nav"></div> в начале <body>.
   ============================================================ */

(function () {
  'use strict';

  if (!window.Shabashka) {
    console.error('nav.js требует data.js, подключите его раньше');
    return;
  }

  // Пункты меню для роли "исполнитель"
  // Иконки через icons.js — функция icon() доступна после загрузки icons.js
  function ic(name) {
    return window.ShabashkaIcons ? window.ShabashkaIcons.icon(name, 18) : '';
  }

  const WORKER_LINKS = [
    { page: 'index', href: '/', icon: 'search', label: 'Найти работу' },
    { page: 'map', href: '/map', icon: 'map', label: 'Карта' },
    { page: 'chat', href: '/chat', icon: 'message-circle', label: 'Сообщения' },
    { page: 'wallet', href: '/wallet', icon: 'credit-card', label: 'Кошелёк' },
    { page: 'profile', href: '/profile', icon: 'user', label: 'Профиль' },
  ];

  // Пункты меню для роли "работодатель"
  const EMPLOYER_LINKS = [
    { page: 'employer', href: '/employer', icon: 'layout-dashboard', label: 'Кабинет' },
    { page: 'map', href: '/map', icon: 'map', label: 'Карта' },
    { page: 'chat', href: '/chat', icon: 'message-circle', label: 'Сообщения' },
    { page: 'profile', href: '/profile', icon: 'user', label: 'Профиль' },
  ];

  const NAV_STYLE_ID = 'shabashka-nav-style';

  function injectStyle() {
    if (document.getElementById(NAV_STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = NAV_STYLE_ID;
    style.textContent = `
      #shabashka-nav { position: relative; z-index: 1000; }
      .sb-bar {
        background: #FFFFFF; border-bottom: 1px solid #E2E1DB;
        height: 56px; display: flex; align-items: center; gap: 18px;
        padding: 0 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      }
      .sb-logo { font-size: 19px; font-weight: 700; color: #1A1A18; text-decoration: none; letter-spacing: -0.4px; flex-shrink: 0; }
      .sb-logo span { color: #E8510A; }
      .sb-links { display: flex; gap: 4px; flex: 1; }
      .sb-link {
        display: flex; align-items: center; gap: 6px;
        padding: 8px 14px; border-radius: 8px; font-size: 13px; font-weight: 500;
        color: #6B6B67; text-decoration: none; transition: background 0.12s, color 0.12s;
        white-space: nowrap;
      }
      .sb-link:hover { background: #F4F3EF; color: #1A1A18; }
      .sb-link.sb-active { background: #FFF0E8; color: #B33D06; font-weight: 600; }
      .sb-link-icon { display: inline-flex; align-items: center; flex-shrink: 0; }
      .sb-link-icon svg { display: block; }
      .sb-right { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
      .sb-role-toggle {
        display: flex; background: #F4F3EF; border-radius: 8px; padding: 3px; gap: 2px;
      }
      .sb-role-btn {
        border: none; background: none; padding: 6px 12px; border-radius: 6px;
        font-size: 12px; font-weight: 500; color: #6B6B67; cursor: pointer; font-family: inherit;
        transition: all 0.12s;
      }
      .sb-role-btn.sb-active { background: #FFFFFF; color: #1A1A18; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
      .sb-avatar {
        width: 32px; height: 32px; border-radius: 50%;
        background: linear-gradient(135deg, #E8510A, #B33D06);
        display: flex; align-items: center; justify-content: center;
        font-size: 12px; font-weight: 700; color: #fff; flex-shrink: 0;
        text-decoration: none;
      }
      .sb-login-btn {
        padding: 8px 16px; border-radius: 8px; font-size: 13px; font-weight: 600;
        background: var(--orange, #E8510A); color: #fff; text-decoration: none;
        white-space: nowrap; transition: background 0.12s;
      }
      .sb-login-btn:hover { background: #B33D06; }
      .sb-burger {
        display: none; border: none; background: none; font-size: 20px; cursor: pointer; color: #1A1A18;
      }
      .sb-mobile-panel { display: none; flex-direction: column; background: #fff; border-bottom: 1px solid #E2E1DB; padding: 8px 12px 12px; }
      .sb-mobile-panel.sb-open { display: flex; }
      .sb-mobile-panel .sb-link { color: #1A1A18; padding: 10px 14px; }

      /* Компактный режим — для страниц с полноэкранным контентом (карта) */
      .sb-bar.sb-compact { height: 52px; padding: 0 14px; gap: 10px; }
      .sb-bar.sb-compact .sb-links { display: none; }

      @media (max-width: 900px) {
        .sb-links { display: none; }
        .sb-burger { display: block; }
      }
      @media (max-width: 600px) {
        .sb-bar { display: none; }
        .sb-mobile-panel { display: none !important; }
      }
    `;
    document.head.appendChild(style);
  }

  function renderNav(activePage, opts) {
    opts = opts || {};
    injectStyle();

    const container = document.getElementById('shabashka-nav');
    if (!container) {
      console.error('Не найден контейнер <div id="shabashka-nav"></div>');
      return;
    }

    const user = Shabashka.getUser();
    const loggedIn = Shabashka.isLoggedIn ? Shabashka.isLoggedIn() : true;
    const links = user.role === 'employer' ? EMPLOYER_LINKS : WORKER_LINKS;
    const compact = !!opts.compact;

    const linksHtml = links.map(function (l) {
      const active = l.page === activePage ? ' sb-active' : '';
      return '<a class="sb-link' + active + '" href="' + l.href + '">' +
        '<span class="sb-link-icon">' + ic(l.icon) + '</span><span>' + l.label + '</span></a>';
    }).join('');

    const accountHtml = loggedIn
      ? '<a class="sb-avatar" href="/profile" title="' + user.name + '">' + user.initials + '</a>'
      : '<a class="sb-login-btn" href="/register">Войти</a>';

    container.innerHTML =
      '<div class="sb-bar' + (compact ? ' sb-compact' : '') + '">' +
        '<a class="sb-logo" href="/">Шаба<span>шка</span></a>' +
        '<div class="sb-links">' + linksHtml + '</div>' +
        '<div class="sb-right">' +
          '<div class="sb-role-toggle">' +
            '<button class="sb-role-btn' + (user.role === 'worker' ? ' sb-active' : '') + '" data-role="worker">Я исполнитель</button>' +
            '<button class="sb-role-btn' + (user.role === 'employer' ? ' sb-active' : '') + '" data-role="employer">Я работодатель</button>' +
          '</div>' +
          accountHtml +
          '<button class="sb-burger" aria-label="Меню">' + ic('menu') + '</button>' +
        '</div>' +
      '</div>' +
      '<div class="sb-mobile-panel" id="sbMobilePanel">' + linksHtml + '</div>';

    // Переключатель роли
    container.querySelectorAll('.sb-role-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const role = btn.getAttribute('data-role');
        Shabashka.setRole(role);
        // При смене роли ведём на «домашнюю» страницу этой роли
        window.location.href = role === 'employer' ? '/employer' : '/';
      });
    });

    // Мобильное бургер-меню
    const burger = container.querySelector('.sb-burger');
    const panel = container.querySelector('#sbMobilePanel');
    if (burger && panel) {
      burger.addEventListener('click', function () {
        panel.classList.toggle('sb-open');
      });
    }
  }

  Shabashka.renderNav = renderNav;
})();
