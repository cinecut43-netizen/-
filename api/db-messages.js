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
      // Реальное число непрочитанных — раньше на сайте это был локальный
      // счётчик в localStorage, который у нового пользователя изначально
      // зашивался равным 3 (демо-заглушка), даже если сообщений вообще
      // не было. Теперь честный подсчёт по базе.
      if (req.query.action === 'unread-count') {
        const result = await pool.query(
          `SELECT COUNT(*) FROM messages WHERE receiver_id=$1 AND is_read=false AND deleted IS NOT TRUE`,
          [userId]
        );
        return res.json({ ok: true, count: parseInt(result.rows[0].count) });
      }

      // Разбивка непрочитанных — раньше группировалась по (отправитель, заказ),
      // из-за чего один и тот же человек, писавший по нескольким заказам,
      // давал несколько отдельных пунктов. Группируем только по человеку —
      // так же, как теперь группируется весь список диалогов ниже.
      if (req.query.action === 'unread-breakdown') {
        const result = await pool.query(
          `SELECT
             m.sender_id,
             su.name as sender_name,
             (array_agg(j.id ORDER BY m.created_at DESC))[1] as job_id,
             (array_agg(j.title ORDER BY m.created_at DESC))[1] as job_title,
             COUNT(*) as unread_count
           FROM messages m
           LEFT JOIN users su ON m.sender_id = su.id
           LEFT JOIN jobs j ON m.job_id = j.id
           WHERE m.receiver_id=$1 AND m.is_read=false AND m.deleted IS NOT TRUE
           GROUP BY m.sender_id, su.name
           ORDER BY MAX(m.created_at) DESC`,
          [userId]
        );
        const items = result.rows.map(function (r) {
          return {
            senderId: r.sender_id,
            senderName: r.sender_name || 'Собеседник',
            jobId: r.job_id,
            jobTitle: r.job_title,
            unreadCount: parseInt(r.unread_count),
            convoId: 'user-' + r.sender_id,
          };
        });
        return res.json({ ok: true, items: items });
      }

      const { job_id, peer_id, with: withId, limit = 50 } = req.query;

      // Раньше переписка по одному и тому же человеку разбивалась на
      // отдельный диалог под КАЖДЫЙ заказ (job_id) — если работник
      // откликался на 5 заказов одного работодателя, в списке появлялось
      // 5 одинаковых на вид строк с одним и тем же именем. Теперь список
      // и переписка группируются по собеседнику: with=<id другого человека>
      // отдаёт ВСЮ историю с ним разом, независимо от того, по какому
      // заказу было отправлено каждое сообщение.
      if (withId) {
        const result = await pool.query(
          `SELECT m.*,
                  su.name as sender_name,
                  ru.name as receiver_name,
                  j.title as job_title
           FROM messages m
           LEFT JOIN users su ON m.sender_id = su.id
           LEFT JOIN users ru ON m.receiver_id = ru.id
           LEFT JOIN jobs j ON m.job_id = j.id
           WHERE (m.sender_id = $1 AND m.receiver_id = $2) OR (m.sender_id = $2 AND m.receiver_id = $1)
           ORDER BY m.created_at ASC
           LIMIT $3`,
          [userId, withId, limit]
        );
        return res.json({ ok: true, messages: result.rows });
      }

      // Старые параметры оставлены для обратной совместимости (на случай,
      // если что-то ещё их использует) — сам чат ими больше не пользуется.
      if (job_id) {
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

      // Список диалогов ТЕКУЩЕГО пользователя — один диалог на человека,
      // а не на заказ. Берём самое последнее сообщение с каждым
      // собеседником, независимо от того, по какому заказу (или без заказа)
      // оно было отправлено.
      const conversations = await pool.query(
        `SELECT DISTINCT ON (other_id)
                m.id, m.text, m.created_at, m.is_read, m.job_id,
                j.title as job_title, j.emoji,
                ou.name as other_name, other_id
         FROM (
           SELECT m.*, CASE WHEN m.sender_id = $1 THEN m.receiver_id ELSE m.sender_id END as other_id
           FROM messages m
           WHERE m.sender_id = $1 OR m.receiver_id = $1
         ) m
         LEFT JOIN jobs j ON m.job_id = j.id
         LEFT JOIN users ou ON ou.id = m.other_id
         WHERE m.other_id IS NOT NULL
         ORDER BY other_id, m.created_at DESC`,
        [userId]
      );

      return res.json({ ok: true, conversations: conversations.rows });
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

    // PATCH — либо отметить прочитанным (with/job_id/peer_id без id), либо
    // отредактировать своё сообщение (id + text).
    if (method === 'PATCH') {
      const { id, text, job_id, peer_id, with: withId } = req.body;

      if (id) {
        // Редактирование — только своё собственное сообщение
        const own = await pool.query('SELECT sender_id FROM messages WHERE id=$1', [id]);
        if (!own.rows.length) return res.status(404).json({ error: 'Сообщение не найдено' });
        if (own.rows[0].sender_id !== userId) return res.status(403).json({ error: 'Можно редактировать только свои сообщения' });
        if (!text || !text.trim()) return res.status(400).json({ error: 'Текст не может быть пустым' });

        const result = await pool.query(
          `UPDATE messages SET text=$1, edited_at=NOW() WHERE id=$2 RETURNING *`,
          [text.trim(), id]
        );
        return res.json({ ok: true, message: result.rows[0] });
      }

      if (withId) {
        // Помечаем прочитанным всё от этого человека сразу — по всем
        // заказам и напрямую, а не только по одному job_id.
        await pool.query(
          `UPDATE messages SET is_read=true WHERE sender_id=$1 AND receiver_id=$2 AND is_read=false`,
          [withId, userId]
        );
      } else if (job_id) {
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

    // DELETE — удалить своё сообщение (не стираем физически, чтобы у
    // собеседника не осталась "дыра" в переписке — заменяем текст на
    // заглушку, помечаем deleted, дальше фронтенд сам решает как показать).
    if (method === 'DELETE') {
      const { id } = req.query;
      if (!id) return res.status(400).json({ error: 'Укажите id сообщения' });

      const own = await pool.query('SELECT sender_id FROM messages WHERE id=$1', [id]);
      if (!own.rows.length) return res.status(404).json({ error: 'Сообщение не найдено' });
      if (own.rows[0].sender_id !== userId) return res.status(403).json({ error: 'Можно удалять только свои сообщения' });

      await pool.query(`UPDATE messages SET deleted=true, text='' WHERE id=$1`, [id]);
      return res.json({ ok: true });
    }

    res.status(405).json({ error: 'Метод не поддерживается' });
  } catch (err) {
    console.error('db-messages error:', err);
    res.status(500).json({ error: 'Ошибка сервера: ' + err.message });
  }
};
