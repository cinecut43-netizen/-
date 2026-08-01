// api/db-favorites.js — API для избранного (заказы и исполнители)
const { pool } = require('../db');

module.exports = async function handler(req, res) {
  const method = req.method;

  try {
    if (method === 'GET') {
      const { user_id, type } = req.query;
      if (!user_id) return res.status(400).json({ error: 'Укажите user_id' });

      if (type === 'workers') {
        const result = await pool.query(
          `SELECT f.*, u.name, u.city, u.rating, u.reviews_count, u.jobs_done, u.verified, u.bio, u.skills, u.day_rate
           FROM favorites f JOIN users u ON f.worker_id = u.id
           WHERE f.user_id = $1 AND f.worker_id IS NOT NULL ORDER BY f.created_at DESC`,
          [user_id]
        );
        return res.json({ ok: true, workers: result.rows });
      }

      const result = await pool.query(
        `SELECT f.*, j.title, j.pay, j.pay_label, j.emoji, j.location, j.date, j.status
         FROM favorites f JOIN jobs j ON f.job_id = j.id
         WHERE f.user_id = $1 AND f.job_id IS NOT NULL ORDER BY f.created_at DESC`,
        [user_id]
      );
      return res.json({ ok: true, favorites: result.rows });
    }

    if (method === 'POST') {
      const { user_id, job_id, worker_id } = req.body;
      if (!user_id || (!job_id && !worker_id)) {
        return res.status(400).json({ error: 'Укажите user_id и job_id или worker_id' });
      }

      const col = job_id ? 'job_id' : 'worker_id';
      const val = job_id || worker_id;

      const existing = await pool.query(
        `SELECT id FROM favorites WHERE user_id=$1 AND ${col}=$2`, [user_id, val]
      );

      if (existing.rows.length) {
        await pool.query(`DELETE FROM favorites WHERE user_id=$1 AND ${col}=$2`, [user_id, val]);
        return res.json({ ok: true, added: false });
      } else {
        await pool.query(`INSERT INTO favorites (user_id, ${col}) VALUES ($1,$2)`, [user_id, val]);
        return res.json({ ok: true, added: true });
      }
    }

    res.status(405).json({ error: 'Метод не поддерживается' });
  } catch (err) {
    console.error('db-favorites error:', err);
    res.status(500).json({ error: err.message });
  }
};
