// /api/db-complaints.js — подать жалобу на пользователя (публичный).
// Рассмотрение жалоб — через /api/admin-complaints (только админ).
const { pool } = require('../db');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Метод не поддерживается' });

  try {
    const { reporter_id, target_id, job_id, reason } = req.body || {};
    if (!reporter_id || !target_id || !reason || !reason.trim()) {
      return res.status(400).json({ error: 'Укажите, на кого жалуетесь, и причину' });
    }
    if (Number(reporter_id) === Number(target_id)) {
      return res.status(400).json({ error: 'Нельзя пожаловаться на самого себя' });
    }

    const result = await pool.query(
      `INSERT INTO complaints (reporter_id, target_id, job_id, reason) VALUES ($1,$2,$3,$4) RETURNING *`,
      [reporter_id, target_id, job_id || null, reason.trim()]
    );
    return res.json({ ok: true, complaint: result.rows[0] });
  } catch (err) {
    console.error('db-complaints error:', err);
    res.status(500).json({ error: 'Ошибка сервера: ' + err.message });
  }
};
