// api/verify-code.js — проверка SMS кода
module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { phone, code } = req.body || {};
  if (!phone || !code) return res.status(400).json({ error: 'Укажите телефон и код' });

  try {
    // Проверяем в PostgreSQL
    const { pool } = require('../db');
    const result = await pool.query(
      `SELECT * FROM sms_codes WHERE phone=$1 AND code=$2 AND expires_at > NOW() AND used=false
       ORDER BY created_at DESC LIMIT 1`,
      [phone, code]
    );

    if (result.rows.length > 0) {
      await pool.query('UPDATE sms_codes SET used=true WHERE id=$1', [result.rows[0].id]);
      return res.json({ ok: true });
    }

    // Проверяем в памяти (если БД недоступна)
    if (global.smsCodes && global.smsCodes[phone]) {
      const entry = global.smsCodes[phone];
      if (entry.code === code && entry.expires > Date.now()) {
        delete global.smsCodes[phone];
        return res.json({ ok: true });
      }
    }

    return res.status(400).json({ error: 'Неверный или устаревший код' });
  } catch(e) {
    // Если БД недоступна — проверяем в памяти
    if (global.smsCodes && global.smsCodes[phone]) {
      const entry = global.smsCodes[phone];
      if (entry.code === code && entry.expires > Date.now()) {
        delete global.smsCodes[phone];
        return res.json({ ok: true });
      }
    }
    return res.status(400).json({ error: 'Неверный код' });
  }
};
