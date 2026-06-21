// /api/check-new-jobs.js
//
// Serverless-функция Vercel. Возвращает список новых срочных заказов,
// появившихся с момента последней проверки (передаётся как параметр since).
//
// В текущей архитектуре (localStorage, без БД) заказы хранятся в браузере,
// поэтому сервер возвращает демо-данные — в продакшене здесь был бы
// запрос к базе данных.
//
// Клиент (pwa.js) вызывает этот endpoint каждые 30 секунд и если
// появились новые заказы — показывает локальное уведомление через
// ServiceWorker.showNotification() без необходимости в серверном push.

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Метод не поддерживается' });
  }

  // since — timestamp последней проверки (Unix ms), по умолчанию 1 минута назад
  var since = parseInt(req.query.since) || (Date.now() - 60000);
  var now = Date.now();

  // Демо-данные: имитируем появление новых срочных заказов.
  // В продакшене здесь: SELECT * FROM jobs WHERE created_at > since AND urgent = true
  //
  // Логика демо: каждые ~2 минуты "появляется" новый срочный заказ.
  // Делаем это детерминированно по времени — не рандомно, чтобы не
  // спамить уведомлениями при частых проверках.
  var DEMO_JOBS = [
    { id: 101, title: 'Срочно нужны грузчики', pay: 3500, cat: 'move', emoji: '📦', location: 'Москва, Сокольники', urgent: true },
    { id: 102, title: 'Уборка офиса после ремонта', pay: 2800, cat: 'clean', emoji: '🧹', location: 'Москва, Арбат', urgent: true },
    { id: 103, title: 'Промоутеры на открытие', pay: 3000, cat: 'event', emoji: '🎉', location: 'Москва, ТЦ Европейский', urgent: true },
    { id: 104, title: 'Подсобный рабочий на стройку', pay: 4200, cat: 'build', emoji: '🔨', location: 'Москва, Раменки', urgent: true },
  ];

  // Выбираем "новый" заказ на основе текущей минуты — меняется каждые 2 мин
  var minuteSlot = Math.floor(now / (2 * 60 * 1000));
  var jobIndex = minuteSlot % DEMO_JOBS.length;

  // "Время создания" этого слота — начало 2-минутного окна
  var slotStart = minuteSlot * 2 * 60 * 1000;

  // Возвращаем заказ только если он "создан" после since и в текущем окне
  var newJobs = [];
  if (slotStart > since && slotStart <= now) {
    newJobs.push(Object.assign({}, DEMO_JOBS[jobIndex], { createdAt: slotStart }));
  }

  res.setHeader('Cache-Control', 'no-cache, no-store');
  return res.status(200).json({
    newJobs: newJobs,
    checkedAt: now,
  });
};
