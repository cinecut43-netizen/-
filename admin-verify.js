// /api/admin-verify.js
//
// Serverless-функция Vercel. Проверяет, что токен, присланный клиентом,
// реально был выдан сервером (через admin-login.js) и не истёк. Подпись
// токена проверяется тем же секретом ADMIN_TOKEN_SECRET — клиент не может
// сам решить, что его токен валиден, потому что секрет ему недоступен.
//
// Вызывается с каждой страницы админки при загрузке (admin-nav.js), чтобы
// заменить прежнюю чисто клиентскую проверку, которую можно было обойти
// через консоль разработчика.

import crypto from 'crypto';

const TOKEN_LIFETIME_MS = 24 * 60 * 60 * 1000; // токен действует 24 часа

function verifyToken(token, secret) {
  if (!token || typeof token !== 'string' || !token.includes('.')) return null;
  const [encodedPayload, signature] = token.split('.');
  if (!encodedPayload || !signature) return null;

  let payload;
  try {
    payload = Buffer.from(encodedPayload, 'base64').toString('utf-8');
  } catch (e) {
    return null;
  }

  const expectedSignature = crypto.createHmac('sha256', secret).update(payload).digest('hex');

  // timingSafeEqual требует буферы одинаковой длины — разная длина сама по
  // себе означает "не совпадает", сравнивать в таком случае не нужно
  const sigBuf = Buffer.from(signature);
  const expectedBuf = Buffer.from(expectedSignature);
  if (sigBuf.length !== expectedBuf.length) return null;
  if (!crypto.timingSafeEqual(sigBuf, expectedBuf)) return null;

  const [role, timestamp] = payload.split(':');
  if (!role || !timestamp) return null;

  const age = Date.now() - Number(timestamp);
  if (age < 0 || age >= TOKEN_LIFETIME_MS) return null;

  return { role };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Метод не поддерживается, используйте POST' });
  }

  const { token, role } = req.body || {};
  const tokenSecret = process.env.ADMIN_TOKEN_SECRET;

  if (!tokenSecret) {
    return res.status(500).json({ valid: false, error: 'На сервере не настроен ADMIN_TOKEN_SECRET' });
  }

  const result = verifyToken(token, tokenSecret);

  if (!result || result.role !== role) {
    return res.status(200).json({ valid: false });
  }

  return res.status(200).json({ valid: true });
}
