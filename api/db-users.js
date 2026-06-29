// api/db-users.js — API для пользователей
const { pool } = require('../db');

module.exports = async function handler(req, res) {
  const method = req.method;
  const action = req.query.action;

  try {
    // POST /api/db-users?action=register — регистрация
    if (method === 'POST' && action === 'register') {
      const { phone, name, role, company } = req.body;
      if (!phone || !name) return res.status(400).json({ error: 'Укажите телефон и имя' });

      // Проверяем существует ли пользователь
      const existing = await pool.query('SELECT id FROM users WHERE phone=$1', [phone]);
      if (existing.rows.length) {
        // Обновляем данные
        const result = await pool.query(
          `UPDATE users SET name=$1, role=$2, company=$3 WHERE phone=$4 RETURNING *`,
          [name, role || 'worker', company || null, phone]
        );
        return res.json({ ok: true, user: result.rows[0], isNew: false });
      }

      // Создаём нового
      const result = await pool.query(
        `INSERT INTO users (phone, name, role, company) VALUES ($1,$2,$3,$4) RETURNING *`,
        [phone, name, role || 'worker', company || null]
      );
      return res.json({ ok: true, user: result.rows[0], isNew: true });
    }

    // GET /api/db-users?phone=+79001234567 — найти по телефону
    if (method === 'GET' && req.query.phone) {
      const result = await pool.query('SELECT * FROM users WHERE phone=$1', [req.query.phone]);
      if (!result.rows.length) return res.status(404).json({ error: 'Пользователь не найден' });
      return res.json({ ok: true, user: result.rows[0] });
    }

    // GET /api/db-users?id=1 — найти по id
    if (method === 'GET' && req.query.id) {
      const result = await pool.query('SELECT * FROM users WHERE id=$1', [req.query.id]);
      if (!result.rows.length) return res.status(404).json({ error: 'Пользователь не найден' });
      return res.json({ ok: true, user: result.rows[0] });
    }

    // GET /api/db-users — список исполнителей
    if (method === 'GET') {
      const { role = 'worker', limit = 50 } = req.query;
      const result = await pool.query(
        `SELECT * FROM users WHERE role=$1 ORDER BY rating DESC, jobs_done DESC LIMIT $2`,
        [role, limit]
      );
      return res.json({ ok: true, users: result.rows });
    }

    // PATCH /api/db-users?action=update — обновить профиль
    if (method === 'PATCH') {
      const { id, name, company, avatar_url } = req.body;
      await pool.query(
        `UPDATE users SET name=$1, company=$2, avatar_url=$3 WHERE id=$4`,
        [name, company, avatar_url, id]
      );
      return res.json({ ok: true });
    }

    res.status(405).json({ error: 'Метод не поддерживается' });
  } catch (err) {
    console.error('db-users error:', err);
    res.status(500).json({ error: 'Ошибка сервера: ' + err.message });
  }
};
