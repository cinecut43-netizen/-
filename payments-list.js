// /api/payments-list.js — история реальных платежей пользователя
const { pool } = require('../db');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  try {
    const { user_id } = req.query;
    if (!user_id) return res.status(400).json({ error: 'Укажите user_id' });
    const result = await pool.query(
      `SELECT id, amount, status, description, created_at, confirmed_at
       FROM payments WHERE user_id=$1 ORDER BY created_at DESC LIMIT 50`,
      [user_id]
    );
    return res.json({ ok: true, payments: result.rows });
  } catch (err) {
    console.error('payments-list error:', err);
    res.status(500).json({ error: err.message });
  }
};
