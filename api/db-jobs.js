// api/db-jobs.js — API для заказов
const { pool } = require('../db');

module.exports = async function handler(req, res) {
  const method = req.method;
  const action = req.query.action;

  try {
    // GET /api/db-jobs — список заказов
    if (method === 'GET' && !action) {
      const { cat, status, limit = 50, offset = 0 } = req.query;
      let sql = `
        SELECT j.*, u.name as employer_name, u.rating as employer_rating,
               COUNT(r.id) as responses_count
        FROM jobs j
        LEFT JOIN users u ON j.employer_id = u.id
        LEFT JOIN responses r ON r.job_id = j.id
        WHERE 1=1
      `;
      const params = [];
      if (cat && cat !== 'all') {
        params.push(cat);
        sql += ` AND j.category = $${params.length}`;
      }
      if (status) {
        params.push(status);
        sql += ` AND j.status = $${params.length}`;
      } else {
        sql += ` AND j.status IN ('new', 'has_responses')`;
      }
      sql += ` GROUP BY j.id, u.name, u.rating ORDER BY j.created_at DESC LIMIT $${params.length+1} OFFSET $${params.length+2}`;
      params.push(limit, offset);

      const result = await pool.query(sql, params);
      return res.json({ ok: true, jobs: result.rows });
    }

    // GET /api/db-jobs?action=get&id=1 — один заказ
    if (method === 'GET' && action === 'get') {
      const { id } = req.query;
      const result = await pool.query(
        `SELECT j.*, u.name as employer_name, u.rating as employer_rating
         FROM jobs j LEFT JOIN users u ON j.employer_id = u.id
         WHERE j.id = $1`, [id]
      );
      if (!result.rows.length) return res.status(404).json({ error: 'Заказ не найден' });
      return res.json({ ok: true, job: result.rows[0] });
    }

    // POST /api/db-jobs — создать заказ
    if (method === 'POST' && !action) {
      const { employer_id, title, description, category, emoji, pay, pay_label,
              people, location, address, lat, lng, date, urgent, allow_bargain } = req.body;

      if (!title || !pay || !employer_id) {
        return res.status(400).json({ error: 'Заполните обязательные поля' });
      }

      const result = await pool.query(
        `INSERT INTO jobs (employer_id, title, description, category, emoji, pay, pay_label,
                          people, location, address, lat, lng, date, urgent, allow_bargain)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
         RETURNING *`,
        [employer_id, title, description, category || 'other', emoji || '📦',
         pay, pay_label || 'за день', people || 1, location, address,
         lat, lng, date, urgent || false, allow_bargain || false]
      );

      return res.json({ ok: true, job: result.rows[0] });
    }

    // PATCH /api/db-jobs?action=status — обновить статус
    if (method === 'PATCH' && action === 'status') {
      const { id, status, worker_id } = req.body;
      await pool.query(
        `UPDATE jobs SET status=$1, selected_worker_id=$2, updated_at=NOW() WHERE id=$3`,
        [status, worker_id || null, id]
      );
      return res.json({ ok: true });
    }

    // DELETE /api/db-jobs?id=1 — удалить заказ
    if (method === 'DELETE') {
      const { id } = req.query;
      await pool.query('DELETE FROM jobs WHERE id=$1', [id]);
      return res.json({ ok: true });
    }

    res.status(405).json({ error: 'Метод не поддерживается' });
  } catch (err) {
    console.error('db-jobs error:', err);
    res.status(500).json({ error: 'Ошибка сервера: ' + err.message });
  }
};
