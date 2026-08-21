// db/push.js — отправка настоящих Web Push уведомлений (работает даже
// при закрытом браузере, в отличие от старого клиентского поллинга).
//
// Требует переменные окружения:
//   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (например, mailto:you@example.com)
// Сгенерировать пару ключей: npx web-push generate-vapid-keys

const webpush = require('web-push');
const { pool } = require('./index');

const PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@shabashka.ru';

let configured = false;
if (PUBLIC_KEY && PRIVATE_KEY) {
  webpush.setVapidDetails(SUBJECT, PUBLIC_KEY, PRIVATE_KEY);
  configured = true;
} else {
  console.log('⚠️ VAPID-ключи не заданы — Web Push отправка отключена (переменные VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY)');
}

// Отправляет уведомление всем подпискам конкретного пользователя.
// payload: { title, body, url, tag }
async function sendPushToUser(userId, payload) {
  if (!configured || !userId) return;
  try {
    const result = await pool.query('SELECT * FROM push_subscriptions WHERE user_id = $1', [userId]);
    await Promise.all(result.rows.map(function (sub) { return sendToSubscription(sub, payload); }));
  } catch (err) {
    console.error('sendPushToUser error:', err.message);
  }
}

// Отправляет всем подписанным пользователям определённой роли (например,
// всем исполнителям — при публикации нового заказа). Ограничено разумным
// количеством, чтобы не заваливать сеть при большой базе.
async function sendPushToRole(role, payload, limit) {
  if (!configured) return;
  try {
    const result = await pool.query(
      `SELECT ps.* FROM push_subscriptions ps
       JOIN users u ON ps.user_id = u.id
       WHERE u.role = $1
       ORDER BY ps.created_at DESC
       LIMIT $2`,
      [role, limit || 200]
    );
    await Promise.all(result.rows.map(function (sub) { return sendToSubscription(sub, payload); }));
  } catch (err) {
    console.error('sendPushToRole error:', err.message);
  }
}

async function sendToSubscription(sub, payload) {
  const subscription = {
    endpoint: sub.endpoint,
    keys: { p256dh: sub.p256dh, auth: sub.auth },
  };
  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload));
  } catch (err) {
    // 404/410 — подписка больше не действительна (юзер отписался/удалил браузер) — чистим
    if (err.statusCode === 404 || err.statusCode === 410) {
      await pool.query('DELETE FROM push_subscriptions WHERE endpoint = $1', [sub.endpoint]).catch(function(){});
    } else {
      console.error('web-push send error:', err.message);
    }
  }
}

module.exports = { sendPushToUser, sendPushToRole, isConfigured: function () { return configured; }, PUBLIC_KEY: PUBLIC_KEY };
