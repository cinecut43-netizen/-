// /api/admin-login.js
//
// Serverless-функция Vercel. Проверяет пароль для входа в админ-панель
// отдельно для каждой роли (Super Admin / Moderator / Support). Пароли
// хранятся в переменных окружения на Vercel, а не в коде страницы — иначе
// любой через "просмотр кода страницы" увидел бы их в открытом виде.
//
// Выданный токен подписан секретным ключом (HMAC-SHA256) — подделать его
// без знания секрета математически нереалистично, в отличие от прежней
// версии, где токен был обычным base64 без подписи.
//
// Для super_admin (самая опасная роль — полный доступ, удаление
// пользователей, финансовые настройки) добавлено ограничение числа
// попыток входа: не больше 5 неверных попыток подряд за 15 минут с одного
// и того же запроса, дальше — временная блокировка. Это сильно замедляет
// автоматический подбор пароля. Для moderator/support ограничения нет —
// у них и так не самые разрушительные права, а усложнять каждую роль
// не нужно.
//
// Настройка на Vercel: Settings → Environment Variables, добавить:
//   ADMIN_PASSWORD_SUPER_ADMIN   — пароль для роли Super Admin
//   ADMIN_PASSWORD_MODERATOR     — пароль для роли Moderator
//   ADMIN_PASSWORD_SUPPORT       — пароль для роли Support
//   ADMIN_TOKEN_SECRET           — длинная случайная строка для подписи
//                                  токена (НЕ пароль для входа, просто
//                                  секрет для математики подписи).
//                                  Сгенерировать можно командой:
//                                  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

import crypto from 'crypto';

const ROLE_ENV_MAP = {
  super_admin: 'ADMIN_PASSWORD_SUPER_ADMIN',
  moderator: 'ADMIN_PASSWORD_MODERATOR',
  support: 'ADMIN_PASSWORD_SUPPORT',
};

const MAX_ATTEMPTS = 5;
const ATTEMPT_WINDOW_MS = 15 * 60 * 1000; // 15 минут

// Простое хранилище попыток входа в памяти процесса. На Vercel serverless-
// функции могут "засыпать" и сбрасывать память между вызовами при низкой
// нагрузке — это не настоящая защита промышленного уровня (для неё нужно
// внешнее хранилище типа Redis), но ощутимо тормозит наивный автоматический
// перебор пароля, что и было целью для одной самой чувствительной роли.
const loginAttempts = global.__shabashkaLoginAttempts || (global.__shabashkaLoginAttempts = {});

function signToken(payload, secret) {
  const hmac = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  return Buffer.from(payload).toString('base64') + '.' + hmac;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Метод не поддерживается, используйте POST' });
  }

  const { role, password } = req.body || {};

  if (!role || !ROLE_ENV_MAP[role]) {
    return res.status(400).json({ error: 'Неизвестная роль' });
  }
  if (!password || typeof password !== 'string') {
    return res.status(400).json({ error: 'Введите пароль' });
  }

  // Ограничение попыток — только для super_admin
  if (role === 'super_admin') {
    const now = Date.now();
    const record = loginAttempts.super_admin || { count: 0, firstAttempt: now };
    if (now - record.firstAttempt > ATTEMPT_WINDOW_MS) {
      // Окно истекло — начинаем считать заново
      record.count = 0;
      record.firstAttempt = now;
    }
    if (record.count >= MAX_ATTEMPTS) {
      const minutesLeft = Math.ceil((ATTEMPT_WINDOW_MS - (now - record.firstAttempt)) / 60000);
      return res.status(429).json({
        error: 'Слишком много неверных попыток входа. Попробуйте снова через ' + minutesLeft + ' мин.',
      });
    }
  }

  const envKey = ROLE_ENV_MAP[role];
  const correctPassword = process.env[envKey];
  const tokenSecret = process.env.ADMIN_TOKEN_SECRET;

  if (!correctPassword) {
    return res.status(500).json({
      error: 'Вход для этой роли пока не настроен на сервере (' + envKey + ')',
    });
  }
  if (!tokenSecret) {
    return res.status(500).json({
      error: 'На сервере не настроен ADMIN_TOKEN_SECRET, вход временно недоступен',
    });
  }

  if (password !== correctPassword) {
    if (role === 'super_admin') {
      const now = Date.now();
      const record = loginAttempts.super_admin || { count: 0, firstAttempt: now };
      record.count += 1;
      loginAttempts.super_admin = record;
    }
    return res.status(401).json({ error: 'Неверный пароль' });
  }

  // Успешный вход для super_admin — сбрасываем счётчик неудачных попыток
  if (role === 'super_admin') {
    loginAttempts.super_admin = { count: 0, firstAttempt: Date.now() };
  }

  const payload = role + ':' + Date.now();
  const token = signToken(payload, tokenSecret);

  return res.status(200).json({ ok: true, token: token });
}

