// api/db-users.js — API для пользователей
const { pool } = require('../db');

module.exports = async function handler(req, res) {
  const method = req.method;
  const action = req.query.action;

  try {
    // POST /api/db-users?action=register — регистрация
    if (method === 'POST' && action === 'register') {
      const { phone, name, role, company, consentText } = req.body;
      if (!phone || !name) return res.status(400).json({ error: 'Укажите телефон и имя' });

      // Проверяем существует ли пользователь
      const existing = await pool.query('SELECT id FROM users WHERE phone=$1', [phone]);
      if (existing.rows.length) {
        // Обновляем данные (согласие уже зафиксировано при первой регистрации — не трогаем)
        const result = await pool.query(
          `UPDATE users SET name=$1, role=$2, company=$3 WHERE phone=$4 RETURNING *`,
          [name, role || 'worker', company || null, phone]
        );
        return res.json({ ok: true, user: result.rows[0], isNew: false });
      }

      // Создаём нового — фиксируем факт согласия на обработку ПДн (152-ФЗ):
      // дата/время и точный текст, который видел пользователь в момент регистрации.
      const result = await pool.query(
        `INSERT INTO users (phone, name, role, company, consent_at, consent_text)
         VALUES ($1,$2,$3,$4,NOW(),$5) RETURNING *`,
        [phone, name, role || 'worker', company || null,
         consentText || 'Согласен(-на) на обработку персональных данных (152-ФЗ) и с условиями Пользовательского соглашения']
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
        `SELECT * FROM users WHERE role=$1 AND status='active' ORDER BY rating DESC, jobs_done DESC LIMIT $2`,
        [role, limit]
      );
      return res.json({ ok: true, users: result.rows });
    }

    // PATCH /api/db-users?action=update — обновить профиль
    if (method === 'PATCH') {
      const { id, name, company, avatar_url, city, bio, skills, day_rate, role, categories } = req.body;
      await pool.query(
        `UPDATE users SET name=COALESCE($1,name), company=COALESCE($2,company), avatar_url=COALESCE($3,avatar_url),
                city=COALESCE($4,city), bio=COALESCE($5,bio),
                skills=COALESCE($6,skills), day_rate=COALESCE($7,day_rate),
                role=COALESCE($8,role), categories=COALESCE($9,categories)
         WHERE id=$10`,
        [name || null, company || null, avatar_url || null, city || null, bio || null,
         skills || null, day_rate || null, role || null, categories || null, id]
      );
      return res.json({ ok: true });
    }

    res.status(405).json({ error: 'Метод не поддерживается' });
  } catch (err) {
    console.error('db-users error:', err);
    res.status(500).json({ error: 'Ошибка сервера: ' + err.message });
  }
};
