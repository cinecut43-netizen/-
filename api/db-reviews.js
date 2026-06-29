// api/db-reviews.js — API для отзывов
const { pool } = require('../db');

module.exports = async function handler(req, res) {
  const method = req.method;

  try {
    if (method === 'POST') {
      const { job_id, reviewer_id, target_id, rating, text, type } = req.body;
      if (!rating || !reviewer_id) return res.status(400).json({ error: 'Укажите рейтинг' });

      const existing = await pool.query(
        'SELECT id FROM reviews WHERE job_id=$1 AND reviewer_id=$2',
        [job_id, reviewer_id]
      );
      if (existing.rows.length) return res.json({ ok: false, error: 'Вы уже оставили отзыв' });

      const result = await pool.query(
        `INSERT INTO reviews (job_id, reviewer_id, target_id, rating, text, type)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
        [job_id || null, reviewer_id, target_id || null, rating, text || '', type || 'worker']
      );

      if (target_id) {
        await pool.query(
          `UPDATE users SET 
            rating = (SELECT ROUND(AVG(rating)::numeric, 2) FROM reviews WHERE target_id=$1),
            reviews_count = (SELECT COUNT(*) FROM reviews WHERE target_id=$1)
           WHERE id=$1`, [target_id]
        );
      }

      return res.json({ ok: true, review: result.rows[0] });
    }

    if (method === 'GET') {
      const { target_id, job_id } = req.query;
      let sql = `SELECT r.*, u.name as reviewer_name FROM reviews r 
                 LEFT JOIN users u ON r.reviewer_id = u.id WHERE 1=1`;
      const params = [];
      if (target_id) { params.push(target_id); sql += ` AND r.target_id=$${params.length}`; }
      if (job_id)    { params.push(job_id);    sql += ` AND r.job_id=$${params.length}`; }
      sql += ' ORDER BY r.created_at DESC LIMIT 50';
      const result = await pool.query(sql, params);
      return res.json({ ok: true, reviews: result.rows });
    }

    res.status(405).json({ error: 'Метод не поддерживается' });
  } catch (err) {
    console.error('db-reviews error:', err);
    res.status(500).json({ error: err.message });
  }
};
