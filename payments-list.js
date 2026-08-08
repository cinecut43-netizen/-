// /api/payments-list.js — история реальных платежей пользователя
const { pool } = require('../db');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  try {
    if (!req.authUserId) return res.status(401).json({ error: 'Не авторизован' });
    const result = await pool.query(
      `SELECT id, amount, status, description, created_at, confirmed_at
       FROM payments WHERE user_id=$1 ORDER BY created_at DESC LIMIT 50`,
      [req.authUserId]
    );
    return res.json({ ok: true, payments: result.rows });
  } catch (err) {
    console.error('payments-list error:', err);
    res.status(500).json({ error: err.message });
  }
};
