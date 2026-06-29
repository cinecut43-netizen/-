// api/db-feedbacks.js — API для обратной связи
const { pool } = require('../db');

module.exports = async function handler(req, res) {
  const method = req.method;

  try {
    // POST — сохранить отзыв
    if (method === 'POST') {
      const { type, rating, text, page, user_name, phone } = req.body;

      await pool.query(
        `INSERT INTO feedbacks (type, rating, text, page, created_at)
         VALUES ($1, $2, $3, $4, NOW())`,
        [type || '💬 Отзыв', rating || 0, text || '', page || '/']
      );

      // Отправляем в Telegram
      const botToken = process.env.TELEGRAM_BOT_TOKEN;
      const adminId = process.env.TELEGRAM_ADMIN_ID;
      if (botToken && adminId) {
        const stars = rating > 0 ? '⭐'.repeat(rating) : '';
        const msg = `💬 <b>Новый отзыв</b>\n${type || ''} ${stars}\n📝 ${text}\n👤 ${user_name || 'Аноним'}${phone ? ' · ' + phone : ''}\n📄 ${page}`;
        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: adminId, text: msg, parse_mode: 'HTML' })
        });
      }

      return res.json({ ok: true });
    }

    // GET — все отзывы для админки
    if (method === 'GET') {
      const result = await pool.query(
        `SELECT * FROM feedbacks ORDER BY created_at DESC LIMIT 100`
      );
      return res.json({ ok: true, feedbacks: result.rows });
    }

    // PATCH — ответить на отзыв
    if (method === 'PATCH') {
      const { id, answer } = req.body;
      await pool.query(
        `UPDATE feedbacks SET answer=$1, answered_at=NOW() WHERE id=$2`,
        [answer, id]
      );
      return res.json({ ok: true });
    }

    res.status(405).json({ error: 'Метод не поддерживается' });
  } catch (err) {
    console.error('db-feedbacks error:', err);
    res.status(500).json({ error: 'Ошибка сервера: ' + err.message });
  }
};
