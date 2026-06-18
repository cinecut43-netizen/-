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

  function getAdminRole() {
    return localStorage.getItem(ADMIN_ROLE_KEY) || null;
  }

  function setAdminRole(role) {
    if (!ADMIN_ROLES[role]) return false;
    localStorage.setItem(ADMIN_ROLE_KEY, role);
    return true;
  }

  function adminLogout() {
    localStorage.removeItem(ADMIN_ROLE_KEY);
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

  const ACTION_LOG_KEY = 'shabashka_admin_action_log';

  function logAction(description, meta) {
    const role = getAdminRole();
    const entry = {
      id: Date.now() + Math.random().toString(16).slice(2),
      role: role ? ADMIN_ROLES[role].label : 'Неизвестно',
      description: description,
      meta: meta || null,
      timestamp: new Date().toISOString(),
    };
    const log = getActionLog();
    log.unshift(entry);
    // Не даём журналу расти бесконечно в localStorage
    localStorage.setItem(ACTION_LOG_KEY, JSON.stringify(log.slice(0, 200)));
    return entry;
  }

  function getActionLog() {
    try {
      const raw = localStorage.getItem(ACTION_LOG_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  // Демо-история входов — в реальной системе писалась бы при каждой
  // успешной авторизации администратора (IP, устройство, время).
  const LOGIN_HISTORY = [
    { role: 'Super Admin', device: 'Chrome · Windows', location: 'Москва, RU', time: '17 июн, 09:14', status: 'success' },
    { role: 'Moderator', device: 'Safari · macOS', location: 'Санкт-Петербург, RU', time: '17 июн, 08:02', status: 'success' },
    { role: 'Support', device: 'Chrome · Android', location: 'Казань, RU', time: '16 июн, 22:47', status: 'success' },
    { role: 'Неизвестно', device: 'curl/8.1', location: 'Амстердам, NL', time: '16 июн, 03:12', status: 'failed' },
    { role: 'Moderator', device: 'Firefox · Windows', location: 'Москва, RU', time: '15 июн, 17:30', status: 'success' },
  ];

  /* ---------- ПОЛЬЗОВАТЕЛИ ПЛАТФОРМЫ ----------
     Синтетический список для демонстрации раздела «Пользователи» —
     в реальной системе это пришло бы из базы данных. Текущий
     зарегистрированный пользователь (если есть) подмешивается первым,
     чтобы админка показывала и реальные локальные данные. */

  const USERS_KEY = 'shabashka_admin_users_overrides';

  const DEMO_USERS = [
    { id: 1001, name: 'Дмитрий Козлов', email: 'dmitry.kozlov@mail.ru', phone: '+7 900 123-45-67', role: 'worker', city: 'Москва', registeredAt: '2024-03-01', status: 'active', completedOrders: 47, rating: 4.9, verifiedPassport: true },
    { id: 1002, name: 'Андрей Кравцов', email: 'andrey.k@yandex.ru', phone: '+7 916 234-56-78', role: 'worker', city: 'Москва', registeredAt: '2024-05-12', status: 'active', completedOrders: 12, rating: 4.7, verifiedPassport: true },
    { id: 1003, name: 'Сергей Морозов', email: 's.morozov@gmail.com', phone: '+7 925 345-67-89', role: 'worker', city: 'Мытищи', registeredAt: '2024-06-20', status: 'active', completedOrders: 5, rating: 4.5, verifiedPassport: false },
    { id: 1004, name: 'Иван Петров', email: 'petrov.ivan@mail.ru', phone: '+7 903 456-78-90', role: 'worker', city: 'Казань', registeredAt: '2025-01-15', status: 'blocked', completedOrders: 2, rating: 2.1, verifiedPassport: false },
    { id: 1005, name: 'Мария Лебедева', email: 'maria.l@gmail.com', phone: '+7 909 567-89-01', role: 'worker', city: 'Москва', registeredAt: '2025-02-03', status: 'active', completedOrders: 19, rating: 4.8, verifiedPassport: true },
    { id: 1006, name: 'Алексей Соколов', email: 'a.sokolov@yandex.ru', phone: '+7 911 678-90-12', role: 'worker', city: 'Санкт-Петербург', registeredAt: '2025-04-22', status: 'active', completedOrders: 31, rating: 4.95, verifiedPassport: true },
    { id: 2001, name: 'ООО ТрансЛогист', email: 'hr@translogist.ru', phone: '+7 495 111-22-33', role: 'employer', city: 'Москва', registeredAt: '2024-02-10', status: 'active', completedOrders: 0, rating: 4.6, verifiedPassport: true },
    { id: 2002, name: 'СК Горизонт', email: 'office@gorizont-sk.ru', phone: '+7 495 222-33-44', role: 'employer', city: 'Мытищи', registeredAt: '2024-04-18', status: 'active', completedOrders: 0, rating: 4.3, verifiedPassport: true },
    { id: 2003, name: 'Магазин «Уют»', email: 'uyut.shop@mail.ru', phone: '+7 495 333-44-55', role: 'employer', city: 'Химки', registeredAt: '2024-07-02', status: 'active', completedOrders: 0, rating: 4.8, verifiedPassport: false },
    { id: 2004, name: 'Агентство «Праздник»', email: 'info@prazdnik-agency.ru', phone: '+7 495 444-55-66', role: 'employer', city: 'Москва', registeredAt: '2025-01-09', status: 'pending_review', completedOrders: 0, rating: 0, verifiedPassport: false },
    { id: 2005, name: 'ООО Техносфера', email: 'admin@technosfera.ru', phone: '+7 495 555-66-77', role: 'employer', city: 'Москва', registeredAt: '2025-03-30', status: 'active', completedOrders: 0, rating: 4.4, verifiedPassport: true },
  ];

  function readOverrides() {
    try {
      const raw = localStorage.getItem(USERS_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  }

  function saveOverrides(overrides) {
    localStorage.setItem(USERS_KEY, JSON.stringify(overrides));
  }

  // Объединяем демо-пользователей с локальными изменениями (блокировка,
  // смена роли и т.д.), плюс реального текущего пользователя сайта,
  // если он прошёл register.html.
  function getAllUsers() {
    const overrides = readOverrides();
    const merged = DEMO_USERS.map(function (u) {
      return overrides[u.id] ? Object.assign({}, u, overrides[u.id]) : Object.assign({}, u);
    });

    if (Shabashka.isLoggedIn && Shabashka.isLoggedIn()) {
      const current = Shabashka.getUser();
      const currentId = 9999;
      const override = overrides[currentId] || {};
      merged.unshift(Object.assign({
        id: currentId,
        name: current.name,
        email: '—',
        phone: '—',
        role: current.role,
        city: current.city,
        registeredAt: current.registeredAt,
        status: 'active',
        completedOrders: current.completedOrders || 0,
        rating: current.rating || 0,
        verifiedPassport: !!(current.verified && current.verified.passport),
      }, override));
    }

    return merged;
  }

  function getUserById(id) {
    return getAllUsers().find(function (u) { return u.id === Number(id); }) || null;
  }

  function updateUser(id, fields) {
    const overrides = readOverrides();
    overrides[id] = Object.assign({}, overrides[id], fields);
    saveOverrides(overrides);
  }

  function blockUser(id) {
    updateUser(id, { status: 'blocked' });
    logAction('Заблокировал пользователя #' + id);
  }

  function unblockUser(id) {
    updateUser(id, { status: 'active' });
    logAction('Разблокировал пользователя #' + id);
  }

  function deleteUser(id) {
    const overrides = readOverrides();
    overrides[id] = Object.assign({}, overrides[id], { status: 'deleted' });
    saveOverrides(overrides);
    logAction('Удалил пользователя #' + id);
  }

  function changeUserRole(id, newRole) {
    updateUser(id, { role: newRole });
    logAction('Изменил роль пользователя #' + id + ' на «' + newRole + '»');
  }

  function setWorkerVerified(id, verified) {
    updateUser(id, { verifiedPassport: verified, badge: verified ? 'trusted' : null });
    logAction((verified ? 'Подтвердил' : 'Снял подтверждение') + ' аккаунт исполнителя #' + id);
  }

  /* ---------- ЖАЛОБЫ ---------- */
  const COMPLAINTS_KEY = 'shabashka_admin_complaints';

  const DEMO_COMPLAINTS = [
    { id: 1, reporterName: 'Мария Лебедева', targetName: 'Иван Петров', targetUserId: 1004, reason: 'Не пришёл на заказ без предупреждения', date: '16 июн', status: 'open' },
    { id: 2, reporterName: 'ООО ТрансЛогист', targetName: 'Сергей Морозов', targetUserId: 1003, reason: 'Грубое поведение на объекте', date: '15 июн', status: 'open' },
    { id: 3, reporterName: 'Андрей Кравцов', targetName: 'Магазин «Уют»', targetUserId: 2003, reason: 'Задержка оплаты больше недели', date: '14 июн', status: 'resolved' },
    { id: 4, reporterName: 'Алексей Соколов', targetName: 'Иван Петров', targetUserId: 1004, reason: 'Подозрение на фейковый профиль', date: '12 июн', status: 'open' },
  ];

  function getComplaints() {
    try {
      const raw = localStorage.getItem(COMPLAINTS_KEY);
      const stored = raw ? JSON.parse(raw) : null;
      return stored || DEMO_COMPLAINTS;
    } catch (e) {
      return DEMO_COMPLAINTS;
    }
  }

  function resolveComplaint(id) {
    const complaints = getComplaints().map(function (c) {
      return c.id === id ? Object.assign({}, c, { status: 'resolved' }) : c;
    });
    localStorage.setItem(COMPLAINTS_KEY, JSON.stringify(complaints));
    logAction('Закрыл жалобу #' + id);
  }

  function resolveComplaintAndBlock(id) {
    const complaints = getComplaints();
    const complaint = complaints.find(function (c) { return c.id === id; });
    if (complaint && complaint.targetUserId) {
      blockUser(complaint.targetUserId);
    }
    resolveComplaint(id);
    logAction('Заблокировал нарушителя по жалобе #' + id);
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
  function getDashboardStats() {
    const users = getAllUsers().filter(function (u) { return u.status !== 'deleted'; });
    const workers = users.filter(function (u) { return u.role === 'worker'; });
    const employers = users.filter(function (u) { return u.role === 'employer'; });

    const jobs = Shabashka.getAllJobs();
    const activeStatuses = ['new', 'has_responses', 'selected', 'in_progress'];
    const activeJobs = jobs.filter(function (j) { return activeStatuses.includes(j.status); });
    const doneJobs = jobs.filter(function (j) { return j.status === 'done'; });

    const totalResponses = jobs.reduce(function (s, j) { return s + (j.responses || 0); }, 0);

    // Выручка — комиссия 10% со всех завершённых заказов (грубая оценка для демо)
    const revenue = doneJobs.reduce(function (s, j) { return s + Math.round(j.pay * (j.people || 1) * 0.1); }, 0);

    const today = new Date().toISOString().slice(0, 10);
    const newToday = users.filter(function (u) { return u.registeredAt === today; }).length;

    return {
      totalUsers: users.length,
      employersCount: employers.length,
      workersCount: workers.length,
      activeOrders: activeJobs.length,
      doneOrders: doneJobs.length,
      totalResponses: totalResponses,
      revenue: revenue,
      newToday: newToday,
    };
  }

  /* ---------- ПУБЛИЧНЫЙ ЭКСПОРТ ---------- */
  window.ShabashkaAdmin = {
    ADMIN_ROLES: ADMIN_ROLES,
    getAdminRole: getAdminRole,
    setAdminRole: setAdminRole,
    adminLogout: adminLogout,
    canAccessSection: canAccessSection,
    canDo: canDo,

    logAction: logAction,
    getActionLog: getActionLog,
    LOGIN_HISTORY: LOGIN_HISTORY,

    getAllUsers: getAllUsers,
    getUserById: getUserById,
    updateUser: updateUser,
    blockUser: blockUser,
    unblockUser: unblockUser,
    deleteUser: deleteUser,
    changeUserRole: changeUserRole,
    setWorkerVerified: setWorkerVerified,

    getComplaints: getComplaints,
    resolveComplaint: resolveComplaint,
    resolveComplaintAndBlock: resolveComplaintAndBlock,

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

    getDashboardStats: getDashboardStats,
  };
})();
