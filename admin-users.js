// /api/admin-users.js — управление реальными пользователями для админки
// Заменяет фейковый DEMO_USERS в admin-data.js на настоящую БД.

const crypto = require('crypto');
const { pool } = require('../db');

const TOKEN_LIFETIME_MS = 24 * 60 * 60 * 1000;

function verifyAdminToken(token, role, secret) {
  if (!token || !role || !secret) return false;
  try {
    const dotIdx = token.lastIndexOf('.');
    if (dotIdx === -1) return false;
    const encodedPayload = token.substring(0, dotIdx);
    const signature = token.substring(dotIdx + 1);
    const payload = Buffer.from(encodedPayload, 'base64').toString('utf-8');
    const expectedSig = crypto.createHmac('sha256', secret).update(payload).digest('hex');
    const sigBuf = Buffer.from(signature, 'hex');
    const expectedBuf = Buffer.from(expectedSig, 'hex');
    if (sigBuf.length !== expectedBuf.length) return false;
    if (!crypto.timingSafeEqual(sigBuf, expectedBuf)) return false;
    const parts = payload.split(':');
    if (parts[0] !== role) return false;
    const age = Date.now() - Number(parts[1]);
    return age >= 0 && age < TOKEN_LIFETIME_MS;
  } catch (e) { return false; }
}

module.exports = async function handler(req, res) {
  const tokenSecret = process.env.ADMIN_TOKEN_SECRET;
  const adminToken = req.method === 'GET' ? req.query.adminToken : req.body.adminToken;
  const adminRole = req.method === 'GET' ? req.query.adminRole : req.body.adminRole;

  if (!tokenSecret || !verifyAdminToken(adminToken, adminRole, tokenSecret)) {
    return res.status(403).json({ error: 'Доступ запрещён' });
  }

  try {
    // GET — список пользователей (не удалённых по умолчанию)
    if (req.method === 'GET' && !req.query.id) {
      const { role, status, q, limit = 200 } = req.query;
      let sql = `SELECT id, phone, name, role, company, city, rating, reviews_count,
                        jobs_done, verified, status, created_at
                 FROM users WHERE 1=1`;
      const params = [];
      if (role) { params.push(role); sql += ` AND role = $${params.length}`; }
      if (status) { params.push(status); sql += ` AND status = $${params.length}`; }
      else { sql += ` AND status != 'deleted'`; }
      if (q) { params.push('%' + q + '%'); sql += ` AND (name ILIKE $${params.length} OR phone ILIKE $${params.length} OR company ILIKE $${params.length})`; }
      params.push(limit);
      sql += ` ORDER BY created_at DESC LIMIT $${params.length}`;

      const result = await pool.query(sql, params);
      return res.json({ ok: true, users: result.rows });
    }

    // GET ?id= — один пользователь
    if (req.method === 'GET' && req.query.id) {
      const result = await pool.query('SELECT * FROM users WHERE id = $1', [req.query.id]);
      if (!result.rows.length) return res.status(404).json({ error: 'Пользователь не найден' });
      return res.json({ ok: true, user: result.rows[0] });
    }

    // PATCH — изменить статус/роль
    if (req.method === 'PATCH') {
      const { id, status, role } = req.body;
      if (!id) return res.status(400).json({ error: 'Укажите id' });
      if (status) await pool.query('UPDATE users SET status = $1 WHERE id = $2', [status, id]);
      if (role) await pool.query('UPDATE users SET role = $1 WHERE id = $2', [role, id]);
      return res.json({ ok: true });
    }

    res.status(405).json({ error: 'Метод не поддерживается' });
  } catch (err) {
    console.error('admin-users error:', err);
    res.status(500).json({ error: 'Ошибка сервера: ' + err.message });
  }
};
