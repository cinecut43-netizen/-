// /api/push-subscribe.js — сохранение/удаление Web Push подписки браузера
const { pool } = require('../db');

module.exports = async function handler(req, res) {
  try {
    if (req.method === 'POST') {
      const { userId, subscription } = req.body || {};
      if (!userId || !subscription || !subscription.endpoint || !subscription.keys) {
        return res.status(400).json({ error: 'Укажите userId и subscription' });
      }
      await pool.query(
        `INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (endpoint) DO UPDATE SET user_id = $1`,
        [userId, subscription.endpoint, subscription.keys.p256dh, subscription.keys.auth]
      );
      return res.json({ ok: true });
    }

    if (req.method === 'DELETE') {
      const { endpoint } = req.body || {};
      if (!endpoint) return res.status(400).json({ error: 'Укажите endpoint' });
      await pool.query('DELETE FROM push_subscriptions WHERE endpoint = $1', [endpoint]);
      return res.json({ ok: true });
    }

    res.status(405).json({ error: 'Метод не поддерживается' });
  } catch (err) {
    console.error('push-subscribe error:', err);
    res.status(500).json({ error: 'Ошибка сервера: ' + err.message });
  }
};
