const crypto = require('crypto');
const { pool } = require('../db');

const ROLE_ENV_MAP = {
  super_admin: 'ADMIN_PASSWORD_SUPER_ADMIN',
  moderator: 'ADMIN_PASSWORD_MODERATOR',
  support: 'ADMIN_PASSWORD_SUPPORT',
};

const MAX_ATTEMPTS = 5;
const ATTEMPT_WINDOW_MS = 15 * 60 * 1000;

const loginAttempts = global.__shabashkaLoginAttempts || (global.__shabashkaLoginAttempts = {});

function signToken(payload, secret) {
  const hmac = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  return Buffer.from(payload).toString('base64') + '.' + hmac;
}

// Реальная запись о входе (успешном или нет) — раньше "История входов" в
// админке была полностью выдуманной демо-таблицей. Ошибка записи в базу
// не должна ломать сам вход, поэтому не бросаем исключение наружу.
async function logLoginAttempt(req, role, success) {
  try {
    const ua = req.headers['user-agent'] || 'неизвестное устройство';
    const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
    await pool.query(
      `INSERT INTO admin_actions (role, description, meta, device_info, ip) VALUES ($1,$2,$3,$4,$5)`,
      [role, 'Вход в систему', JSON.stringify({ success: success }), ua, ip || null]
    );
  } catch (e) {
    console.error('logLoginAttempt error:', e.message);
  }
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Метод не поддерживается' });
  }

  const { role, password } = req.body || {};

  if (!role || !ROLE_ENV_MAP[role]) {
    return res.status(400).json({ error: 'Неизвестная роль' });
  }
  if (!password || typeof password !== 'string') {
    return res.status(400).json({ error: 'Введите пароль' });
  }

  if (role === 'super_admin') {
    const now = Date.now();
    const record = loginAttempts.super_admin || { count: 0, firstAttempt: now };
    if (now - record.firstAttempt > ATTEMPT_WINDOW_MS) {
      record.count = 0;
      record.firstAttempt = now;
    }
    if (record.count >= MAX_ATTEMPTS) {
      const minutesLeft = Math.ceil((ATTEMPT_WINDOW_MS - (now - record.firstAttempt)) / 60000);
      return res.status(429).json({ error: 'Слишком много попыток. Подождите ' + minutesLeft + ' мин.' });
    }
  }

  const correctPassword = process.env[ROLE_ENV_MAP[role]];
  const tokenSecret = process.env.ADMIN_TOKEN_SECRET;

  if (!correctPassword) {
    return res.status(500).json({ error: 'Пароль для этой роли не настроен на сервере' });
  }
  if (!tokenSecret) {
    return res.status(500).json({ error: 'ADMIN_TOKEN_SECRET не настроен на сервере' });
  }

  if (password !== correctPassword) {
    if (role === 'super_admin') {
      const now = Date.now();
      const record = loginAttempts.super_admin || { count: 0, firstAttempt: now };
      record.count += 1;
      loginAttempts.super_admin = record;
    }
    logLoginAttempt(req, role, false); // не ждём — не должно тормозить ответ об ошибке
    return res.status(401).json({ error: 'Неверный пароль' });
  }

  if (role === 'super_admin') {
    loginAttempts.super_admin = { count: 0, firstAttempt: Date.now() };
  }

  const payload = role + ':' + Date.now();
  const token = signToken(payload, tokenSecret);
  logLoginAttempt(req, role, true);

  return res.status(200).json({ ok: true, token: token });
};
