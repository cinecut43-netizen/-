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

  /* ---------- ЗАКАЗЫ (общий список на весь сайт) ---------- */
  const JOBS = [
    { id: 1, cat: 'move', emoji: '📦', title: 'Грузчики на переезд', company: 'Семья Петровых', pay: 3500, payLabel: 'за день', date: 'Сегодня, 9:00', urgent: true, location: 'м. Щёлковская, 15 мин пешком', lat: 55.808, lng: 37.768, dist: '0.8 км', desc: 'Переезд из 3-комнатной квартиры. Нужно вынести вещи, загрузить машину и разгрузить на новом месте. Лифт есть. Примерно 6-8 часов работы.', requirements: 'Физически крепкий, без вредных привычек. Опыт переезда приветствуется.', responses: 7, colors: ['#E8510A', '#1A7A4A', '#185FA5'] },
    { id: 2, cat: 'build', emoji: '🔨', title: 'Подсобный рабочий на стройку', company: 'СК Горизонт', pay: 4000, payLabel: 'за смену', date: 'Завтра, 8:00', urgent: false, location: 'г. Мытищи, стройплощадка', lat: 55.920, lng: 37.738, dist: '12 км', desc: 'Работа на строительном объекте: подача материалов, уборка мусора, помощь бригаде. Смена 10 часов, обед за счёт работодателя.', requirements: 'Без опыта. Нужна рабочая одежда.', responses: 12, colors: ['#185FA5', '#1A7A4A', '#B33D06'] },
    { id: 3, cat: 'event', emoji: '🎉', title: 'Промоутер на открытие магазина', company: 'Магазин «Уют»', pay: 2000, payLabel: 'за 4 часа', date: 'Сегодня, 14:00', urgent: true, location: 'ТЦ Мега, Химки', lat: 55.891, lng: 37.370, dist: '8 км', desc: 'Раздача листовок и приглашение покупателей на открытие нового магазина. 4 часа работы, приятная атмосфера.', requirements: 'Коммуникабельный, презентабельный вид.', responses: 23, colors: ['#9B59B6', '#E8510A', '#1A7A4A'] },
    { id: 4, cat: 'clean', emoji: '🧹', title: 'Генеральная уборка офиса', company: 'ООО Техносфера', pay: 2500, payLabel: 'за день', date: 'Эта неделя', urgent: false, location: 'м. Тимирязевская, офис 310', lat: 55.821, lng: 37.567, dist: '3.2 км', desc: 'Генеральная уборка офиса 200 кв.м. после ремонта. Нужно вымыть окна, вычистить полы, вынести строительный мусор.', requirements: 'Собственный инвентарь — плюс. Опыт уборки после ремонта.', responses: 5, colors: ['#1A7A4A', '#185FA5', '#E8510A'] },
    { id: 5, cat: 'move', emoji: '📦', title: 'Сборка мебели IKEA', company: 'Андрей К.', pay: 2000, payLabel: 'за день', date: 'Завтра', urgent: false, location: 'м. Юго-Западная', lat: 55.664, lng: 37.364, dist: '15 км', desc: 'Нужно собрать кухонный гарнитур и шкаф-купе из ИКЕА. Всё есть по инструкции. Инструменты свои.', requirements: 'Умение читать схемы сборки, наличие дрели будет плюсом.', responses: 3, colors: ['#185FA5', '#9B59B6', '#1A7A4A'] },
    { id: 6, cat: 'build', emoji: '🔨', title: 'Покраска забора на даче', company: 'Николай В.', pay: 3000, payLabel: 'за день', date: 'Эта неделя', urgent: false, location: 'Щёлково, дачный посёлок', lat: 55.919, lng: 37.994, dist: '18 км', desc: 'Нужно покрасить деревянный забор 50 метров. Краска и кисти есть. Оплачиваем проезд и обед.', requirements: 'Аккуратность. Опыт малярных работ желателен.', responses: 4, colors: ['#B33D06', '#1A7A4A', '#185FA5'] },
    { id: 7, cat: 'event', emoji: '🎉', title: 'Официант на свадьбу', company: 'Агентство «Праздник»', pay: 4500, payLabel: 'за вечер', date: 'Эта неделя', urgent: false, location: 'Ресторан «Панорама», Москва', lat: 55.751, lng: 37.618, dist: '1.5 км', desc: 'Нужны 3 официанта на свадебный банкет. 200 гостей, вечер пятницы. Форма предоставляется. Ужин за счёт заведения.', requirements: 'Опыт официанта обязателен. Опрятный вид.', responses: 18, colors: ['#E8510A', '#185FA5', '#1A7A4A'] },
    { id: 8, cat: 'clean', emoji: '🧹', title: 'Уборка квартиры после съёмщиков', company: 'Мария Л.', pay: 1800, payLabel: 'за день', date: 'Сегодня', urgent: true, location: 'м. Войковская', lat: 55.818, lng: 37.498, dist: '4.1 км', desc: 'Нужно привести в порядок 2-комнатную квартиру после жильцов. Мытьё полов, ванной, кухни. Средства есть.', requirements: 'Без вредных привычек, аккуратность.', responses: 2, colors: ['#1A7A4A', '#E8510A', '#185FA5'] },
    { id: 9, cat: 'move', emoji: '📦', title: 'Разгрузка фуры на складе', company: 'ООО ТрансЛогист', pay: 3200, payLabel: 'за смену', date: 'Завтра, 6:00', urgent: false, location: 'Склад в Солнцево', lat: 55.648, lng: 37.390, dist: '14 км', desc: 'Разгрузка фуры с бытовой техникой. Примерно 4 часа работы. Нужно 4 человека.', requirements: 'Физическая выносливость. Возраст 18-45.', responses: 9, colors: ['#185FA5', '#E8510A', '#9B59B6'] },
    { id: 10, cat: 'build', emoji: '🔨', title: 'Плиточник на 1 день', company: 'Дмитрий П.', pay: 5000, payLabel: 'за день', date: 'Эта неделя', urgent: false, location: 'Москва, Хорошёво', lat: 55.773, lng: 37.456, dist: '5 км', desc: 'Нужно выложить плитку в ванной 5 кв.м. Плитка и клей куплены, нужен мастер с инструментом.', requirements: 'Опыт укладки плитки обязателен.', responses: 6, colors: ['#9B59B6', '#1A7A4A', '#185FA5'] },
    { id: 11, cat: 'move', emoji: '📦', title: 'Помощь с огородом на даче', company: 'Семья Козловых', pay: 2200, payLabel: 'за день', date: 'Эта неделя', urgent: false, location: 'Электросталь, дача', lat: 55.791, lng: 38.205, dist: '40 км', desc: 'Нужна помощь в огороде: перекопать грядки, посадить рассаду, убрать листья. Обед и проезд оплачиваем.', requirements: 'Без особых требований, главное — желание работать.', responses: 1, colors: ['#1A7A4A', '#B33D06', '#185FA5'] },
    { id: 12, cat: 'other', emoji: '⚡', title: 'Курьер на личном авто', company: 'Кофейня «Точка»', pay: 3500, payLabel: 'за день', date: 'Сегодня', urgent: true, location: 'Центр Москвы', lat: 55.756, lng: 37.617, dist: '1.2 км', desc: 'Нужен курьер с личным авто для развозки кофейного оборудования по точкам. 10 точек в центре, примерно 6 часов.', requirements: 'Своё авто, знание Москвы, аккуратность.', responses: 11, colors: ['#E8510A', '#185FA5', '#1A7A4A'] },
  ];

  function getJob(id) {
    return JOBS.find(function (j) { return j.id === Number(id); });
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
    JOBS: JOBS,
    getJob: getJob,
    CATEGORIES: CATEGORIES,
    rub: rub,
    commission: commission,
    jobIdFromQuery: jobIdFromQuery,
  };
})();
