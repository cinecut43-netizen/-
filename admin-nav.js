/* ============================================================
   ШАБАШКА — навигация админ-панели.
   Подключается после data.js и admin-data.js. Рисует тёмный
   сайдбар с разделами, видимыми в зависимости от текущей роли
   администратора (Super Admin / Moderator / Support).
   ============================================================ */

(function () {
  'use strict';

  if (!window.ShabashkaAdmin) {
    console.error('admin-nav.js требует admin-data.js, подключите его раньше');
    return;
  }

  const A = window.ShabashkaAdmin;

  const ALL_SECTIONS = [
    { id: 'dashboard', href: '/admin', icon: '◧', label: 'Dashboard' },
    { id: 'users', href: '/admin-users', icon: '◍', label: 'Пользователи' },
    { id: 'orders', href: '/admin-orders', icon: '▤', label: 'Заказы' },
    { id: 'workers', href: '/admin-workers', icon: '◑', label: 'Исполнители' },
    { id: 'reviews', href: '/admin-reviews', icon: '★', label: 'Отзывы' },
    { id: 'complaints', href: '/admin-complaints', icon: '⚠', label: 'Жалобы' },
    { id: 'finance', href: '/admin-finance', icon: '◈', label: 'Финансы' },
    { id: 'settings', href: '/admin-settings', icon: '⚙', label: 'Настройки' },
    { id: 'content', href: '/admin-content', icon: '▦', label: 'Контент' },
    { id: 'security', href: '/admin-security', icon: '◎', label: 'Безопасность' },
  ];

  const NAV_STYLE_ID = 'admin-nav-style';

  function injectStyle() {
    if (document.getElementById(NAV_STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = NAV_STYLE_ID;
    style.textContent = `
      :root {
        --adm-bg: #0F1115; --adm-bg-soft: #161922; --adm-border: #232733;
        --adm-text: #E7E9EE; --adm-text-dim: #8A8F9C; --adm-accent: #E8510A;
        --adm-accent-soft: rgba(232,81,10,0.12);
      }
      .adm-shell { display: flex; min-height: 100vh; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #F7F7F5; }
      .adm-sidebar { width: 240px; background: var(--adm-bg); color: var(--adm-text); flex-shrink: 0; display: flex; flex-direction: column; position: fixed; top: 0; left: 0; height: 100vh; z-index: 100; }
      .adm-logo { padding: 22px 20px 18px; font-size: 17px; font-weight: 700; letter-spacing: -0.3px; border-bottom: 1px solid var(--adm-border); display: flex; align-items: center; gap: 8px; }
      .adm-logo span { color: var(--adm-accent); }
      .adm-logo-tag { font-size: 10px; font-weight: 600; color: var(--adm-text-dim); background: var(--adm-bg-soft); padding: 2px 6px; border-radius: 4px; letter-spacing: 0.4px; }
      .adm-nav { flex: 1; padding: 12px 10px; overflow-y: auto; }
      .adm-nav-item {
        display: flex; align-items: center; gap: 10px; padding: 9px 12px; border-radius: 8px;
        font-size: 13.5px; font-weight: 500; color: var(--adm-text-dim); text-decoration: none;
        margin-bottom: 2px; transition: background 0.12s, color 0.12s;
      }
      .adm-nav-item:hover { background: var(--adm-bg-soft); color: var(--adm-text); }
      .adm-nav-item.active { background: var(--adm-accent-soft); color: #FF8552; font-weight: 600; }
      .adm-nav-icon { width: 16px; text-align: center; font-size: 14px; flex-shrink: 0; }
      .adm-role-box { padding: 14px; border-top: 1px solid var(--adm-border); }
      .adm-role-pill { display: flex; align-items: center; gap: 8px; padding: 8px 10px; background: var(--adm-bg-soft); border-radius: 8px; margin-bottom: 8px; }
      .adm-role-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
      .adm-role-name { font-size: 12.5px; font-weight: 600; }
      .adm-role-switch-btn { width: 100%; padding: 7px; background: none; border: 1px solid var(--adm-border); border-radius: 7px; color: var(--adm-text-dim); font-size: 11.5px; cursor: pointer; font-family: inherit; }
      .adm-role-switch-btn:hover { color: var(--adm-text); border-color: #3A3F4D; }

      .adm-main { flex: 1; margin-left: 240px; min-width: 0; }
      .adm-topbar { background: #FFFFFF; border-bottom: 1px solid #E5E4E0; height: 60px; display: flex; align-items: center; padding: 0 28px; gap: 16px; position: sticky; top: 0; z-index: 50; }
      .adm-page-title { font-size: 17px; font-weight: 700; color: #14151A; letter-spacing: -0.2px; }
      .adm-topbar-right { margin-left: auto; display: flex; align-items: center; gap: 10px; }
      .adm-search-input { width: 280px; padding: 8px 12px; border: 1px solid #E5E4E0; border-radius: 8px; font-size: 13px; font-family: inherit; outline: none; background: #FAFAF9; }
      .adm-search-input:focus { border-color: var(--adm-accent); background: #fff; }
      .adm-content { padding: 28px; max-width: 1320px; }

      .adm-denied { padding: 60px 28px; text-align: center; color: #8A8F9C; }
      .adm-denied-title { font-size: 18px; font-weight: 700; color: #14151A; margin-bottom: 8px; }

      @media (max-width: 900px) {
        .adm-sidebar { transform: translateX(-100%); transition: transform 0.2s; }
        .adm-sidebar.adm-open { transform: translateX(0); }
        .adm-main { margin-left: 0; }
        .adm-search-input { width: 160px; }
      }
    `;
    document.head.appendChild(style);
  }

  // Рисует сайдбар + топбар, оборачивая существующий контент страницы.
  // pageTitle — заголовок в топбаре, activeSection — id текущего раздела.
  // Возвращает Promise<boolean> — true, если контент страницы можно
  // рисовать дальше; вызывающая HTML-страница должна делать:
  //   ShabashkaAdminNav.renderAdminShell('section', 'Заголовок').then(rendered => { ... });
  function renderAdminShell(activeSection, pageTitle) {
    injectStyle();

    const role = A.getAdminRole();

    // Нет роли вообще — сразу экран входа, без обращения к серверу
    if (!role) {
      document.body.innerHTML = renderRoleGate();
      attachRoleGateHandlers();
      return Promise.resolve(false);
    }

    // Роль есть локально, но реальную валидность токена решает только
    // сервер — он единственный, кто знает секрет подписи. Пока идёт
    // проверка, показываем простой экран загрузки.
    document.body.innerHTML = '<div style="min-height:100vh;display:flex;align-items:center;justify-content:center;font-family:-apple-system,sans-serif;color:#8A8F9C">Проверяем доступ…</div>';

    return A.verifyTokenWithServer(role).then(function (valid) {
      if (!valid) {
        A.adminLogout();
        document.body.innerHTML = renderRoleGate();
        attachRoleGateHandlers();
        return false;
      }

      // Роль выбрана, токен подтверждён сервером, но у роли нет доступа
      // к этому разделу
      if (!A.canAccessSection(activeSection)) {
        const bodyHtml = renderShellSkeleton(activeSection, pageTitle);
        document.body.innerHTML = bodyHtml;
        document.getElementById('admContentRoot').innerHTML = `
          <div class="adm-denied">
            <div class="adm-denied-title">Доступ ограничен</div>
            <div>Роль «${A.ADMIN_ROLES[role].label}» не имеет доступа к разделу «${pageTitle}».</div>
          </div>`;
        attachShellHandlers();
        return false;
      }

      const bodyHtml = renderShellSkeleton(activeSection, pageTitle);
      document.body.innerHTML = bodyHtml;
      attachShellHandlers();
      return true;
    });
  }

  function renderShellSkeleton(activeSection, pageTitle) {
    const role = A.getAdminRole();
    const roleInfo = A.ADMIN_ROLES[role];
    const visibleSections = ALL_SECTIONS.filter(function (s) {
      return A.canAccessSection(s.id);
    });

    const navHtml = visibleSections.map(function (s) {
      const active = s.id === activeSection ? ' active' : '';
      return `<a class="adm-nav-item${active}" href="${s.href}">
        <span class="adm-nav-icon">${s.icon}</span><span>${s.label}</span>
      </a>`;
    }).join('');

    return `
    <div class="adm-shell">
      <aside class="adm-sidebar" id="admSidebar">
        <div class="adm-logo">Шаба<span>шка</span> <span class="adm-logo-tag">ADMIN</span></div>
        <nav class="adm-nav">${navHtml}</nav>
        <div class="adm-role-box">
          <div class="adm-role-pill">
            <span class="adm-role-dot" style="background:${roleInfo.color}"></span>
            <span class="adm-role-name">${roleInfo.label}</span>
          </div>
          <button class="adm-role-switch-btn" id="admSwitchRoleBtn">Сменить роль</button>
        </div>
      </aside>
      <div class="adm-main">
        <div class="adm-topbar">
          <button class="adm-burger" id="admBurger" style="display:none;border:none;background:none;font-size:18px;cursor:pointer">☰</button>
          <div class="adm-page-title">${pageTitle}</div>
          <div class="adm-topbar-right">
            <input class="adm-search-input" placeholder="Поиск по платформе…" id="admGlobalSearch">
            <a href="/" style="font-size:12px;color:#8A8F9C;text-decoration:none">← На сайт</a>
          </div>
        </div>
        <div class="adm-content" id="admContentRoot"></div>
      </div>
    </div>`;
  }

  function renderRoleGate() {
    const roles = A.ADMIN_ROLES;
    const cards = Object.keys(roles).map(function (key) {
      const r = roles[key];
      return `
        <div class="role-gate-card" data-role="${key}">
          <div class="role-gate-dot" style="background:${r.color}"></div>
          <div class="role-gate-name">${r.label}</div>
          <div class="role-gate-desc">${r.description}</div>
        </div>`;
    }).join('');

    return `
    <style>
      body { margin:0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0F1115; min-height: 100vh; display:flex; align-items:center; justify-content:center; }
      .role-gate { width: 480px; max-width: 92vw; }
      .role-gate-title { color: #fff; font-size: 22px; font-weight: 700; margin-bottom: 6px; text-align:center; }
      .role-gate-sub { color: #8A8F9C; font-size: 13.5px; text-align:center; margin-bottom: 28px; }
      .role-gate-card {
        background: #161922; border: 1px solid #232733; border-radius: 12px; padding: 18px 20px;
        margin-bottom: 10px; cursor: pointer; transition: border-color 0.15s, background 0.15s;
      }
      .role-gate-card:hover { border-color: #3A3F4D; background: #1B1F2B; }
      .role-gate-dot { width: 10px; height: 10px; border-radius: 50%; margin-bottom: 10px; }
      .role-gate-name { color: #fff; font-size: 15px; font-weight: 700; margin-bottom: 4px; }
      .role-gate-desc { color: #8A8F9C; font-size: 12.5px; line-height: 1.5; }
      .role-gate-back { color: #8A8F9C; font-size: 12.5px; cursor: pointer; margin-bottom: 16px; display: inline-block; }
      .role-gate-back:hover { color: #fff; }
      .role-gate-input {
        width: 100%; padding: 11px 14px; background: #161922; border: 1px solid #232733; border-radius: 9px;
        color: #fff; font-size: 14px; font-family: inherit; outline: none; margin-bottom: 12px; box-sizing: border-box;
      }
      .role-gate-input:focus { border-color: #E8510A; }
      .role-gate-submit {
        width: 100%; padding: 11px; background: #E8510A; color: #fff; border: none; border-radius: 9px;
        font-size: 14px; font-weight: 600; cursor: pointer; font-family: inherit;
      }
      .role-gate-submit:disabled { background: #3A3F4D; cursor: not-allowed; }
      .role-gate-error { color: #FF8552; font-size: 12.5px; margin-bottom: 12px; min-height: 16px; }
    </style>
    <div class="role-gate" id="roleGateRoot">
      <div class="role-gate-title">Шаба<span style="color:#E8510A">шка</span> Admin</div>
      <div class="role-gate-sub" id="roleGateSub">Выберите роль администратора, чтобы продолжить</div>
      <div id="roleGateCards">${cards}</div>
    </div>`;
  }

  function renderPasswordStep(roleKey) {
    const r = A.ADMIN_ROLES[roleKey];
    document.getElementById('roleGateSub').textContent = 'Введите пароль для роли «' + r.label + '»';
    document.getElementById('roleGateCards').innerHTML = `
      <span class="role-gate-back" id="roleGateBack">← Выбрать другую роль</span>
      <input type="password" class="role-gate-input" id="roleGatePassword" placeholder="Пароль" autofocus>
      <div class="role-gate-error" id="roleGateError"></div>
      <button class="role-gate-submit" id="roleGateSubmit">Войти</button>
    `;

    document.getElementById('roleGateBack').addEventListener('click', function () {
      document.body.innerHTML = renderRoleGate();
      attachRoleGateHandlers();
    });

    const passwordInput = document.getElementById('roleGatePassword');
    const submitBtn = document.getElementById('roleGateSubmit');
    const errorBox = document.getElementById('roleGateError');

    function doLogin() {
      const password = passwordInput.value;
      if (!password) {
        errorBox.textContent = 'Введите пароль';
        return;
      }
      submitBtn.disabled = true;
      submitBtn.textContent = 'Проверяем…';
      errorBox.textContent = '';

      fetch('/api/admin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: roleKey, password: password }),
      })
        .then(function (res) { return res.json().then(function (data) { return { status: res.status, data: data }; }); })
        .then(function (result) {
          if (result.data.ok) {
            A.setAdminRole(roleKey);
            A.setAdminToken(result.data.token);
            A.logAction('Вошёл в админ-панель');
            window.location.reload();
          } else {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Войти';
            errorBox.textContent = result.data.error || 'Не удалось войти';
          }
        })
        .catch(function () {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Войти';
          errorBox.textContent = 'Не удалось связаться с сервером, попробуйте ещё раз';
        });
    }

    submitBtn.addEventListener('click', doLogin);
    passwordInput.addEventListener('keydown', function (e) { if (e.key === 'Enter') doLogin(); });
  }

  function attachRoleGateHandlers() {
    document.querySelectorAll('.role-gate-card').forEach(function (card) {
      card.addEventListener('click', function () {
        renderPasswordStep(card.getAttribute('data-role'));
      });
    });
  }

  function attachShellHandlers() {
    const switchBtn = document.getElementById('admSwitchRoleBtn');
    if (switchBtn) {
      switchBtn.addEventListener('click', function () {
        A.adminLogout();
        window.location.reload();
      });
    }
    const burger = document.getElementById('admBurger');
    const sidebar = document.getElementById('admSidebar');
    if (burger && sidebar) {
      burger.addEventListener('click', function () { sidebar.classList.toggle('adm-open'); });
    }
    const search = document.getElementById('admGlobalSearch');
    if (search) {
      search.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && search.value.trim()) {
          window.location.href = '/admin-users?q=' + encodeURIComponent(search.value.trim());
        }
      });
    }
  }

  window.ShabashkaAdminNav = {
    renderAdminShell: renderAdminShell,
  };
})();
