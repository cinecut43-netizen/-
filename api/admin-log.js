// /api/admin-log.js — журнал действий администраторов, общий для всех,
// хранится в базе данных (раньше был только в localStorage браузера
// того, кто именно сейчас залогинен — у каждого свой, ни с кем не общий,
// пропадал при чистке браузера).
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
    if (req.method === 'GET') {
      const type = req.query.type; // 'login' — только входы, иначе всё
      let sql = 'SELECT role, description, meta, device_info, created_at FROM admin_actions';
      const params = [];
      if (type === 'login') {
        sql += " WHERE description = 'Вход в систему'";
      }
      sql += ' ORDER BY created_at DESC LIMIT 200';
      const result = await pool.query(sql, params);
      return res.json({ ok: true, items: result.rows });
    }

    if (req.method === 'POST') {
      const { description, meta, deviceInfo } = req.body;
      if (!description) return res.status(400).json({ error: 'Укажите description' });
      const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
      await pool.query(
        `INSERT INTO admin_actions (role, description, meta, device_info, ip) VALUES ($1,$2,$3,$4,$5)`,
        [adminRole, description, meta ? JSON.stringify(meta) : null, deviceInfo || null, ip || null]
      );
      return res.json({ ok: true });
    }

    res.status(405).json({ error: 'Метод не поддерживается' });
  } catch (err) {
    console.error('admin-log error:', err);
    res.status(500).json({ error: 'Ошибка сервера: ' + err.message });
  }
};
