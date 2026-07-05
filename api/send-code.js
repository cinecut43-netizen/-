// api/send-code.js — отправка SMS кода через СМС.ру
module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { phone } = req.body || {};
  if (!phone) return res.status(400).json({ error: 'Укажите телефон' });

  const apiKey = process.env.SMSRU_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'SMS сервис не настроен' });

  // Генерируем 4-значный код
  const code = String(Math.floor(1000 + Math.random() * 9000));

  // Нормализуем телефон
  const cleanPhone = phone.replace(/\D/g, '');

  try {
    const url = 'https://sms.ru/sms/send' +
      '?api_id=' + apiKey +
      '&to=' + cleanPhone +
      '&msg=' + encodeURIComponent('Ваш код для входа в Шабашку: ' + code) +
      '&json=1';

    const response = await fetch(url);
    const data = await response.json();

    if (data.status === 'OK') {
      // Сохраняем код в БД если есть, или в память
      const expires = Date.now() + 5 * 60 * 1000; // 5 минут

      // Пробуем сохранить в PostgreSQL
      try {
        const { pool } = require('../db');
        await pool.query(
          `INSERT INTO sms_codes (phone, code, expires_at) VALUES ($1, $2, to_timestamp($3/1000.0))
           ON CONFLICT DO NOTHING`,
          [phone, code, expires]
        );
      } catch(e) {
        // Если БД недоступна — храним в глобальной переменной (временно)
        if (!global.smsCodes) global.smsCodes = {};
        global.smsCodes[phone] = { code, expires };
      }

      return res.json({ ok: true });
    } else {
      console.error('СМС.ру ошибка:', data);
      return res.status(500).json({ error: 'Не удалось отправить SMS' });
    }
  } catch(e) {
    console.error('send-code error:', e);
    return res.status(500).json({ error: 'Ошибка отправки SMS' });
  }
};
