// api/db-responses.js — API для откликов
const { pool } = require('../db');

module.exports = async function handler(req, res) {
  const method = req.method;

  try {
    // POST — создать отклик
    if (method === 'POST') {
      const { job_id, worker_id, worker_name, proposed_pay, message } = req.body;
      if (!job_id) return res.status(400).json({ error: 'Укажите job_id' });

      // Проверяем не откликался ли уже
      if (worker_id) {
        const existing = await pool.query(
          'SELECT id FROM responses WHERE job_id=$1 AND worker_id=$2',
          [job_id, worker_id]
        );
        if (existing.rows.length) {
          return res.json({ ok: false, error: 'Вы уже откликались на этот заказ' });
        }
      }

      const result = await pool.query(
        `INSERT INTO responses (job_id, worker_id, proposed_pay, message)
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [job_id, worker_id || null, proposed_pay || null, message || '']
      );

      // Обновляем статус заказа
      await pool.query(
        `UPDATE jobs SET status='has_responses', updated_at=NOW() WHERE id=$1 AND status='new'`,
        [job_id]
      );

      return res.json({ ok: true, response: result.rows[0] });
    }

    // GET — отклики на заказ
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
                j.location, j.date
         FROM responses r
         JOIN jobs j ON r.job_id = j.id
         WHERE r.worker_id = $1
         ORDER BY r.created_at DESC`,
        [req.query.worker_id]
      );
      return res.json({ ok: true, responses: result.rows });
    }

    // PATCH — принять/отклонить отклик
    if (method === 'PATCH') {
      const { id, status, job_id, worker_id } = req.body;
      await pool.query('UPDATE responses SET status=$1 WHERE id=$2', [status, id]);

      if (status === 'accepted' && job_id && worker_id) {
        await pool.query(
          `UPDATE jobs SET status='selected', selected_worker_id=$1, updated_at=NOW() WHERE id=$2`,
          [worker_id, job_id]
        );
        // Отклоняем остальных
        await pool.query(
          `UPDATE responses SET status='rejected' WHERE job_id=$1 AND id!=$2`,
          [job_id, id]
        );
      }

      return res.json({ ok: true });
    }

    res.status(405).json({ error: 'Метод не поддерживается' });
  } catch (err) {
    console.error('db-responses error:', err);
    res.status(500).json({ error: 'Ошибка сервера: ' + err.message });
  }
};
