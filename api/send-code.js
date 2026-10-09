// api/send-code.js — Flash Call верификация через Zvonok.com
module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { phone } = req.body || {};
  if (!phone) return res.status(400).json({ error: 'Укажите телефон' });

  const publicKey = process.env.ZVONOK_PUBLIC_KEY;
  const campaignId = process.env.ZVONOK_CAMPAIGN_ID;

  if (!publicKey || !campaignId) {
    return res.status(500).json({ error: 'Сервис верификации не настроен' });
  }

  const cleanPhone = phone.replace(/\D/g, '');

  // Регистрация закрыта: звоним только тем, кто уже есть в базе (вход).
  const registration = require('../db/registration');
  if (registration.isClosed()) {
    try {
      const { pool } = require('../db');
      const found = await pool.query(
        "SELECT 1 FROM users WHERE regexp_replace(phone, '\\D', '', 'g') = $1 LIMIT 1", [cleanPhone]
      );
      if (!found.rows.length) {
        return res.status(403).json({ error: registration.MESSAGE, code: 'registration_closed' });
      }
    } catch (e) {
      console.error('send-code registration check error:', e.message);
      return res.status(503).json({ error: 'Сервис временно недоступен. Попробуйте позже.' });
    }
  }

  try {
    const url = `https://zvonok.com/manager/cabapi_external/api/v1/phones/flashcall/` +
      `?public_key=${publicKey}&campaign_id=${campaignId}&phone=${cleanPhone}`;

    const response = await fetch(url);
    const data = await response.json();

    console.log('Zvonok response:', JSON.stringify(data));

    if (data.status === 'ok' && data.data) {
      // Сохраняем pincode который прислал Zvonok
      if (!global.zvonokCodes) global.zvonokCodes = {};
      global.zvonokCodes[cleanPhone] = {
        pincode: data.data.pincode,
        callId: data.data.call_id,
        expires: Date.now() + 5 * 60 * 1000
      };
      return res.json({ ok: true, method: 'flashcall' });
    } else {
      console.error('Zvonok error:', data);
      return res.status(500).json({ error: 'Не удалось инициировать звонок' });
    }
  } catch(e) {
    console.error('send-code error:', e);
    return res.status(500).json({ error: 'Ошибка сервиса верификации' });
  }
};
