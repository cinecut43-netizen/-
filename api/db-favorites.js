// api/db-favorites.js — API для избранного
const { pool } = require('../db');

module.exports = async function handler(req, res) {
  const method = req.method;

  try {
    if (method === 'GET') {
      const { user_id } = req.query;
      if (!user_id) return res.status(400).json({ error: 'Укажите user_id' });

      const result = await pool.query(
        `SELECT f.*, j.title, j.pay, j.pay_label, j.emoji, j.location, j.date, j.status
         FROM favorites f JOIN jobs j ON f.job_id = j.id
         WHERE f.user_id = $1 ORDER BY f.created_at DESC`,
        [user_id]
      );
      return res.json({ ok: true, favorites: result.rows });
    }

    if (method === 'POST') {
      const { user_id, job_id } = req.body;
      if (!user_id || !job_id) return res.status(400).json({ error: 'Укажите user_id и job_id' });

      const existing = await pool.query(
        'SELECT id FROM favorites WHERE user_id=$1 AND job_id=$2', [user_id, job_id]
      );

      if (existing.rows.length) {
        await pool.query('DELETE FROM favorites WHERE user_id=$1 AND job_id=$2', [user_id, job_id]);
        return res.json({ ok: true, added: false });
      } else {
        await pool.query('INSERT INTO favorites (user_id, job_id) VALUES ($1,$2)', [user_id, job_id]);
        return res.json({ ok: true, added: true });
      }
    }

    res.status(405).json({ error: 'Метод не поддерживается' });
  } catch (err) {
    console.error('db-favorites error:', err);
    res.status(500).json({ error: err.message });
  }
};
