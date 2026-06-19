// /api/verify-code.js
//
// Serverless-функция Vercel. Проверяет введённый пользователем код
// против сохранённого в памяти процесса (из /api/send-code.js).
//
// Защита от перебора: не более 5 неверных попыток на один номер,
// после чего запись удаляется и нужно запросить новый код.

const codes = global.__shabashkaCodes || (global.__shabashkaCodes = {});
const MAX_VERIFY_ATTEMPTS = 5;

function normalizePhone(phone) {
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

  const { phone, code } = req.body || {};
  if (!phone || !code) {
    return res.status(400).json({ error: 'Укажите номер телефона и код' });
  }

  const normalPhone = normalizePhone(phone);
  const record = codes[normalPhone];

  if (!record || !record.code) {
    return res.status(400).json({ error: 'Сначала запросите код подтверждения' });
  }

  if (Date.now() > record.expiresAt) {
    delete codes[normalPhone];
    return res.status(400).json({ error: 'Код истёк. Запросите новый.' });
  }

  // Защита от перебора
  record.verifyAttempts = (record.verifyAttempts || 0) + 1;
  if (record.verifyAttempts > MAX_VERIFY_ATTEMPTS) {
    delete codes[normalPhone];
    return res.status(429).json({ error: 'Слишком много попыток. Запросите новый код.' });
  }

  if (code !== record.code) {
    return res.status(400).json({
      error: 'Неверный код. Осталось попыток: ' + (MAX_VERIFY_ATTEMPTS - record.verifyAttempts),
    });
  }

  // Код верный — помечаем номер как подтверждённый и удаляем код
  record.verified = true;
  record.code = null;

  return res.status(200).json({ ok: true, phone: normalPhone });
};
