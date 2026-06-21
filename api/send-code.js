// /api/send-code.js
//
// Serverless-функция Vercel. Генерирует 4-значный код верификации,
// сохраняет его в памяти процесса (с TTL 10 минут) и в production
// отправляет по SMS через провайдера.
//
// В ДЕМО-РЕЖИМЕ (переменная DEMO_MODE=true или SMS_API_KEY не задан):
// код возвращается прямо в ответе JSON — для тестирования без SMS.
//
// Для реальной отправки SMS добавь переменную окружения SMS_API_KEY
// и раскомментируй блок с вызовом SMS провайдера (СМС.ру, SMSC, Twilio).
//
// Rate limiting: не более 3 запросов с одного номера за 10 минут.

const crypto = require('crypto');

// Хранилище кодов в памяти процесса. На Vercel serverless функции могут
// "засыпать" между вызовами, поэтому для production нужен Redis/Upstash.
// Для демо и небольшой нагрузки этого достаточно.
const codes = global.__shabashkaCodes || (global.__shabashkaCodes = {});

const CODE_TTL_MS   = 10 * 60 * 1000; // 10 минут
const MAX_ATTEMPTS  = 3;               // попыток отправки за окно
const ATTEMPT_WINDOW_MS = 10 * 60 * 1000;

function generateCode() {
  // Криптографически случайный 4-значный код
  return String(crypto.randomInt(1000, 9999));
}

function normalizePhone(phone) {
  // Оставляем только цифры, убираем ведущую 7 или 8
  var digits = phone.replace(/\D/g, '');
  if (digits.startsWith('8')) digits = '7' + digits.slice(1);
  if (!digits.startsWith('7')) digits = '7' + digits;
  return digits;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Метод не поддерживается' });
  }

  const { phone } = req.body || {};
  if (!phone || typeof phone !== 'string') {
    return res.status(400).json({ error: 'Укажите номер телефона' });
  }

  const normalPhone = normalizePhone(phone);
  if (normalPhone.length !== 11) {
    return res.status(400).json({ error: 'Неверный формат номера телефона' });
  }

  // Rate limiting
  const now = Date.now();
  const record = codes[normalPhone] || {};
  if (record.attempts && now - record.firstAttempt < ATTEMPT_WINDOW_MS) {
    if (record.attempts >= MAX_ATTEMPTS) {
      const minutesLeft = Math.ceil((ATTEMPT_WINDOW_MS - (now - record.firstAttempt)) / 60000);
      return res.status(429).json({
        error: 'Слишком много попыток. Попробуйте снова через ' + minutesLeft + ' мин.',
      });
    }
  } else {
    // Сбрасываем окно
    record.attempts = 0;
    record.firstAttempt = now;
  }

  const code = generateCode();
  record.code = code;
  record.expiresAt = now + CODE_TTL_MS;
  record.attempts = (record.attempts || 0) + 1;
  record.verified = false;
  codes[normalPhone] = record;

  const isDemoMode = !process.env.SMS_API_KEY || process.env.DEMO_MODE === 'true';

  if (!isDemoMode) {
    // === PRODUCTION: замени на реального SMS провайдера ===
    // Пример для СМС.ру:
    // const smsRes = await fetch(
    //   `https://sms.ru/sms/send?api_id=${process.env.SMS_API_KEY}` +
    //   `&to=${normalPhone}&msg=Ваш код Шабашка: ${code}&json=1`
    // );
    // const smsData = await smsRes.json();
    // if (smsData.status !== 'OK') {
    //   return res.status(502).json({ error: 'Не удалось отправить SMS. Попробуйте позже.' });
    // }
    return res.status(200).json({ ok: true, demo: false });
  }

  // ДЕМО: возвращаем код в ответе (убрать в production)
  return res.status(200).json({
    ok: true,
    demo: true,
    code: code, // ← убрать в production
    message: 'ДЕМО: SMS не отправляется. Код: ' + code,
  });
};
