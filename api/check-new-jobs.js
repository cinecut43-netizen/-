// /api/check-new-jobs.js
//
// Возвращает список новых открытых заказов, появившихся с момента последней
// проверки (since — Unix ms). Клиент (pwa.js) дёргает это каждые 30 секунд
// и показывает локальное уведомление через ServiceWorker.showNotification()
// без необходимости в серверном Web Push.

const { pool } = require('../db');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Метод не поддерживается' });
  }

  var since = parseInt(req.query.since) || (Date.now() - 60000);
  var now = Date.now();

  try {
    const result = await pool.query(
      `SELECT id, title, pay, category as cat, emoji, location, urgent, created_at
       FROM jobs
       WHERE status IN ('new', 'has_responses')
         AND created_at > to_timestamp($1 / 1000.0)
       ORDER BY created_at DESC
       LIMIT 10`,
      [since]
    );

    const newJobs = result.rows.map(function (j) {
      return {
        id: j.id,
        title: j.title,
        pay: parseInt(j.pay),
        cat: j.cat,
        emoji: j.emoji || '📦',
        location: j.location || 'Россия',
        urgent: j.urgent || false,
      };
    });

    res.setHeader('Cache-Control', 'no-cache, no-store');
    return res.status(200).json({ newJobs: newJobs, checkedAt: now });
  } catch (err) {
    console.error('check-new-jobs error:', err);
    // БД недоступна — лучше молча ничего не уведомлять, чем показать фейк
    res.setHeader('Cache-Control', 'no-cache, no-store');
    return res.status(200).json({ newJobs: [], checkedAt: now });
  }
};
