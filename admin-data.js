/* ============================================================
   ШАБАШКА — данные и логика для админ-панели.
   Подключается ПОСЛЕ data.js и admin-nav.js на каждой странице
   вида admin*.html. Расширяет общий Shabashka реальными данными
   платформы (заказы, отзывы — те же, что видят работодатель и
   исполнитель) и добавляет то, что существует только в админке:
   пользователей, роли, права, жалобы, журнал действий, настройки.
   ============================================================ */

(function () {
  'use strict';

  if (!window.Shabashka) {
    console.error('admin-data.js требует data.js, подключите его раньше');
    return;
  }

  const Shabashka = window.Shabashka;

  /* ---------- РОЛИ И ПРАВА ДОСТУПА ----------
     Три роли администратора с разным набором разрешённых разделов
     и действий. canAccess() / canDo() — единая точка проверки,
     все admin-страницы должны спрашивать именно через них, а не
     хардкодить условия по имени роли. */

  const ADMIN_ROLES = {
    super_admin: {
      label: 'Super Admin',
      description: 'Полный доступ ко всем разделам и настройкам платформы',
      color: '#B33D06',
    },
    moderator: {
      label: 'Moderator',
      description: 'Модерация контента, пользователей, заказов, отзывов и жалоб',
      color: '#185FA5',
    },
    support: {
      label: 'Support',
      description: 'Просмотр данных и работа с обращениями, без деструктивных действий',
      color: '#1A7A4A',
    },
  };

  // Разделы, видимые в навигации каждой роли
  const SECTIONS_BY_ROLE = {
    super_admin: ['dashboard', 'users', 'orders', 'workers', 'reviews', 'complaints', 'finance', 'settings', 'content', 'security'],
    moderator: ['dashboard', 'users', 'orders', 'workers', 'reviews', 'complaints', 'content'],
    support: ['dashboard', 'users', 'orders', 'reviews', 'complaints'],
  };

  // Конкретные действия (кнопки), доступные по ролям. Если действие не
  // перечислено для роли — кнопка должна быть скрыта или задизейблена.
  const ACTIONS_BY_ROLE = {
    super_admin: [
      'user.block', 'user.unblock', 'user.delete', 'user.changeRole',
      'order.edit', 'order.delete', 'order.forceClose', 'order.changeStatus',
      'worker.verify', 'worker.block',
      'review.delete', 'review.hide',
      'complaint.resolve', 'complaint.blockUser',
      'finance.export',
      'settings.edit', 'content.edit', 'security.bulkBlock',
    ],
    moderator: [
      'user.block', 'user.unblock', 'user.changeRole',
      'order.edit', 'order.forceClose', 'order.changeStatus',
      'worker.verify', 'worker.block',
      'review.delete', 'review.hide',
      'complaint.resolve', 'complaint.blockUser',
      'content.edit',
    ],
    support: [
      'user.block',
      'complaint.resolve',
    ],
  };

  const ADMIN_ROLE_KEY = 'shabashka_admin_role';
  const ADMIN_TOKEN_KEY = 'shabashka_admin_token';

  function getAdminRole() {
    return localStorage.getItem(ADMIN_ROLE_KEY) || null;
  }

  function setAdminRole(role) {
    if (!ADMIN_ROLES[role]) return false;
    localStorage.setItem(ADMIN_ROLE_KEY, role);
    return true;
  }

  function setAdminToken(token) {
    localStorage.setItem(ADMIN_TOKEN_KEY, token);
  }

  function getAdminToken() {
    return localStorage.getItem(ADMIN_TOKEN_KEY) || null;
  }

  // УСТАРЕЛО: токен теперь подписан секретом, который знает только сервер,
  // поэтому окончательное решение о валидности должен принимать сервер
  // (см. verifyTokenWithServer). Эта функция оставлена только как быстрая
  // проверка "есть ли вообще что проверять" перед сетевым запросом.
  function isTokenValid() {
    const role = getAdminRole();
    const token = localStorage.getItem(ADMIN_TOKEN_KEY);
    return !!(role && token);
  }

  // Спрашивает сервер, действителен ли токен для данной роли. Возвращает
  // Promise<boolean>. Сервер проверяет HMAC-подпись секретом, который
  // никогда не передаётся в браузер — подделать токен без него
  // математически нереалистично.
  function verifyTokenWithServer(role) {
    const token = localStorage.getItem(ADMIN_TOKEN_KEY);
    if (!token) return Promise.resolve(false);

    return fetch('/api/admin-verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: token, role: role }),
    })
      .then(function (res) { return res.json(); })
      .then(function (data) { return !!data.valid; })
      .catch(function () { return false; });
  }

  function adminLogout() {
    localStorage.removeItem(ADMIN_ROLE_KEY);
    localStorage.removeItem(ADMIN_TOKEN_KEY);
  }

  function canAccessSection(section) {
    const role = getAdminRole();
    if (!role) return false;
    return SECTIONS_BY_ROLE[role].includes(section);
  }

  function canDo(action) {
    const role = getAdminRole();
    if (!role) return false;
    return ACTIONS_BY_ROLE[role].includes(action);
  }

  /* ---------- ЖУРНАЛ ДЕЙСТВИЙ АДМИНИСТРАТОРА ----------
     Каждое значимое действие (блокировка, удаление, смена статуса и
     т.д.) должно логироваться через logAction() — это и есть раздел
     «Безопасность → журнал действий администраторов». */

  // Раньше журнал писался только в localStorage браузера того, кто сейчас
  // залогинен — у каждого свой, ни с кем не общий, пропадал при чистке
  // браузера. Теперь пишем и читаем через настоящий API, в базе данных,
  // общий для всех администраторов.
  function logAction(description, meta) {
    const role = getAdminRole();
    fetch('/api/admin-log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        adminToken: getAdminToken(),
        adminRole: role,
        description: description,
        meta: meta || null,
      }),
    }).catch(function (e) { console.error('Не удалось записать действие в журнал:', e); });
    return { role: role ? ADMIN_ROLES[role].label : 'Неизвестно', description: description, meta: meta || null };
  }

  function getActionLog() {
    return fetch('/api/admin-log?adminToken=' + encodeURIComponent(getAdminToken()) + '&adminRole=' + encodeURIComponent(getAdminRole()))
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (!data.ok) return [];
        return data.items.map(function (i) {
          return {
            role: ADMIN_ROLES[i.role] ? ADMIN_ROLES[i.role].label : i.role,
            description: i.description,
            meta: i.meta,
            timestamp: i.created_at,
            deviceInfo: i.device_info,
          };
        });
      })
      .catch(function () { return []; });
  }

  // Настоящая история входов — это те же записи журнала действий с
  // description "Вход в систему", просто отдельным запросом.
  function getLoginHistory() {
    return fetch('/api/admin-log?type=login&adminToken=' + encodeURIComponent(getAdminToken()) + '&adminRole=' + encodeURIComponent(getAdminRole()))
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (!data.ok) return [];
        return data.items.map(function (i) {
          var meta = {};
          try { meta = i.meta || {}; } catch (e) {}
          return {
            role: ADMIN_ROLES[i.role] ? ADMIN_ROLES[i.role].label : (i.role || 'Неизвестно'),
            device: i.device_info || 'неизвестное устройство',
            location: i.ip || '—',
            time: new Date(i.created_at).toLocaleString('ru'),
            status: meta.success ? 'success' : 'failed',
          };
        });
      })
      .catch(function () { return []; });
  }

  /* ---------- ПОЛЬЗОВАТЕЛИ ПЛАТФОРМЫ ----------
     Синтетический список для демонстрации раздела «Пользователи» —
     в реальной системе это пришло бы из базы данных. Текущий
     зарегистрированный пользователь (если есть) подмешивается первым,
     чтобы админка показывала и реальные локальные данные. */

  // Реальные пользователи из БД — раньше здесь был захардкоженный
  // DEMO_USERS (11 выдуманных людей) с "изменениями" поверх него в
  // localStorage. Админка показывала не настоящих пользователей сайта,
  // а вымышленный список. Теперь все операции идут прямо в БД.
  function adminFetch(url, options) {
    var token = getAdminToken();
    var role = getAdminRole();
    var sep = url.indexOf('?') === -1 ? '?' : '&';
    if (!options || options.method === 'GET' || !options.method) {
      return fetch(url + sep + 'adminToken=' + encodeURIComponent(token) + '&adminRole=' + encodeURIComponent(role))
        .then(function (r) { return r.json(); });
    }
    var body = options.body ? JSON.parse(options.body) : {};
    body.adminToken = token;
    body.adminRole = role;
    return fetch(url, {
      method: options.method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).then(function (r) { return r.json(); });
  }

  // Возвращает Promise<Array<user>>. params: { role, status, q }
  function getAllUsers(params) {
    params = params || {};
    var qs = Object.keys(params).filter(function(k){ return params[k]; })
      .map(function(k){ return k + '=' + encodeURIComponent(params[k]); }).join('&');
    return adminFetch('/api/admin-users' + (qs ? '?' + qs : ''))
      .then(function (data) {
        if (!data.ok) { console.error('Admin API error:', data.error || data); return []; }
        return data.users.map(normalizeUser);
      })
      .catch(function (err) { console.error('Admin API error:', err); return []; });
  }

  function normalizeUser(u) {
    return {
      id: u.id,
      name: u.name || 'Без имени',
      phone: u.phone,
      email: '—', // email в модели не собирается — регистрация только по телефону
      role: u.role,
      city: u.city || '—',
      registeredAt: u.created_at ? u.created_at.slice(0, 10) : '',
      status: u.status || 'active',
      completedOrders: u.jobs_done || 0,
      rating: u.rating ? Number(u.rating) : 0,
      verifiedPassport: !!u.verified,
    };
  }

  function getUserById(id) {
    return adminFetch('/api/admin-users?id=' + id).then(function (data) {
      return data.ok ? normalizeUser(data.user) : null;
    });
  }

  function blockUser(id) {
    return adminFetch('/api/admin-users', { method: 'PATCH', body: JSON.stringify({ id: id, status: 'blocked' }) })
      .then(function () { logAction('Заблокировал пользователя #' + id); });
  }

  function unblockUser(id) {
    return adminFetch('/api/admin-users', { method: 'PATCH', body: JSON.stringify({ id: id, status: 'active' }) })
      .then(function () { logAction('Разблокировал пользователя #' + id); });
  }

  function deleteUser(id) {
    return adminFetch('/api/admin-users', { method: 'PATCH', body: JSON.stringify({ id: id, status: 'deleted' }) })
      .then(function () { logAction('Удалил пользователя #' + id); });
  }

  function changeUserRole(id, newRole) {
    return adminFetch('/api/admin-users', { method: 'PATCH', body: JSON.stringify({ id: id, role: newRole }) })
      .then(function () { logAction('Изменил роль пользователя #' + id + ' на «' + newRole + '»'); });
  }

  function setWorkerVerified(id, verified) {
    return adminFetch('/api/admin-verifications', { method: 'PATCH', body: JSON.stringify({ userId: id, decision: verified ? 'approved' : 'rejected' }) })
      .then(function () { logAction((verified ? 'Подтвердил' : 'Снял подтверждение') + ' аккаунт исполнителя #' + id); });
  }

  /* ---------- ЗАКАЗЫ (для админки — все, любого работодателя и статуса) ---------- */
  function normalizeOrder(j) {
    return {
      id: j.id,
      emoji: j.emoji || '📦',
      title: j.title,
      company: j.employer_name || 'Работодатель',
      pay: parseInt(j.pay),
      payLabel: j.pay_label || 'за день',
      date: j.date || (j.created_at ? j.created_at.slice(0, 10) : ''),
      status: j.status,
      responses: parseInt(j.responses_count) || 0,
      desc: j.description || '',
    };
  }

  function getAllOrders(params) {
    params = params || {};
    var qs = Object.keys(params).filter(function(k){ return params[k]; })
      .map(function(k){ return k + '=' + encodeURIComponent(params[k]); }).join('&');
    return adminFetch('/api/admin-orders' + (qs ? '?' + qs : ''))
      .then(function (data) {
        if (!data.ok) { console.error('Admin API error:', data.error || data); return []; }
        return data.jobs.map(normalizeOrder);
      })
      .catch(function (err) { console.error('Admin API error:', err); return []; });
  }

  function forceCloseJob(id) {
    return adminFetch('/api/admin-orders', { method: 'PATCH', body: JSON.stringify({ id: id, status: 'cancelled' }) })
      .then(function () { logAction('Принудительно закрыл заказ #' + id); });
  }

  function updateJob(id, fields) {
    var body = Object.assign({ id: id }, fields);
    return adminFetch('/api/admin-orders', { method: 'PATCH', body: JSON.stringify(body) })
      .then(function () { logAction('Отредактировал заказ #' + id); });
  }

  function deleteJobAdmin(id) {
    return adminFetch('/api/admin-orders?id=' + id, { method: 'DELETE' })
      .then(function () { logAction('Удалил заказ #' + id); });
  }

  /* ---------- ЖАЛОБЫ ---------- */

  // Жалобы и споры теперь честно живут в БД (таблицы disputes и complaints).
  // Раньше жалобы были 4 выдуманными примерами, а споры хранились только
  // в localStorage браузера админа.
  function getDisputes() {
    return adminFetch('/api/admin-complaints?kind=disputes')
      .then(function (data) {
        if (!data.ok) { console.error('Admin API error:', data.error || data); return []; }
        return data.disputes;
      })
      .catch(function (err) { console.error('Admin API error:', err); return []; });
  }

  function getComplaints() {
    return adminFetch('/api/admin-complaints?kind=complaints')
      .then(function (data) {
        if (!data.ok) { console.error('Admin API error:', data.error || data); return []; }
        return data.complaints;
      })
      .catch(function (err) { console.error('Admin API error:', err); return []; });
  }

  function resolveComplaint(id) {
    return adminFetch('/api/admin-complaints', { method: 'PATCH', body: JSON.stringify({ kind: 'complaint', id: id, decision: 'resolved' }) })
      .then(function () { logAction('Закрыл жалобу #' + id); });
  }

  function resolveComplaintAndBlock(id, targetUserId) {
    return Promise.all([
      resolveComplaint(id),
      targetUserId ? blockUser(targetUserId) : Promise.resolve(),
    ]).then(function () { logAction('Заблокировал нарушителя по жалобе #' + id); });
  }

  /* ---------- РАЗРЕШЕНИЕ СПОРОВ ----------
     Shabashka.openDispute() переводит заказ в статус disputed и создаёт
     запись спора в БД. Здесь — административная сторона: посмотреть спор
     и принять решение. resolveDisputeRefund возвращает деньги заказчику
     (заказ закрывается как cancelled, эскроу не выплачивается исполнителю).
     resolveDisputeReject отклоняет спор — заказ считается выполненным,
     оплата исполнителю проходит как обычно. */
  function resolveDisputeRefund(disputeId, jobId) {
    return adminFetch('/api/admin-complaints', { method: 'PATCH', body: JSON.stringify({ kind: 'dispute', id: disputeId, decision: 'refunded' }) })
      .then(function () { logAction('Разрешил спор по заказу #' + jobId + ' в пользу заказчика (возврат)'); });
  }

  function resolveDisputeReject(disputeId, jobId) {
    return adminFetch('/api/admin-complaints', { method: 'PATCH', body: JSON.stringify({ kind: 'dispute', id: disputeId, decision: 'rejected' }) })
      .then(function () { logAction('Разрешил спор по заказу #' + jobId + ' в пользу исполнителя (отказ в споре)'); });
  }

  /* ---------- СКРЫТЫЕ/УДАЛЁННЫЕ ОТЗЫВЫ ----------
     Shabashka.getAllReviews() — реальные отзывы с фото из profile.html.
     Здесь храним только админские пометки (скрыт/удалён) поверх них,
     не трогая исходные данные. */
  const REVIEW_FLAGS_KEY = 'shabashka_admin_review_flags';

  function getReviewFlags() {
    try {
      const raw = localStorage.getItem(REVIEW_FLAGS_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  }

  function hideReview(jobId) {
    const flags = getReviewFlags();
    flags[jobId] = 'hidden';
    localStorage.setItem(REVIEW_FLAGS_KEY, JSON.stringify(flags));
    logAction('Скрыл отзыв по заказу #' + jobId);
  }

  function deleteReviewFlag(jobId) {
    const flags = getReviewFlags();
    flags[jobId] = 'deleted';
    localStorage.setItem(REVIEW_FLAGS_KEY, JSON.stringify(flags));
    logAction('Удалил отзыв по заказу #' + jobId);
  }

  function restoreReview(jobId) {
    const flags = getReviewFlags();
    delete flags[jobId];
    localStorage.setItem(REVIEW_FLAGS_KEY, JSON.stringify(flags));
    logAction('Восстановил отзыв по заказу #' + jobId);
  }

  // Отзывы с учётом админских пометок — для публичных страниц (profile.html)
  // в будущем можно фильтровать «deleted»/«hidden», здесь просто возвращаем
  // полную картину с пометками для самой админки.
  function getReviewsWithFlags() {
    const flags = getReviewFlags();
    return Shabashka.getAllReviews().map(function (r) {
      return Object.assign({}, r, { adminStatus: flags[r.jobId] || 'visible' });
    });
  }

  /* ---------- НАСТРОЙКИ ПЛАТФОРМЫ ---------- */
  const SETTINGS_KEY = 'shabashka_admin_settings';

  const DEFAULT_SETTINGS = {
    commissionPercent: 10,
    expressWithdrawFeePercent: 1.5,
    employerSubscriptionPrice: 2990,
    workerProSubscriptionPrice: 490,
    referralBonus: 200,
    notifyNewOrders: true,
    notifyNewComplaints: true,
    notifyLowBalance: true,
  };

  function getSettings() {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      return raw ? Object.assign({}, DEFAULT_SETTINGS, JSON.parse(raw)) : Object.assign({}, DEFAULT_SETTINGS);
    } catch (e) {
      return Object.assign({}, DEFAULT_SETTINGS);
    }
  }

  function updateSettings(fields) {
    const current = getSettings();
    const next = Object.assign(current, fields);
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
    logAction('Изменил настройки платформы', fields);
    return next;
  }

  /* ---------- КОНТЕНТ (категории, города, баннеры, FAQ) ---------- */
  const CONTENT_KEY = 'shabashka_admin_content';

  const DEFAULT_CONTENT = {
    categories: Shabashka.CATEGORIES.filter(function (c) { return c.id !== 'all'; }),
    cities: [
      { id: 1, name: 'Москва', active: true },
      { id: 2, name: 'Санкт-Петербург', active: true },
      { id: 3, name: 'Казань', active: true },
      { id: 4, name: 'Мытищи', active: true },
      { id: 5, name: 'Химки', active: true },
      { id: 6, name: 'Новосибирск', active: false },
    ],
    banners: [
      { id: 1, title: 'Приведи друга — получи 200 ₽', active: true },
      { id: 2, title: 'Подписка PRO для исполнителей', active: true },
      { id: 3, title: 'Летняя акция на размещение заказов', active: false },
    ],
    faq: [
      { id: 1, question: 'Как происходит оплата?', answer: 'Заказчик резервирует сумму на платформе, она переводится исполнителю после подтверждения выполнения работы.' },
      { id: 2, question: 'Какая комиссия платформы?', answer: 'Комиссия составляет 10% от суммы заказа и списывается при подтверждении исполнителя.' },
      { id: 3, question: 'Что делать, если исполнитель не пришёл?', answer: 'Сообщите в поддержку через жалобу — деньги будут возвращены, а исполнитель проверен.' },
    ],
  };

  function getContent() {
    try {
      const raw = localStorage.getItem(CONTENT_KEY);
      return raw ? JSON.parse(raw) : JSON.parse(JSON.stringify(DEFAULT_CONTENT));
    } catch (e) {
      return JSON.parse(JSON.stringify(DEFAULT_CONTENT));
    }
  }

  function saveContent(content) {
    localStorage.setItem(CONTENT_KEY, JSON.stringify(content));
  }

  function toggleCity(id) {
    const content = getContent();
    const city = content.cities.find(function (c) { return c.id === id; });
    if (city) city.active = !city.active;
    saveContent(content);
    logAction('Переключил видимость города #' + id);
  }

  function toggleBanner(id) {
    const content = getContent();
    const banner = content.banners.find(function (b) { return b.id === id; });
    if (banner) banner.active = !banner.active;
    saveContent(content);
    logAction('Переключил баннер #' + id);
  }

  /* ---------- АГРЕГИРОВАННАЯ СТАТИСТИКА ДЛЯ DASHBOARD ---------- */
  /* ---------- ПУБЛИЧНЫЙ ЭКСПОРТ ---------- */
  window.ShabashkaAdmin = {
    ADMIN_ROLES: ADMIN_ROLES,
    getAdminRole: getAdminRole,
    setAdminRole: setAdminRole,
    setAdminToken: setAdminToken,
    isTokenValid: isTokenValid,
    verifyTokenWithServer: verifyTokenWithServer,
    adminLogout: adminLogout,
    canAccessSection: canAccessSection,
    canDo: canDo,

    logAction: logAction,
    getActionLog: getActionLog,
    getLoginHistory: getLoginHistory,

    getAllUsers: getAllUsers,
    getUserById: getUserById,
    blockUser: blockUser,
    unblockUser: unblockUser,
    deleteUser: deleteUser,
    changeUserRole: changeUserRole,
    setWorkerVerified: setWorkerVerified,

    getAllOrders: getAllOrders,
    forceCloseJob: forceCloseJob,
    updateJob: updateJob,
    deleteJobAdmin: deleteJobAdmin,

    getAdminToken: getAdminToken,

    getComplaints: getComplaints,
    resolveComplaint: resolveComplaint,
    resolveComplaintAndBlock: resolveComplaintAndBlock,
    getDisputes: getDisputes,

    resolveDisputeRefund: resolveDisputeRefund,
    resolveDisputeReject: resolveDisputeReject,

    getReviewFlags: getReviewFlags,
    getReviewsWithFlags: getReviewsWithFlags,
    hideReview: hideReview,
    deleteReviewFlag: deleteReviewFlag,
    restoreReview: restoreReview,

    getSettings: getSettings,
    updateSettings: updateSettings,

    getContent: getContent,
    saveContent: saveContent,
    toggleCity: toggleCity,
    toggleBanner: toggleBanner,

  };
})();
