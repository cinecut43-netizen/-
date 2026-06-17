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
    city: 'Москва',
    role: localStorage.getItem('shabashka_role') || 'worker',
    company: 'ООО ТрансЛогист', // используется в режиме работодателя
    verified: true,
  };

  function getUser() {
    DEFAULT_USER.role = localStorage.getItem('shabashka_role') || 'worker';
    return DEFAULT_USER;
  }

  function setRole(role) {
    localStorage.setItem('shabashka_role', role);
  }

  /* ---------- ЗАКАЗЫ (общий список на весь сайт) ----------
     status: 'open' | 'inprog' | 'done' | 'draft' | 'cancelled'
     employer: true — заказ размещён текущим пользователем-работодателем
     (нужно, чтобы кабинет работодателя показывал «свои» заказы) */
  const BASE_JOBS = [
    { id: 1, cat: 'move', emoji: '📦', title: 'Грузчики на переезд', company: 'Семья Петровых', pay: 3500, people: 1, payLabel: 'за день', date: 'Сегодня, 9:00', urgent: true, location: 'м. Щёлковская, 15 мин пешком', lat: 55.808, lng: 37.768, dist: '0.8 км', desc: 'Переезд из 3-комнатной квартиры. Нужно вынести вещи, загрузить машину и разгрузить на новом месте. Лифт есть. Примерно 6-8 часов работы.', requirements: 'Физически крепкий, без вредных привычек. Опыт переезда приветствуется.', responses: 7, status: 'open', colors: ['#E8510A', '#1A7A4A', '#185FA5'] },
    { id: 2, cat: 'build', emoji: '🔨', title: 'Подсобный рабочий на стройку', company: 'СК Горизонт', pay: 4000, people: 1, payLabel: 'за смену', date: 'Завтра, 8:00', urgent: false, location: 'г. Мытищи, стройплощадка', lat: 55.920, lng: 37.738, dist: '12 км', desc: 'Работа на строительном объекте: подача материалов, уборка мусора, помощь бригаде. Смена 10 часов, обед за счёт работодателя.', requirements: 'Без опыта. Нужна рабочая одежда.', responses: 12, status: 'open', colors: ['#185FA5', '#1A7A4A', '#B33D06'] },
    { id: 3, cat: 'event', emoji: '🎉', title: 'Промоутер на открытие магазина', company: 'Магазин «Уют»', pay: 2000, people: 1, payLabel: 'за 4 часа', date: 'Сегодня, 14:00', urgent: true, location: 'ТЦ Мега, Химки', lat: 55.891, lng: 37.370, dist: '8 км', desc: 'Раздача листовок и приглашение покупателей на открытие нового магазина. 4 часа работы, приятная атмосфера.', requirements: 'Коммуникабельный, презентабельный вид.', responses: 23, status: 'open', colors: ['#9B59B6', '#E8510A', '#1A7A4A'] },
    { id: 4, cat: 'clean', emoji: '🧹', title: 'Генеральная уборка офиса', company: 'ООО Техносфера', pay: 2500, people: 1, payLabel: 'за день', date: 'Эта неделя', urgent: false, location: 'м. Тимирязевская, офис 310', lat: 55.821, lng: 37.567, dist: '3.2 км', desc: 'Генеральная уборка офиса 200 кв.м. после ремонта. Нужно вымыть окна, вычистить полы, вынести строительный мусор.', requirements: 'Собственный инвентарь — плюс. Опыт уборки после ремонта.', responses: 5, status: 'open', colors: ['#1A7A4A', '#185FA5', '#E8510A'] },
    { id: 5, cat: 'move', emoji: '📦', title: 'Сборка мебели IKEA', company: 'Андрей К.', pay: 2000, people: 1, payLabel: 'за день', date: 'Завтра', urgent: false, location: 'м. Юго-Западная', lat: 55.664, lng: 37.364, dist: '15 км', desc: 'Нужно собрать кухонный гарнитур и шкаф-купе из ИКЕА. Всё есть по инструкции. Инструменты свои.', requirements: 'Умение читать схемы сборки, наличие дрели будет плюсом.', responses: 3, status: 'open', colors: ['#185FA5', '#9B59B6', '#1A7A4A'] },
    { id: 6, cat: 'build', emoji: '🔨', title: 'Покраска забора на даче', company: 'Николай В.', pay: 3000, people: 1, payLabel: 'за день', date: 'Эта неделя', urgent: false, location: 'Щёлково, дачный посёлок', lat: 55.919, lng: 37.994, dist: '18 км', desc: 'Нужно покрасить деревянный забор 50 метров. Краска и кисти есть. Оплачиваем проезд и обед.', requirements: 'Аккуратность. Опыт малярных работ желателен.', responses: 4, status: 'open', colors: ['#B33D06', '#1A7A4A', '#185FA5'] },
    { id: 7, cat: 'event', emoji: '🎉', title: 'Официант на свадьбу', company: 'Агентство «Праздник»', pay: 4500, people: 3, payLabel: 'за вечер', date: 'Эта неделя', urgent: false, location: 'Ресторан «Панорама», Москва', lat: 55.751, lng: 37.618, dist: '1.5 км', desc: 'Нужны 3 официанта на свадебный банкет. 200 гостей, вечер пятницы. Форма предоставляется. Ужин за счёт заведения.', requirements: 'Опыт официанта обязателен. Опрятный вид.', responses: 18, status: 'open', colors: ['#E8510A', '#185FA5', '#1A7A4A'] },
    { id: 8, cat: 'clean', emoji: '🧹', title: 'Уборка квартиры после съёмщиков', company: 'Мария Л.', pay: 1800, people: 1, payLabel: 'за день', date: 'Сегодня', urgent: true, location: 'м. Войковская', lat: 55.818, lng: 37.498, dist: '4.1 км', desc: 'Нужно привести в порядок 2-комнатную квартиру после жильцов. Мытьё полов, ванной, кухни. Средства есть.', requirements: 'Без вредных привычек, аккуратность.', responses: 2, status: 'open', colors: ['#1A7A4A', '#E8510A', '#185FA5'] },
    { id: 9, cat: 'move', emoji: '📦', title: 'Разгрузка фуры на складе', company: 'ООО ТрансЛогист', pay: 3200, people: 4, payLabel: 'за смену', date: 'Завтра, 6:00', urgent: false, location: 'Склад в Солнцево', lat: 55.648, lng: 37.390, dist: '14 км', desc: 'Разгрузка фуры с бытовой техникой. Примерно 4 часа работы. Нужно 4 человека.', requirements: 'Физическая выносливость. Возраст 18-45.', responses: 9, status: 'inprog', employer: true, colors: ['#185FA5', '#E8510A', '#9B59B6'] },
    { id: 10, cat: 'build', emoji: '🔨', title: 'Плиточник на 1 день', company: 'Дмитрий П.', pay: 5000, people: 1, payLabel: 'за день', date: 'Эта неделя', urgent: false, location: 'Москва, Хорошёво', lat: 55.773, lng: 37.456, dist: '5 км', desc: 'Нужно выложить плитку в ванной 5 кв.м. Плитка и клей куплены, нужен мастер с инструментом.', requirements: 'Опыт укладки плитки обязателен.', responses: 6, status: 'open', colors: ['#9B59B6', '#1A7A4A', '#185FA5'] },
    { id: 11, cat: 'move', emoji: '📦', title: 'Помощь с огородом на даче', company: 'Семья Козловых', pay: 2200, people: 1, payLabel: 'за день', date: 'Эта неделя', urgent: false, location: 'Электросталь, дача', lat: 55.791, lng: 38.205, dist: '40 км', desc: 'Нужна помощь в огороде: перекопать грядки, посадить рассаду, убрать листья. Обед и проезд оплачиваем.', requirements: 'Без особых требований, главное — желание работать.', responses: 1, status: 'open', colors: ['#1A7A4A', '#B33D06', '#185FA5'] },
    { id: 12, cat: 'other', emoji: '⚡', title: 'Курьер на личном авто', company: 'Кофейня «Точка»', pay: 3500, people: 1, payLabel: 'за день', date: 'Сегодня', urgent: true, location: 'Центр Москвы', lat: 55.756, lng: 37.617, dist: '1.2 км', desc: 'Нужен курьер с личным авто для развозки кофейного оборудования по точкам. 10 точек в центре, примерно 6 часов.', requirements: 'Своё авто, знание Москвы, аккуратность.', responses: 11, status: 'open', colors: ['#E8510A', '#185FA5', '#1A7A4A'] },
    // Доп. заказы текущего работодателя для демонстрации кабинета (employer.html)
    { id: 13, cat: 'event', emoji: '🎉', title: 'Промоутеры на открытие', company: 'ООО ТрансЛогист', pay: 2000, people: 5, payLabel: 'за смену', date: '16 июн', urgent: false, location: 'ТЦ Мега, Химки', lat: 55.891, lng: 37.370, dist: '8 км', desc: 'Раздача листовок и приглашение покупателей.', requirements: 'Коммуникабельность.', responses: 23, status: 'open', employer: true, colors: ['#9B59B6', '#E8510A', '#1A7A4A'] },
    { id: 14, cat: 'build', emoji: '🔨', title: 'Подсобный рабочий — стройка', company: 'ООО ТрансЛогист', pay: 4000, people: 2, payLabel: 'за смену', date: '18 июн', urgent: false, location: 'Мытищи, стройплощадка', lat: 55.920, lng: 37.738, dist: '12 км', desc: 'Подача материалов, уборка мусора, помощь бригаде.', requirements: 'Без опыта.', responses: 12, status: 'open', employer: true, colors: ['#185FA5', '#1A7A4A', '#B33D06'] },
    { id: 15, cat: 'clean', emoji: '🧹', title: 'Уборка офиса после ремонта', company: 'ООО ТрансЛогист', pay: 2500, people: 2, payLabel: 'за день', date: '20 июн', urgent: false, location: 'м. Тимирязевская, офис 310', lat: 55.821, lng: 37.567, dist: '3.2 км', desc: 'Генеральная уборка 200 кв.м.', requirements: '—', responses: 0, status: 'draft', employer: true, colors: ['#1A7A4A', '#185FA5', '#E8510A'] },
    { id: 16, cat: 'move', emoji: '📦', title: 'Грузчики на склад', company: 'ООО ТрансЛогист', pay: 3000, people: 3, payLabel: 'за день', date: '10 июн', urgent: false, location: 'Люберцы, склад', lat: 55.687, lng: 37.892, dist: '20 км', desc: 'Расстановка товара на складе.', requirements: '—', responses: 7, status: 'done', employer: true, colors: ['#E8510A', '#1A7A4A', '#185FA5'] },
    { id: 17, cat: 'event', emoji: '🎉', title: 'Официанты на корпоратив', company: 'ООО ТрансЛогист', pay: 4500, people: 4, payLabel: 'за вечер', date: '5 июн', urgent: false, location: 'Ресторан Панорама', lat: 55.751, lng: 37.618, dist: '1.5 км', desc: 'Обслуживание банкета 150 человек.', requirements: 'Опыт официанта.', responses: 18, status: 'done', employer: true, colors: ['#9B59B6', '#185FA5', '#1A7A4A'] },
  ];

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
    return BASE_JOBS.concat(getUserJobs());
  }

  function nextJobId() {
    if (nextIdCache === null) {
      const all = getAllJobs();
      nextIdCache = all.reduce(function (max, j) { return Math.max(max, j.id); }, 0);
    }
    nextIdCache += 1;
    return nextIdCache;
  }

  // Заказы, видимые исполнителям на главной/карте — только открытые
  function getOpenJobs() {
    return getAllJobs().filter(function (j) { return j.status === 'open'; });
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
      status: 'open',
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

  window.Shabashka = {
    getUser: getUser,
    setRole: setRole,
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
    CATEGORIES: CATEGORIES,
    rub: rub,
    commission: commission,
    jobIdFromQuery: jobIdFromQuery,
  };
})();
