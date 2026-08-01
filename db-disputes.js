// /api/db-disputes.js — открытие спора по заказу (публичный, для реальных
// пользователей). Решения по спорам — через /api/admin-disputes (только админ).
const { pool } = require('../db');

module.exports = async function handler(req, res) {
  try {
    if (req.method === 'POST') {
      const { job_id, opened_by, reason_id, reason_label, comment, amount } = req.body || {};
      if (!job_id || !reason_id || !comment) {
        return res.status(400).json({ error: 'Укажите заказ, причину и комментарий' });
      }
      const existing = await pool.query(`SELECT id FROM disputes WHERE job_id=$1 AND status='open'`, [job_id]);
      if (existing.rows.length) return res.json({ ok: false, error: 'По этому заказу уже открыт спор' });

      const result = await pool.query(
        `INSERT INTO disputes (job_id, opened_by, reason_id, reason_label, comment, amount)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
        [job_id, opened_by || null, reason_id, reason_label || '', comment, amount || 0]
      );
      await pool.query(`UPDATE jobs SET status='disputed', updated_at=NOW() WHERE id=$1`, [job_id]);

      return res.json({ ok: true, dispute: result.rows[0] });
    }

    // GET ?job_id= — есть ли открытый спор по заказу (для отображения на сайте)
    if (req.method === 'GET' && req.query.job_id) {
      const result = await pool.query(`SELECT * FROM disputes WHERE job_id=$1 ORDER BY created_at DESC LIMIT 1`, [req.query.job_id]);
      return res.json({ ok: true, dispute: result.rows[0] || null });
    }

    res.status(405).json({ error: 'Метод не поддерживается' });
  } catch (err) {
    console.error('db-disputes error:', err);
    res.status(500).json({ error: 'Ошибка сервера: ' + err.message });
  }
};
