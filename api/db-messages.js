// api/db-messages.js — API для сообщений чата
// Поддерживает два типа переписки:
//  - привязанную к заказу (job_id задан) — как было раньше
//  - прямую, без заказа (job_id = null) — можно написать
//    исполнителю/работодателю напрямую, до всякого отклика
//
// Раньше "кто я" (user_id/sender_id) бралось из query/тела запроса как
// есть — то есть можно было прочитать чужую переписку или отправить
// сообщение от чужого имени, просто зная/угадав id. Теперь личность
// всегда берётся из серверной сессии (req.authUserId), а не от клиента.
const { pool } = require('../db');

module.exports = async function handler(req, res) {
  const method = req.method;

  try {
    if (!req.authUserId) return res.status(401).json({ error: 'Не авторизован' });
    const userId = req.authUserId;

    // GET — получить сообщения
    if (method === 'GET') {
      const { job_id, peer_id, limit = 50 } = req.query;

      if (job_id) {
        // Сообщения по конкретному заказу — только если я одна из сторон переписки
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
          [job_id, userId, limit]
        );
        return res.json({ ok: true, messages: result.rows });
      }

      if (peer_id) {
        // Прямая переписка с конкретным человеком, без привязки к заказу
        const result = await pool.query(
          `SELECT m.*,
                  su.name as sender_name,
                  ru.name as receiver_name
           FROM messages m
           LEFT JOIN users su ON m.sender_id = su.id
           LEFT JOIN users ru ON m.receiver_id = ru.id
           WHERE m.job_id IS NULL
             AND ((m.sender_id = $1 AND m.receiver_id = $2) OR (m.sender_id = $2 AND m.receiver_id = $1))
           ORDER BY m.created_at ASC
           LIMIT $3`,
          [userId, peer_id, limit]
        );
        return res.json({ ok: true, messages: result.rows });
      }

      // Все диалоги ТЕКУЩЕГО пользователя — и по заказам, и прямые
      const byJob = await pool.query(
        `SELECT DISTINCT ON (j.id)
                m.id, m.text, m.created_at, m.is_read, m.job_id, NULL::int as peer_id,
                j.title as job_title, j.emoji,
                CASE WHEN m.sender_id = $1 THEN ru.name ELSE su.name END as other_name,
                CASE WHEN m.sender_id = $1 THEN m.receiver_id ELSE m.sender_id END as other_id
         FROM messages m
         JOIN jobs j ON m.job_id = j.id
         LEFT JOIN users su ON m.sender_id = su.id
         LEFT JOIN users ru ON m.receiver_id = ru.id
         WHERE (m.sender_id = $1 OR m.receiver_id = $1) AND m.job_id IS NOT NULL
         ORDER BY j.id, m.created_at DESC`,
        [userId]
      );

      const direct = await pool.query(
        `SELECT DISTINCT ON (other_id)
                m.id, m.text, m.created_at, m.is_read, NULL::int as job_id, other_id as peer_id,
                NULL as job_title, NULL as emoji,
                ou.name as other_name, other_id as other_id
         FROM (
           SELECT m.*, CASE WHEN m.sender_id = $1 THEN m.receiver_id ELSE m.sender_id END as other_id
           FROM messages m
           WHERE (m.sender_id = $1 OR m.receiver_id = $1) AND m.job_id IS NULL
         ) m
         LEFT JOIN users ou ON ou.id = m.other_id
         ORDER BY other_id, m.created_at DESC`,
        [userId]
      );

      const conversations = byJob.rows.concat(direct.rows)
        .sort(function (a, b) { return new Date(b.created_at) - new Date(a.created_at); });

      return res.json({ ok: true, conversations: conversations });
    }

    // POST — отправить сообщение (от лица залогиненного пользователя)
    if (method === 'POST') {
      const { job_id, receiver_id, text } = req.body;
      if (!text) return res.status(400).json({ error: 'Укажите текст' });
      const sender_id = userId;

      const result = await pool.query(
        `INSERT INTO messages (job_id, sender_id, receiver_id, text)
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [job_id || null, sender_id, receiver_id || null, text]
      );

      if (receiver_id) {
        try {
          const { sendPushToUser } = require('../db/push');
          const senderRes = await pool.query('SELECT name FROM users WHERE id=$1', [sender_id]);
          const senderName = senderRes.rows[0] ? senderRes.rows[0].name : 'Собеседник';
          sendPushToUser(receiver_id, {
            title: '💬 ' + senderName,
            body: text,
            url: job_id ? '/chat?job=' + job_id : '/chat?with=' + sender_id,
            tag: 'chat-' + (job_id || 'direct-' + sender_id),
          });
        } catch (e) { console.error('push send skip:', e.message); }
      }

      return res.json({ ok: true, message: result.rows[0] });
    }

    // PATCH — отметить как прочитанное (только свои непрочитанные)
    if (method === 'PATCH') {
      const { job_id, peer_id } = req.body;
      if (job_id) {
        await pool.query(
          `UPDATE messages SET is_read=true WHERE job_id=$1 AND receiver_id=$2 AND is_read=false`,
          [job_id, userId]
        );
      } else if (peer_id) {
        await pool.query(
          `UPDATE messages SET is_read=true WHERE job_id IS NULL AND sender_id=$1 AND receiver_id=$2 AND is_read=false`,
          [peer_id, userId]
        );
      }
      return res.json({ ok: true });
    }

    res.status(405).json({ error: 'Метод не поддерживается' });
  } catch (err) {
    console.error('db-messages error:', err);
    res.status(500).json({ error: 'Ошибка сервера: ' + err.message });
  }
};
