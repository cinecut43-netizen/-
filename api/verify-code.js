// api/verify-code.js — проверка Flash Call кода через Zvonok
module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { phone, code } = req.body || {};
  if (!phone || !code) return res.status(400).json({ error: 'Укажите телефон и код' });

  const publicKey = process.env.ZVONOK_PUBLIC_KEY;
  const campaignId = process.env.ZVONOK_CAMPAIGN_ID;
  const cleanPhone = phone.replace(/\D/g, '');

  try {
    // Проверяем код через Zvonok API
    const url = `https://zvonok.com/manager/cabapi_external/api/v1/phones/flashcall/checkcode/` +
      `?public_key=${publicKey}&campaign_id=${campaignId}&phone=${cleanPhone}&code=${code}`;

    const response = await fetch(url);
    const data = await response.json();

    console.log('Zvonok verify response:', JSON.stringify(data));

    if (data.status === 'success' || data.call_status === 'accepted') {
      // Сохраняем в БД если доступна
      try {
        const { pool } = require('../db');
        await pool.query(
          `INSERT INTO users (phone) VALUES ($1) ON CONFLICT (phone) DO NOTHING`,
          [phone]
        );
      } catch(e) {}

      return res.json({ ok: true });
    } else {
      return res.status(400).json({ error: 'Неверный код' });
    }
  } catch(e) {
    console.error('verify-code error:', e);
    return res.status(500).json({ error: 'Ошибка проверки кода' });
  }
};
