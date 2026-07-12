/* ============================================================
   ШАБАШКА — общие данные и утилиты для всех страниц сайта.
   Подключается тегом <script src="data.js"></script> ПЕРЕД nav.js
   и перед скриптом самой страницы.
   ============================================================ */

(function () {
  'use strict';

  /* ---------- ТЕКУЩИЙ ПОЛЬЗОВАТЕЛЬ ---------- */
  // role: 'worker' (я ищу работу) | 'employer' (я ищу работников)
  const DEFAULT_USER = {
    name: 'Дмитрий Козлов',
    initials: 'ДК',
    age: 32,
    city: 'Москва',
    photo: null, // base64 data-URL, если пользователь загрузил фото
    registeredAt: '2024-03-01', // ISO-дата для расчёта «на платформе с...»
    role: localStorage.getItem('shabashka_role') || 'worker',
    company: 'ООО ТрансЛогист', // используется в режиме работодателя
    rating: 4.9,
    reviewsCount: 43,
    completedOrders: 47,
    verified: {
      phone: true,
      passport: true,
    },
  };

  /* ---------- PRO ПОДПИСКА ---------- */
  const PRO_KEY = 'shabashka_pro';

  const PRO_PLANS = [
    {
      id: 'month',
      label: 'На месяц',
      price: 299,
      period: '/ месяц',
      days: 30,
      popular: false,
      perks: ['Приоритет в выдаче заказов', 'До 20 откликов в день', 'Бейдж PRO в профиле', 'Расширенная статистика'],
    },
    {
      id: 'quarter',
      label: 'На 3 месяца',
      price: 199,
      period: '/ месяц',
      days: 90,
      popular: true,
      badge: 'Выгодно −33%',
      perks: ['Приоритет в выдаче заказов', 'До 20 откликов в день', 'Бейдж PRO в профиле', 'Расширенная статистика', 'Срочные заказы первым'],
    },
    {
      id: 'year',
      label: 'На год',
      price: 149,
      period: '/ месяц',
      days: 365,
      popular: false,
      badge: 'Лучшая цена',
      perks: ['Приоритет в выдаче заказов', 'До 20 откликов в день', 'Бейдж PRO в профиле', 'Расширенная статистика', 'Срочные заказы первым', 'Поддержка в приоритете'],
    },
  ];

  function getProStatus() {
    try {
      var raw = localStorage.getItem(PRO_KEY);
      if (!raw) return null;
      var data = JSON.parse(raw);
      if (!data.expiresAt) return null;
      if (Date.now() > data.expiresAt) {
        localStorage.removeItem(PRO_KEY);
        return null;
      }
      return data;
    } catch(e) { return null; }
  }

  function isPro() {
    return getProStatus() !== null;
  }

  function activatePro(planId) {
    var plan = PRO_PLANS.find(function(p){ return p.id === planId; });
    if (!plan) return { ok: false, error: 'Тариф не найден' };
    var expiresAt = Date.now() + plan.days * 24 * 60 * 60 * 1000;
    var data = { planId: planId, activatedAt: Date.now(), expiresAt: expiresAt };
    localStorage.setItem(PRO_KEY, JSON.stringify(data));
    return { ok: true, expiresAt: expiresAt };
  }

  function deactivatePro() {
    localStorage.removeItem(PRO_KEY);
  }

  const MONTHS_RU = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];

  function formatRegisteredDate(isoDate) {
    const d = new Date(isoDate);
    if (isNaN(d.getTime())) return '';
    return MONTHS_RU[d.getMonth()] + ' ' + d.getFullYear();
  }

  function getUser() {
    DEFAULT_USER.role = localStorage.getItem('shabashka_role') || 'worker';

    const savedName = localStorage.getItem('shabashka_name');
    if (savedName) {
      DEFAULT_USER.name = savedName;
      DEFAULT_USER.initials = initialsFromName(savedName);
    }
    const savedCompany = localStorage.getItem('shabashka_company');
    if (savedCompany) DEFAULT_USER.company = savedCompany;

    const savedAge = localStorage.getItem('shabashka_age');
    if (savedAge) DEFAULT_USER.age = Number(savedAge);

    const savedCity = localStorage.getItem('shabashka_city');
    if (savedCity) DEFAULT_USER.city = savedCity;

    const savedPhoto = localStorage.getItem('shabashka_photo');
    DEFAULT_USER.photo = savedPhoto || null;

    const savedRegisteredAt = localStorage.getItem('shabashka_registered_at');
    if (savedRegisteredAt) DEFAULT_USER.registeredAt = savedRegisteredAt;

    const savedVerified = localStorage.getItem('shabashka_verified');
    if (savedVerified) {
      try { DEFAULT_USER.verified = JSON.parse(savedVerified); } catch (e) { /* оставляем дефолт */ }
    }

    return DEFAULT_USER;
  }

  // Сохранить отдельные поля профиля (вызывается из profile.html при сохранении формы)
  function updateProfile(fields) {
    if (fields.name) localStorage.setItem('shabashka_name', fields.name);
    if (fields.city) localStorage.setItem('shabashka_city', fields.city);
    if (fields.age !== undefined && fields.age !== null && fields.age !== '') {
      localStorage.setItem('shabashka_age', String(fields.age));
    }
    if (fields.photo) localStorage.setItem('shabashka_photo', fields.photo);
  }

  function initialsFromName(name) {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return 'Г';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }

  function setRole(role) {
    localStorage.setItem('shabashka_role', role);
  }

  // Является ли текущий посетитель «вошедшим» — пока это эмуляция без
  // реального backend: становится true после прохождения формы регистрации
  // в register.html. Реальная авторизация (сессии, токены) потребует сервер.
  function isLoggedIn() {
    return localStorage.getItem('shabashka_logged_in') === '1';
  }

  // Вызывается из register.html по завершении формы
  function completeRegistration(data) {
    localStorage.setItem('shabashka_logged_in', '1');
    localStorage.setItem('shabashka_role', data.role || 'worker');
    if (data.name) localStorage.setItem('shabashka_name', data.name);
    if (data.company) localStorage.setItem('shabashka_company', data.company);
  }

  function logout() {
    localStorage.removeItem('shabashka_logged_in');
  }

  /* ---------- ЗАКАЗЫ (общий список на весь сайт) ----------
     status: 'new' | 'has_responses' | 'selected' | 'in_progress' | 'done' | 'cancelled'
     - new: заказ опубликован, откликов пока нет
     - has_responses: появился хотя бы один отклик
     - selected: работодатель выбрал исполнителя из откликов
     - in_progress: работа фактически началась
     - done: работа завершена (после этого статуса доступен отзыв)
     - cancelled: заказ отменён на любом этапе
     employer: true — заказ размещён текущим пользователем-работодателем
     (нужно, чтобы кабинет работодателя показывал «свои» заказы) */
  const BASE_JOBS = [];

  const STORAGE_KEY = 'shabashka_user_jobs';
  let nextIdCache = null;

  function getUserJobs() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  function saveUserJobs(jobs) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(jobs));
  }

  // Полный список: встроенные демо-заказы + всё, что добавил пользователь
  function getAllJobs() {
    const userJobs = getUserJobs();
    const overriddenIds = new Set(userJobs.map(function (j) { return j.id; }));
    // Базовые заказы, для которых ещё НЕТ обновлённой версии в userJobs,
    // плюс все записи из userJobs (новые заказы и обновлённые статусы старых).
    // Так изменение статуса не создаёт дубликат с устаревшими данными.
    const baseFiltered = BASE_JOBS.filter(function (j) { return !overriddenIds.has(j.id); });
    return baseFiltered.concat(userJobs);
  }

  function nextJobId() {
    if (nextIdCache === null) {
      const all = getAllJobs();
      nextIdCache = all.reduce(function (max, j) { return Math.max(max, j.id); }, 0);
    }
    nextIdCache += 1;
    return nextIdCache;
  }

  // Заказы, видимые исполнителям на главной/карте — те, что ещё принимают
  // отклики (статусы «новый» и «есть отклики»). Как только исполнитель
  // выбран, заказ исчезает из общей ленты.
  function getOpenJobs() {
    return getAllJobs().filter(function (j) { return j.status === 'new' || j.status === 'has_responses'; });
  }

  // Заказы текущего работодателя (для кабинета employer.html)
  function getEmployerJobs() {
    return getAllJobs().filter(function (j) { return j.employer; });
  }

  function getJob(id) {
    return getAllJobs().find(function (j) { return j.id === Number(id); });
  }

  // Добавить новый заказ от работодателя — сразу появляется у исполнителей
  function addJob(jobData) {
    const job = Object.assign({
      id: nextJobId(),
      status: 'new',
      employer: true,
      responses: 0,
      lat: 55.751,
      lng: 37.618,
      dist: '—',
      colors: ['#E8510A', '#185FA5', '#1A7A4A'],
    }, jobData);
    const userJobs = getUserJobs();
    userJobs.push(job);
    saveUserJobs(userJobs);
    return job;
  }

  // Изменить статус существующего заказа (закрыть, завершить и т.д.)
  function updateJobStatus(id, status) {
    const userJobs = getUserJobs();
    const idx = userJobs.findIndex(function (j) { return j.id === Number(id); });
    if (idx !== -1) {
      userJobs[idx].status = status;
      saveUserJobs(userJobs);
      return true;
    }
    // Заказ из базового набора — клонируем его в userJobs с новым статусом,
    // чтобы не мутировать константу BASE_JOBS
    const base = BASE_JOBS.find(function (j) { return j.id === Number(id); });
    if (base) {
      const clone = Object.assign({}, base, { status: status });
      userJobs.push(clone);
      saveUserJobs(userJobs);
      return true;
    }
    return false;
  }

  /* ---------- ОТКЛИКИ НА ЗАКАЗ ----------
     Исполнитель откликается на заказ и может предложить свою цену вместо
     исходной (если работодатель разрешил торг через allowBargain). Работодатель
     видит все отклики по заказу и выбирает один — это переводит заказ в
     статус selected и автоматически отклоняет остальные отклики по нему. */
  const RESPONSES_KEY = 'shabashka_responses';

  // Демо-отклики на старые заказы, чтобы интерфейс работодателя не был
  // пустым при первом входе — та же роль, что у BASE_JOBS для заказов.
  const BASE_RESPONSES = [
    { id: 1, jobId: 9, workerName: 'Дмитрий К.', workerColor: '#E8510A', workerRating: '4.9 ⭐ (47 заказов)', proposedPay: null, message: 'Готов выйти завтра, опыт 3 года.', status: 'pending', date: '17 июн' },
    { id: 2, jobId: 9, workerName: 'Сергей М.', workerColor: '#185FA5', workerRating: '4.7 ⭐ (31 заказ)', proposedPay: null, message: 'Физически крепкий, инструмент свой.', status: 'pending', date: '17 июн' },
    { id: 3, jobId: 13, workerName: 'Алёна П.', workerColor: '#1A7A4A', workerRating: '5.0 ⭐ (22 заказа)', proposedPay: null, message: 'Коммуникабельная, презентабельный вид.', status: 'pending', date: '16 июн' },
    { id: 4, jobId: 13, workerName: 'Марина С.', workerColor: '#9B59B6', workerRating: '4.8 ⭐ (19 заказов)', proposedPay: null, message: 'Работала промоутером 2 года.', status: 'pending', date: '16 июн' },
    { id: 5, jobId: 14, workerName: 'Иван Г.', workerColor: '#B33D06', workerRating: '4.6 ⭐ (55 заказов)', proposedPay: 4500, message: 'Готов за 4500, есть свой инструмент и опыт именно с такими объектами.', status: 'pending', date: '15 июн' },
    { id: 6, jobId: 14, workerName: 'Олег Т.', workerColor: '#185FA5', workerRating: '4.9 ⭐ (40 заказов)', proposedPay: null, message: 'Подсобные работы — моё.', status: 'pending', date: '15 июн' },
    { id: 7, jobId: 13, workerName: 'Наталья В.', workerColor: '#1A7A4A', workerRating: '5.0 ⭐ (28 заказов)', proposedPay: null, message: 'Доброжелательная, энергичная.', status: 'pending', date: '14 июн' },
    { id: 8, jobId: 9, workerName: 'Роман Д.', workerColor: '#854F0B', workerRating: '4.5 ⭐ (15 заказов)', proposedPay: 3000, message: 'Могу за 3000, если нужно — выйду уже сегодня вечером.', status: 'pending', date: '17 июн' },
  ];

  function readResponses() {
    try {
      const raw = localStorage.getItem(RESPONSES_KEY);
      return raw ? JSON.parse(raw) : JSON.parse(JSON.stringify(BASE_RESPONSES));
    } catch (e) {
      return JSON.parse(JSON.stringify(BASE_RESPONSES));
    }
  }

  function saveResponses(responses) {
    localStorage.setItem(RESPONSES_KEY, JSON.stringify(responses));
  }

  function getAllResponses() {
    return readResponses();
  }

  function getResponsesForJob(jobId) {
    return getAllResponses().filter(function (r) { return r.jobId === Number(jobId); });
  }

  function getPendingResponsesCount() {
    return getAllResponses().filter(function (r) { return r.status === 'pending'; }).length;
  }

  function nextResponseId() {
    const all = getAllResponses();
    return all.length ? Math.max.apply(null, all.map(function (r) { return r.id; })) + 1 : 1;
  }

  // proposedPay — число, если исполнитель предлагает свою цену, или null,
  // если согласен на исходную ставку заказа.
  function submitResponse(jobId, proposedPay, message) {
    const job = getJob(jobId);
    if (!job) return { ok: false, error: 'Заказ не найден' };
    if (proposedPay != null && !job.allowBargain) {
      return { ok: false, error: 'Работодатель не принимает предложения по цене для этого заказа' };
    }

    const user = getUser();
    const responses = getAllResponses();
    responses.unshift({
      id: nextResponseId(),
      jobId: Number(jobId),
      workerName: user.name || 'Исполнитель',
      workerColor: '#E8510A',
      workerRating: user.rating ? user.rating + ' ⭐' : 'Новый исполнитель',
      proposedPay: proposedPay || null,
      message: (message || '').trim() || 'Готов выполнить эту работу.',
      status: 'pending',
      date: todayLabel(),
    });
    saveResponses(responses);

    // Заказ переходит в "есть отклики", если был совсем новым
    if (job.status === 'new') {
      updateJobStatus(jobId, 'has_responses');
    }

    return { ok: true };
  }

  // Работодатель принимает один отклик — заказ переходит в selected,
  // если в отклике была своя цена, она становится новой ценой заказа,
  // остальные открытые отклики по этому же заказу автоматически отклоняются.
  function acceptResponse(responseId) {
    const responses = getAllResponses();
    const response = responses.find(function (r) { return r.id === Number(responseId); });
    if (!response) return { ok: false, error: 'Отклик не найден' };

    response.status = 'accepted';
    responses.forEach(function (r) {
      if (r.jobId === response.jobId && r.id !== response.id && r.status === 'pending') {
        r.status = 'declined';
      }
    });
    saveResponses(responses);

    updateJobStatus(response.jobId, 'selected');
    if (response.proposedPay) {
      const userJobs = getUserJobs();
      const idx = userJobs.findIndex(function (j) { return j.id === response.jobId; });
      if (idx !== -1) {
        userJobs[idx].pay = response.proposedPay;
        saveUserJobs(userJobs);
      }
    }

    return { ok: true };
  }

  function declineResponse(responseId) {
    const responses = getAllResponses();
    const response = responses.find(function (r) { return r.id === Number(responseId); });
    if (!response) return { ok: false, error: 'Отклик не найден' };
    response.status = 'declined';
    saveResponses(responses);
    return { ok: true };
  }

  /* ---------- ОТЗЫВЫ ----------
     Отзыв привязан к конкретному заказу (jobId) и оставляется после того,
     как заказ переходит в статус done. Хранится оценка 1-5, текст и
     необязательное фото результата работы (base64, как и фото профиля).
     В реальной системе у отзыва должен быть автор и получатель (заказчик
     оценивает исполнителя и наоборот) — здесь упрощённая модель на один
     отзыв на заказ, расширяемая при необходимости. */
  const REVIEWS_KEY = 'shabashka_reviews';

  function getAllReviews() {
    return readList(REVIEWS_KEY, []);
  }

  function getReviewForJob(jobId) {
    return getAllReviews().find(function (r) { return r.jobId === Number(jobId); }) || null;
  }

  function hasReview(jobId) {
    return !!getReviewForJob(jobId);
  }

  // rating: 1-5, text: строка, photo: base64 data-URL или null
  function submitReview(jobId, rating, text, photo) {
    rating = Math.round(Number(rating));
    if (!rating || rating < 1 || rating > 5) {
      return { ok: false, error: 'Оценка должна быть от 1 до 5 звёзд' };
    }
    if (!text || !text.trim()) {
      return { ok: false, error: 'Напишите текст отзыва' };
    }
    if (hasReview(jobId)) {
      return { ok: false, error: 'Отзыв на этот заказ уже оставлен' };
    }

    const job = getJob(jobId);
    const reviews = getAllReviews();
    reviews.unshift({
      jobId: Number(jobId),
      jobTitle: job ? job.title : '',
      rating: rating,
      text: text.trim(),
      photo: photo || null,
      date: todayLabel(),
    });
    localStorage.setItem(REVIEWS_KEY, JSON.stringify(reviews));
    return { ok: true };
  }

  /* ---------- ОТЗЫВЫ НА РАБОТОДАТЕЛЕЙ ----------
     Исполнитель оценивает работодателя после выполнения заказа.
     Отдельный ключ в localStorage — не смешивается с отзывами на исполнителей. */
  const EMPLOYER_REVIEWS_KEY = 'shabashka_employer_reviews';

  // Демо-отзывы — несколько компаний уже имеют оценки
  const BASE_EMPLOYER_REVIEWS = [
    { jobId: 16, companyName: 'ООО ТрансЛогист', rating: 5, text: 'Всё чётко: деньги вовремя, условия как договорились. Буду работать ещё.', date: '10 июн', reviewerName: 'Дмитрий К.' },
    { jobId: 17, companyName: 'ООО ТрансЛогист', rating: 4, text: 'Нормально, но пришлось подождать 20 минут на месте. В целом рекомендую.', date: '14 июн', reviewerName: 'Сергей М.' },
  ];

  function getAllEmployerReviews() {
    try {
      var raw = localStorage.getItem(EMPLOYER_REVIEWS_KEY);
      return raw ? JSON.parse(raw) : JSON.parse(JSON.stringify(BASE_EMPLOYER_REVIEWS));
    } catch(e) { return JSON.parse(JSON.stringify(BASE_EMPLOYER_REVIEWS)); }
  }

  function getEmployerReviewForJob(jobId) {
    return getAllEmployerReviews().find(function(r){ return r.jobId === Number(jobId); }) || null;
  }

  function hasEmployerReview(jobId) {
    return !!getEmployerReviewForJob(jobId);
  }

  function getCompanyRating(companyName) {
    var reviews = getAllEmployerReviews().filter(function(r){ return r.companyName === companyName; });
    if (!reviews.length) return null;
    var avg = reviews.reduce(function(s,r){ return s + r.rating; }, 0) / reviews.length;
    return { rating: Math.round(avg * 10) / 10, count: reviews.length, reviews: reviews };
  }

  function submitEmployerReview(jobId, rating, text) {
    rating = Math.round(Number(rating));
    if (!rating || rating < 1 || rating > 5) {
      return { ok: false, error: 'Оценка должна быть от 1 до 5 звёзд' };
    }
    if (!text || !text.trim()) {
      return { ok: false, error: 'Напишите текст отзыва' };
    }
    if (hasEmployerReview(jobId)) {
      return { ok: false, error: 'Отзыв на этого работодателя уже оставлен' };
    }
    var job = getJob(jobId);
    if (!job) return { ok: false, error: 'Заказ не найден' };

    var reviews = getAllEmployerReviews();
    reviews.unshift({
      jobId: Number(jobId),
      companyName: job.company || 'Работодатель',
      rating: rating,
      text: text.trim(),
      date: todayLabel(),
      reviewerName: getUser().name || 'Исполнитель',
    });
    localStorage.setItem(EMPLOYER_REVIEWS_KEY, JSON.stringify(reviews));
    return { ok: true };
  }

  /* ---------- СПОРЫ ----------
     Заказчик открывает спор, если исполнитель не пришёл или работа сделана
     плохо. Заказ замораживается в статусе disputed — деньги из эскроу не
     списываются исполнителю, пока администратор не примет решение.
     Решение (возврат заказчику / выплата исполнителю) принимается в
     admin-complaints.html через тот же интерфейс, что и обычные жалобы. */
  const DISPUTES_KEY = 'shabashka_disputes';

  const DISPUTE_REASONS = [
    { id: 'no_show', label: 'Исполнитель не пришёл' },
    { id: 'bad_quality', label: 'Работа выполнена плохо' },
    { id: 'no_show_employer', label: 'Заказчик не вышел на связь / отменил на месте' },
    { id: 'other', label: 'Другая причина' },
  ];

  function getAllDisputes() {
    return readList(DISPUTES_KEY, []);
  }

  function getDisputeForJob(jobId) {
    return getAllDisputes().find(function (d) { return d.jobId === Number(jobId); }) || null;
  }

  function hasOpenDispute(jobId) {
    const d = getDisputeForJob(jobId);
    return !!(d && d.status === 'open');
  }

  // reasonId — один из DISPUTE_REASONS.id, comment — пояснение от заказчика
  function openDispute(jobId, reasonId, comment) {
    const job = getJob(jobId);
    if (!job) {
      return { ok: false, error: 'Заказ не найден' };
    }
    if (hasOpenDispute(jobId)) {
      return { ok: false, error: 'По этому заказу уже открыт спор' };
    }
    if (!canDisputeJob(job.status)) {
      return { ok: false, error: 'Спор можно открыть только для заказа в работе или завершённого' };
    }
    const reason = DISPUTE_REASONS.find(function (r) { return r.id === reasonId; });
    if (!reason) {
      return { ok: false, error: 'Укажите причину спора' };
    }
    if (!comment || !comment.trim()) {
      return { ok: false, error: 'Опишите ситуацию подробнее' };
    }

    const disputes = getAllDisputes();
    disputes.unshift({
      jobId: Number(jobId),
      jobTitle: job.title,
      reasonId: reason.id,
      reasonLabel: reason.label,
      comment: comment.trim(),
      amount: job.pay * (job.people || 1),
      status: 'open', // open -> refunded (возврат заказчику) | rejected (выплата исполнителю)
      date: todayLabel(),
      resolution: null,
    });
    localStorage.setItem(DISPUTES_KEY, JSON.stringify(disputes));

    // Замораживаем заказ — статус disputed скрывает его из обычных списков
    // "в работе"/"завершён", чтобы не запутывать стороны, пока идёт разбор.
    updateJobStatus(jobId, 'disputed');

    return { ok: true };
  }

  /* ---------- СТАТУСЫ ЗАКАЗА ---------- */
  // Единое определение текста и визуального стиля для каждого статуса —
  // используется в employer.html, admin.html и других местах, где
  // отображается статус заказа, чтобы не дублировать и не расходиться.
  const STATUS_MAP = {
    new:           { label: 'Новый',                cls: 's-new' },
    has_responses: { label: 'Есть отклики',         cls: 's-has-responses' },
    selected:      { label: 'Исполнитель выбран',   cls: 's-selected' },
    on_the_way:    { label: '🚶 Едет к вам',        cls: 's-ontheway' },
    in_progress:   { label: 'В работе',             cls: 's-inprog' },
    done:          { label: 'Завершён',              cls: 's-done' },
    cancelled:     { label: 'Отменён',              cls: 's-cancelled' },
    disputed:      { label: 'На рассмотрении',      cls: 's-disputed' },
  };

  // Порядок этапов для определения, можно ли перейти из одного статуса в другой
  const STATUS_ORDER = ['new', 'has_responses', 'selected', 'on_the_way', 'in_progress', 'done'];

  function canCancelJob(status) {
    return status !== 'done' && status !== 'cancelled' && status !== 'disputed';
  }

  // Спор можно открыть только когда уже была договорённость с исполнителем —
  // на этапе подбора (new/has_responses) спорить пока не о чём.
  function canDisputeJob(status) {
    return status === 'in_progress' || status === 'done';
  }

  /* ---------- КАТЕГОРИИ ---------- */
  const CATEGORIES = [
    { id: 'all', label: 'Все категории', icon: '🏠' },
    { id: 'move', label: 'Переезд и грузчики', icon: '📦' },
    { id: 'build', label: 'Строительство', icon: '🔨' },
    { id: 'clean', label: 'Уборка', icon: '🧹' },
    { id: 'event', label: 'Ивент и промо', icon: '🎉' },
    { id: 'other', label: 'Прочее', icon: '⚡' },
  ];

  /* ---------- ХЕЛПЕРЫ ---------- */
  function rub(n) {
    return Number(n).toLocaleString('ru') + ' ₽';
  }

  function commission(amount) {
    return Math.round(amount * 0.1);
  }

  // Достаём id заказа из query-строки (?job=3), если есть
  function jobIdFromQuery() {
    const params = new URLSearchParams(window.location.search);
    return params.get('job');
  }

  /* ---------- БАЛАНС И ТРАНЗАКЦИИ ----------
     Отдельные кошельки для роли работодателя (откуда списывается оплата
     заказов) и роли исполнителя (куда поступает заработок и откуда
     можно вывести деньги). Состояние хранится в localStorage, как и
     заказы — это эмуляция без настоящего платёжного backend. Реальное
     пополнение требует интеграции с платёжным провайдером (например,
     ЮKassa, CloudPayments) через отдельную serverless-функцию, как
     /api/ai-chat для AI — здесь деньги «начисляются» сразу после
     заполнения формы, без настоящего списания с карты. */

  const EMPLOYER_BALANCE_KEY = 'shabashka_employer_balance';
  const EMPLOYER_TX_KEY = 'shabashka_employer_tx';
  const WORKER_BALANCE_KEY = 'shabashka_worker_balance';
  const WORKER_TX_KEY = 'shabashka_worker_tx';

  const DEFAULT_EMPLOYER_BALANCE = 12300;
  const DEFAULT_EMPLOYER_TX = [
    { date: '12 июн', title: 'Официанты на корпоратив', amount: 19800, type: 'debit', status: 'Выполнен' },
    { date: '10 июн', title: 'Грузчики на склад', amount: 9900, type: 'debit', status: 'Выполнен' },
    { date: '8 июн', title: 'Пополнение баланса', amount: 30000, type: 'credit', status: 'Выполнен' },
  ];

  const DEFAULT_WORKER_BALANCE = 12350;
  const DEFAULT_WORKER_TX = [
    { date: '17 июн', title: 'Вывод на Сбербанк', amount: 5000, type: 'debit', status: 'Выполнен' },
    { date: '12 июн', title: 'Грузчики на переезд', amount: 3150, type: 'credit', status: 'Зачислено' },
  ];

  function readNumber(key, fallback) {
    const raw = localStorage.getItem(key);
    const n = raw === null ? fallback : Number(raw);
    return Number.isFinite(n) ? n : fallback;
  }

  function readList(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  }

  function getEmployerBalance() {
    return readNumber(EMPLOYER_BALANCE_KEY, DEFAULT_EMPLOYER_BALANCE);
  }

  function getEmployerTx() {
    return readList(EMPLOYER_TX_KEY, DEFAULT_EMPLOYER_TX);
  }

  function getWorkerBalance() {
    return readNumber(WORKER_BALANCE_KEY, DEFAULT_WORKER_BALANCE);
  }

  function getWorkerTx() {
    return readList(WORKER_TX_KEY, DEFAULT_WORKER_TX);
  }

  function todayLabel() {
    const d = new Date();
    const months = ['янв','фев','мар','апр','май','июн','июл','авг','сен','окт','ноя','дек'];
    return d.getDate() + ' ' + months[d.getMonth()];
  }

  // Пополнение баланса работодателя — для оплаты заказов через эскроу
  function topUpEmployerBalance(amount, method) {
    amount = Math.round(Number(amount));
    if (!amount || amount <= 0) return { ok: false, error: 'Сумма должна быть больше нуля' };

    const balance = getEmployerBalance() + amount;
    localStorage.setItem(EMPLOYER_BALANCE_KEY, String(balance));

    const tx = getEmployerTx();
    tx.unshift({
      date: todayLabel(),
      title: 'Пополнение баланса (' + (method || 'карта') + ')',
      amount: amount,
      type: 'credit',
      status: 'Выполнен',
    });
    localStorage.setItem(EMPLOYER_TX_KEY, JSON.stringify(tx));

    return { ok: true, balance: balance };
  }

  // Списание с баланса работодателя (например, при подтверждении заказа)
  function debitEmployerBalance(amount, title) {
    amount = Math.round(Number(amount));
    const current = getEmployerBalance();
    if (amount > current) return { ok: false, error: 'Недостаточно средств на балансе' };

    const balance = current - amount;
    localStorage.setItem(EMPLOYER_BALANCE_KEY, String(balance));

    const tx = getEmployerTx();
    tx.unshift({ date: todayLabel(), title: title || 'Списание', amount: amount, type: 'debit', status: 'Выполнен' });
    localStorage.setItem(EMPLOYER_TX_KEY, JSON.stringify(tx));

    return { ok: true, balance: balance };
  }

  // Пополнение баланса исполнителя (например, бонус, возврат, тестовое начисление)
  function topUpWorkerBalance(amount, title) {
    amount = Math.round(Number(amount));
    if (!amount || amount <= 0) return { ok: false, error: 'Сумма должна быть больше нуля' };

    const balance = getWorkerBalance() + amount;
    localStorage.setItem(WORKER_BALANCE_KEY, String(balance));

    const tx = getWorkerTx();
    tx.unshift({ date: todayLabel(), title: title || 'Пополнение баланса', amount: amount, type: 'credit', status: 'Зачислено' });
    localStorage.setItem(WORKER_TX_KEY, JSON.stringify(tx));

    return { ok: true, balance: balance };
  }

  function debitWorkerBalance(amount, title) {
    amount = Math.round(Number(amount));
    const current = getWorkerBalance();
    if (amount > current) return { ok: false, error: 'Недостаточно средств на балансе' };

    const balance = current - amount;
    localStorage.setItem(WORKER_BALANCE_KEY, String(balance));

    const tx = getWorkerTx();
    tx.unshift({ date: todayLabel(), title: title || 'Списание', amount: amount, type: 'debit', status: 'Выполнен' });
    localStorage.setItem(WORKER_TX_KEY, JSON.stringify(tx));

    return { ok: true, balance: balance };
  }

  /* ---------- БАЗА ИСПОЛНИТЕЛЕЙ ----------
     Демо-база профессионалов для страницы поиска работодателя.
     В реальном продукте это был бы запрос к серверу, здесь —
     расширенные профили из тех же людей что фигурируют в откликах. */
  const BASE_WORKERS = [
    { id: 1, name: 'Дмитрий К.', color: '#E8510A', cats: ['move'], rating: 4.9, orders: 47, location: 'Москва', price: 3500, verified: true, bio: 'Профессиональный грузчик, 3 года опыта. Есть свой инструмент, помогаю с разборкой мебели.', skills: ['Грузчик', 'Переезды', 'Разборка мебели'], responseTime: '~20 мин' },
    { id: 2, name: 'Сергей М.', color: '#185FA5', cats: ['move', 'build'], rating: 4.7, orders: 31, location: 'Москва', price: 3000, verified: false, bio: 'Физически крепкий, обучаемый. Работал на стройке и переездах.', skills: ['Грузчик', 'Подсобник'], responseTime: '~35 мин' },
    { id: 3, name: 'Алёна П.', color: '#1A7A4A', cats: ['event'], rating: 5.0, orders: 22, location: 'Москва', price: 2800, verified: true, bio: 'Промоутер, хостес. Коммуникабельная, презентабельный внешний вид.', skills: ['Промоутер', 'Хостес', 'Раздача листовок'], responseTime: '~15 мин' },
    { id: 4, name: 'Марина С.', color: '#9B59B6', cats: ['event', 'clean'], rating: 4.8, orders: 19, location: 'Москва', price: 2500, verified: true, bio: 'Работала промоутером 2 года, также делаю уборку офисов.', skills: ['Промоутер', 'Уборка'], responseTime: '~40 мин' },
    { id: 5, name: 'Иван Г.', color: '#B33D06', cats: ['build'], rating: 4.6, orders: 55, location: 'МО', price: 4500, verified: true, bio: 'Строитель с 7 годами опыта. Отделка, плитка, сантехника. Инструмент свой.', skills: ['Отделка', 'Плитка', 'Сантехника', 'Электрика'], responseTime: '~1 час' },
    { id: 6, name: 'Олег Т.', color: '#185FA5', cats: ['build', 'move'], rating: 4.9, orders: 40, location: 'Москва', price: 3800, verified: true, bio: 'Подсобные работы, переезды. Быстро, аккуратно, без лишних разговоров.', skills: ['Подсобник', 'Грузчик'], responseTime: '~25 мин' },
    { id: 7, name: 'Наталья В.', color: '#1A7A4A', cats: ['event'], rating: 5.0, orders: 28, location: 'Москва', price: 3000, verified: false, bio: 'Доброжелательная, энергичная. Опыт в промо и ивент-агентствах.', skills: ['Хостес', 'Промоутер'], responseTime: '~30 мин' },
    { id: 8, name: 'Роман Д.', color: '#854F0B', cats: ['move'], rating: 4.5, orders: 15, location: 'МО', price: 2800, verified: false, bio: 'Молодой, сильный. Готов выйти срочно, даже сегодня вечером.', skills: ['Грузчик'], responseTime: '~10 мин' },
    { id: 9, name: 'Елена К.', color: '#E8510A', cats: ['clean'], rating: 4.9, orders: 63, location: 'Москва', price: 2200, verified: true, bio: 'Профессиональная уборщица. Генеральная, после ремонта, офисы. Свой инвентарь.', skills: ['Уборка', 'После ремонта', 'Офисы'], responseTime: '~20 мин' },
    { id: 10, name: 'Андрей Ф.', color: '#2C7BB6', cats: ['build'], rating: 4.8, orders: 34, location: 'Москва', price: 4000, verified: true, bio: 'Электрик, сантехник. Быстрая диагностика и ремонт. Выезжаю срочно.', skills: ['Электрик', 'Сантехник'], responseTime: '~45 мин' },
    { id: 11, name: 'Ксения Л.', color: '#9B59B6', cats: ['clean', 'event'], rating: 4.7, orders: 21, location: 'Москва', price: 2000, verified: false, bio: 'Уборка и промо. Ответственная, не опаздываю.', skills: ['Уборка', 'Промоутер'], responseTime: '~1 час' },
    { id: 12, name: 'Павел Н.', color: '#1A7A4A', cats: ['build', 'other'], rating: 4.6, orders: 38, location: 'МО', price: 3200, verified: true, bio: 'Разнорабочий. Что угодно — сделаю. Опыт в строительстве и ремонте.', skills: ['Разнорабочий', 'Стройка', 'Ремонт'], responseTime: '~50 мин' },
  ];

  function getAllWorkers() {
    return BASE_WORKERS;
  }

  function searchWorkers(params) {
    params = params || {};
    var workers = BASE_WORKERS.slice();

    if (params.cat && params.cat !== 'all') {
      workers = workers.filter(function (w) { return w.cats.indexOf(params.cat) !== -1; });
    }
    if (params.query) {
      var q = params.query.toLowerCase();
      workers = workers.filter(function (w) {
        return w.name.toLowerCase().includes(q) ||
          w.skills.some(function (s) { return s.toLowerCase().includes(q); }) ||
          w.bio.toLowerCase().includes(q);
      });
    }
    if (params.verified) {
      workers = workers.filter(function (w) { return w.verified; });
    }
    if (params.sort === 'rating') {
      workers.sort(function (a, b) { return b.rating - a.rating; });
    } else if (params.sort === 'orders') {
      workers.sort(function (a, b) { return b.orders - a.orders; });
    } else if (params.sort === 'price_asc') {
      workers.sort(function (a, b) { return a.price - b.price; });
    } else if (params.sort === 'price_desc') {
      workers.sort(function (a, b) { return b.price - a.price; });
    }
    return workers;
  }

  /* ---------- ИЗБРАННОЕ ----------
     Два независимых списка: сохранённые заказы (для исполнителей)
     и сохранённые исполнители (для работодателей). */
  const FAV_JOBS_KEY     = 'shabashka_fav_jobs';
  const FAV_WORKERS_KEY  = 'shabashka_fav_workers';

  function getFavJobs() {
    try { return JSON.parse(localStorage.getItem(FAV_JOBS_KEY) || '[]'); } catch(e) { return []; }
  }
  function getFavWorkers() {
    try { return JSON.parse(localStorage.getItem(FAV_WORKERS_KEY) || '[]'); } catch(e) { return []; }
  }
  function isFavJob(jobId) { return getFavJobs().indexOf(Number(jobId)) !== -1; }
  function isFavWorker(workerId) { return getFavWorkers().indexOf(Number(workerId)) !== -1; }

  function toggleFavJob(jobId) {
    var favs = getFavJobs();
    var id = Number(jobId);
    var idx = favs.indexOf(id);
    if (idx === -1) { favs.push(id); } else { favs.splice(idx, 1); }
    localStorage.setItem(FAV_JOBS_KEY, JSON.stringify(favs));
    return idx === -1; // true = добавлено, false = удалено
  }
  function toggleFavWorker(workerId) {
    var favs = getFavWorkers();
    var id = Number(workerId);
    var idx = favs.indexOf(id);
    if (idx === -1) { favs.push(id); } else { favs.splice(idx, 1); }
    localStorage.setItem(FAV_WORKERS_KEY, JSON.stringify(favs));
    return idx === -1;
  }
  function getSavedJobs() {
    var ids = getFavJobs();
    return getAllJobs().filter(function(j){ return ids.indexOf(j.id) !== -1; });
  }
  function getSavedWorkers() {
    var ids = getFavWorkers();
    return BASE_WORKERS.filter(function(w){ return ids.indexOf(w.id) !== -1; });
  }

  /* ---------- НЕПРОЧИТАННЫЕ СООБЩЕНИЯ ----------
     Простой счётчик в localStorage — общее число непрочитанных
     сообщений во всех чатах. Обновляется из chat.html при открытии/закрытии
     переписки, и читается nav.js для отображения бейджа на иконке. */
  const UNREAD_KEY = 'shabashka_unread_count';

  function getUnreadCount() {
    return parseInt(localStorage.getItem(UNREAD_KEY) || '0');
  }

  function setUnreadCount(n) {
    localStorage.setItem(UNREAD_KEY, String(Math.max(0, n)));
  }

  function clearUnread() {
    localStorage.removeItem(UNREAD_KEY);
  }

  // Инициализируем счётчик при первом посещении (3 непрочитанных из демо-чатов)
  if (localStorage.getItem(UNREAD_KEY) === null) {
    localStorage.setItem(UNREAD_KEY, '3');
  }

  /* ---------- ВЕРИФИКАЦИЯ ПАСПОРТА ----------
     Исполнитель загружает фото документа (разворот с фото + прописка).
     Заявка сохраняется в localStorage и появляется в очереди у администратора.
     После одобрения — поле user.verified.passport = true и бейдж в профиле. */
  const VERIFICATION_KEY = 'shabashka_passport_verification';

  var VERIFICATION_STATUSES = {
    none:     'Не подана',
    pending:  'На проверке',
    approved: 'Одобрена',
    rejected: 'Отклонена',
  };

  function getVerificationStatus() {
    try {
      var raw = localStorage.getItem(VERIFICATION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch(e) { return null; }
  }

  function submitVerification(docId) {
    if (!docId) return { ok: false, error: 'Не указан ID документа' };
    var existing = getVerificationStatus();
    if (existing && existing.status === 'pending') {
      return { ok: false, error: 'Заявка уже отправлена и ожидает проверки' };
    }
    if (existing && existing.status === 'approved') {
      return { ok: false, error: 'Паспорт уже проверен' };
    }
    var record = {
      userId: getUser().name,
      docId: docId, // только ID, не само фото
      photo: null,  // фото хранится на сервере, не здесь
      status: 'pending',
      submittedAt: todayLabel(),
      reviewedAt: null,
      rejectReason: null,
    };
    localStorage.setItem(VERIFICATION_KEY, JSON.stringify(record));
    return { ok: true };
  }

  function approveVerification() {
    var record = getVerificationStatus();
    if (!record) return { ok: false, error: 'Заявка не найдена' };
    record.status = 'approved';
    record.reviewedAt = todayLabel();
    localStorage.setItem(VERIFICATION_KEY, JSON.stringify(record));
    // Обновляем флаг в профиле пользователя
    var user = BASE_USER;
    user.verified.passport = true;
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    return { ok: true };
  }

  function rejectVerification(reason) {
    var record = getVerificationStatus();
    if (!record) return { ok: false, error: 'Заявка не найдена' };
    record.status = 'rejected';
    record.reviewedAt = todayLabel();
    record.rejectReason = reason || 'Документ нечёткий или неподходящий';
    localStorage.setItem(VERIFICATION_KEY, JSON.stringify(record));
    return { ok: true };
  }

  /* ---------- УТИЛИТЫ БЕЗОПАСНОСТИ ---------- */

  // Маскирует номер телефона для отображения: 79031234567 → +7 (903) ***-**-67
  function maskPhone(phone) {
    if (!phone) return '';
    var digits = String(phone).replace(/\D/g, '');
    if (digits.length < 10) return phone;
    var last2 = digits.slice(-2);
    var code = digits.slice(1, 4);
    return '+7 (' + code + ') ***-**-' + last2;
  }

  // Удаляет чувствительные данные из localStorage при выходе из аккаунта
  // (в дополнение к стандартному logout)
  function clearSensitiveData() {
    // Не удаляем: данные пользователя, настройки сайта
    // Удаляем: верификационные данные с docId, кэшированные токены
    localStorage.removeItem(VERIFICATION_KEY);
    localStorage.removeItem('shabashka_push_granted');
    localStorage.removeItem('shabashka_push_dismissed');
    // Pro статус и избранное оставляем — они не чувствительные
  }

  window.Shabashka = {
    getUser: getUser,
    setRole: setRole,
    isLoggedIn: isLoggedIn,
    completeRegistration: completeRegistration,
    logout: logout,
    // PRO подписка
    PRO_PLANS: PRO_PLANS,
    getProStatus: getProStatus,
    isPro: isPro,
    activatePro: activatePro,
    deactivatePro: deactivatePro,
    // Непрочитанные сообщения
    getUnreadCount: getUnreadCount,
    setUnreadCount: setUnreadCount,
    clearUnread: clearUnread,
    // Верификация паспорта
    VERIFICATION_STATUSES: VERIFICATION_STATUSES,
    getVerificationStatus: getVerificationStatus,
    submitVerification: submitVerification,
    approveVerification: approveVerification,
    rejectVerification: rejectVerification,
    // Утилиты безопасности
    maskPhone: maskPhone,
    clearSensitiveData: clearSensitiveData,
    updateProfile: updateProfile,
    formatRegisteredDate: formatRegisteredDate,
    // Совместимость: код, написанный раньше, использует Shabashka.JOBS как массив.
    // Определяем getter, чтобы он всегда возвращал свежий список (включая
    // заказы, добавленные через employer.html) без необходимости менять
    // существующий код на каждой странице.
    get JOBS() { return getOpenJobs(); },
    getAllJobs: getAllJobs,
    getOpenJobs: getOpenJobs,
    getEmployerJobs: getEmployerJobs,
    getJob: getJob,
    addJob: addJob,
    updateJobStatus: updateJobStatus,
    STATUS_MAP: STATUS_MAP,
    STATUS_ORDER: STATUS_ORDER,
    canCancelJob: canCancelJob,
    canDisputeJob: canDisputeJob,
    // Отклики на заказ (с торгом по цене)
    getAllResponses: getAllResponses,
    getResponsesForJob: getResponsesForJob,
    getPendingResponsesCount: getPendingResponsesCount,
    submitResponse: submitResponse,
    acceptResponse: acceptResponse,
    declineResponse: declineResponse,
    // Отзывы
    getAllReviews: getAllReviews,
    getReviewForJob: getReviewForJob,
    hasReview: hasReview,
    submitReview: submitReview,
    // Отзывы на работодателей
    getAllEmployerReviews: getAllEmployerReviews,
    getEmployerReviewForJob: getEmployerReviewForJob,
    hasEmployerReview: hasEmployerReview,
    getCompanyRating: getCompanyRating,
    submitEmployerReview: submitEmployerReview,
    // Споры
    DISPUTE_REASONS: DISPUTE_REASONS,
    // Исполнители
    getAllWorkers: getAllWorkers,
    searchWorkers: searchWorkers,
    // Избранное
    isFavJob: isFavJob,
    isFavWorker: isFavWorker,
    toggleFavJob: toggleFavJob,
    toggleFavWorker: toggleFavWorker,
    getSavedJobs: getSavedJobs,
    getSavedWorkers: getSavedWorkers,
    getAllDisputes: getAllDisputes,
    getDisputeForJob: getDisputeForJob,
    hasOpenDispute: hasOpenDispute,
    openDispute: openDispute,
    CATEGORIES: CATEGORIES,
    rub: rub,
    commission: commission,
    jobIdFromQuery: jobIdFromQuery,
    // Баланс и платежи
    getEmployerBalance: getEmployerBalance,
    getEmployerTx: getEmployerTx,
    topUpEmployerBalance: topUpEmployerBalance,
    debitEmployerBalance: debitEmployerBalance,
    getWorkerBalance: getWorkerBalance,
    getWorkerTx: getWorkerTx,
    topUpWorkerBalance: topUpWorkerBalance,
    debitWorkerBalance: debitWorkerBalance,
  };
})();
