// api/db-responses.js — API для откликов
const { pool } = require('../db');

module.exports = async function handler(req, res) {
  const method = req.method;

  try {
    // POST — создать отклик (от лица залогиненного пользователя)
    if (method === 'POST') {
      if (!req.authUserId) return res.status(401).json({ error: 'Не авторизован' });
      const { job_id, worker_name, proposed_pay, message } = req.body;
      const worker_id = req.authUserId;
      if (!job_id) return res.status(400).json({ error: 'Укажите job_id' });

      // Проверяем не откликался ли уже
      const existing = await pool.query(
        'SELECT id FROM responses WHERE job_id=$1 AND worker_id=$2',
        [job_id, worker_id]
      );
      if (existing.rows.length) {
        return res.json({ ok: false, error: 'Вы уже откликались на этот заказ' });
      }

      const result = await pool.query(
        `INSERT INTO responses (job_id, worker_id, proposed_pay, message)
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [job_id, worker_id, proposed_pay || null, message || '']
      );

      // Обновляем статус заказа
      const jobRes = await pool.query(
        `UPDATE jobs SET status='has_responses', updated_at=NOW() WHERE id=$1 AND status='new' RETURNING *`,
        [job_id]
      );
      const job = jobRes.rows[0] || (await pool.query('SELECT * FROM jobs WHERE id=$1', [job_id])).rows[0];

      if (job && job.employer_id) {
        try {
          const { sendPushToUser } = require('../db/push');
          sendPushToUser(job.employer_id, {
            title: '🎉 Новый отклик на ваш заказ',
            body: (worker_name || 'Исполнитель') + ' откликнулся на «' + job.title + '»',
            url: '/employer',
            tag: 'response-' + result.rows[0].id,
          });
        } catch (e) { console.error('push send skip:', e.message); }
      }

      return res.json({ ok: true, response: result.rows[0] });
    }

    // GET — отклики на заказ
    // GET — все отклики на заказы конкретного работодателя (для дашборда)
    if (method === 'GET' && req.query.employer_id) {
      const result = await pool.query(
        `SELECT r.*, j.title as job_title, u.name as worker_name, u.rating, u.jobs_done
         FROM responses r
         JOIN jobs j ON r.job_id = j.id
         LEFT JOIN users u ON r.worker_id = u.id
         WHERE j.employer_id = $1
         ORDER BY r.created_at DESC
         LIMIT 50`,
        [req.query.employer_id]
      );
      return res.json({ ok: true, responses: result.rows });
    }

    if (method === 'GET' && req.query.job_id) {
      const result = await pool.query(
        `SELECT r.*, u.name as worker_name, u.rating, u.jobs_done, u.verified
         FROM responses r
         LEFT JOIN users u ON r.worker_id = u.id
         WHERE r.job_id = $1
         ORDER BY r.created_at DESC`,
        [req.query.job_id]
      );
      return res.json({ ok: true, responses: result.rows });
    }

    // GET — отклики пользователя
    if (method === 'GET' && req.query.worker_id) {
      const result = await pool.query(
        `SELECT r.*, j.title, j.pay, j.pay_label, j.emoji, j.status as job_status,
                j.location, j.date, u.name as employer_name, u.company as employer_company
         FROM responses r
         JOIN jobs j ON r.job_id = j.id
         LEFT JOIN users u ON j.employer_id = u.id
         WHERE r.worker_id = $1
         ORDER BY r.created_at DESC`,
        [req.query.worker_id]
      );
      return res.json({ ok: true, responses: result.rows });
    }

    // PATCH — принять/отклонить отклик (только владелец заказа)
    if (method === 'PATCH') {
      if (!req.authUserId) return res.status(401).json({ error: 'Не авторизован' });
      const { id, status } = req.body;

      const respCheck = await pool.query(
        `SELECT r.job_id, r.worker_id, j.employer_id FROM responses r JOIN jobs j ON r.job_id = j.id WHERE r.id=$1`,
        [id]
      );
      if (!respCheck.rows.length) return res.status(404).json({ error: 'Отклик не найден' });
      if (respCheck.rows[0].employer_id !== req.authUserId) {
        return res.status(403).json({ error: 'Это не ваш заказ' });
      }
      const job_id = respCheck.rows[0].job_id;
      const worker_id = respCheck.rows[0].worker_id;

      await pool.query('UPDATE responses SET status=$1 WHERE id=$2', [status, id]);

      if (status === 'accepted' && job_id && worker_id) {
        const jobRes = await pool.query(
          `UPDATE jobs SET status='selected', selected_worker_id=$1, updated_at=NOW() WHERE id=$2 RETURNING *`,
          [worker_id, job_id]
        );
        // Отклоняем остальных
        await pool.query(
          `UPDATE responses SET status='rejected' WHERE job_id=$1 AND id!=$2`,
          [job_id, id]
        );

        const job = jobRes.rows[0];
        if (job) {
          try {
            const { sendPushToUser } = require('../db/push');
            sendPushToUser(worker_id, {
              title: '🎉 Вас выбрали на заказ!',
              body: '«' + job.title + '» — работодатель принял ваш отклик',
              url: '/my-orders',
              tag: 'accepted-' + job_id,
            });
          } catch (e) { console.error('push send skip:', e.message); }
        }
      }

      return res.json({ ok: true });
    }

    res.status(405).json({ error: 'Метод не поддерживается' });
  } catch (err) {
    console.error('db-responses error:', err);
    res.status(500).json({ error: 'Ошибка сервера: ' + err.message });
  }
};
