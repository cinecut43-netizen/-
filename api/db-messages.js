// api/db-messages.js — API для сообщений чата
const { pool } = require('../db');

module.exports = async function handler(req, res) {
  const method = req.method;

  try {
    // GET — получить сообщения
    if (method === 'GET') {
      const { job_id, user_id, limit = 50 } = req.query;

      if (job_id && user_id) {
        // Все сообщения по заказу для пользователя
        const result = await pool.query(
          `SELECT m.*, 
                  su.name as sender_name,
                  ru.name as receiver_name
           FROM messages m
           LEFT JOIN users su ON m.sender_id = su.id
           LEFT JOIN users ru ON m.receiver_id = ru.id
           WHERE m.job_id = $1 
             AND (m.sender_id = $2 OR m.receiver_id = $2)
           ORDER BY m.created_at ASC
           LIMIT $3`,
          [job_id, user_id, limit]
        );
        return res.json({ ok: true, messages: result.rows });
      }

      if (user_id) {
        // Все диалоги пользователя
        const result = await pool.query(
          `SELECT DISTINCT ON (j.id)
                  m.id, m.text, m.created_at, m.is_read, m.job_id,
                  j.title as job_title, j.emoji,
                  CASE WHEN m.sender_id = $1 THEN ru.name ELSE su.name END as other_name,
                  CASE WHEN m.sender_id = $1 THEN m.receiver_id ELSE m.sender_id END as other_id
           FROM messages m
           JOIN jobs j ON m.job_id = j.id
           LEFT JOIN users su ON m.sender_id = su.id
           LEFT JOIN users ru ON m.receiver_id = ru.id
           WHERE m.sender_id = $1 OR m.receiver_id = $1
           ORDER BY j.id, m.created_at DESC`,
          [user_id]
        );
        return res.json({ ok: true, conversations: result.rows });
      }

      return res.status(400).json({ error: 'Укажите user_id' });
    }

    // POST — отправить сообщение
    if (method === 'POST') {
      const { job_id, sender_id, receiver_id, text } = req.body;
      if (!text || !sender_id) return res.status(400).json({ error: 'Укажите текст и sender_id' });

      const result = await pool.query(
        `INSERT INTO messages (job_id, sender_id, receiver_id, text)
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [job_id || null, sender_id, receiver_id || null, text]
      );
      return res.json({ ok: true, message: result.rows[0] });
    }

    // PATCH — отметить как прочитанное
    if (method === 'PATCH') {
      const { job_id, user_id } = req.body;
      await pool.query(
        `UPDATE messages SET is_read=true 
         WHERE job_id=$1 AND receiver_id=$2 AND is_read=false`,
        [job_id, user_id]
      );
      return res.json({ ok: true });
    }

    res.status(405).json({ error: 'Метод не поддерживается' });
  } catch (err) {
    console.error('db-messages error:', err);
    res.status(500).json({ error: 'Ошибка сервера: ' + err.message });
  }
};
