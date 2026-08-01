// /api/admin-orders.js — управление реальными заказами для админки
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
    // GET — все заказы, любого статуса и работодателя (в отличие от
    // публичного /api/db-jobs, который по умолчанию показывает только
    // открытые заказы конкретного пользователя).
    if (req.method === 'GET' && !req.query.id) {
      const { status, q, limit = 200 } = req.query;
      let sql = `
        SELECT j.*, u.name as employer_name, COUNT(r.id) as responses_count
        FROM jobs j
        LEFT JOIN users u ON j.employer_id = u.id
        LEFT JOIN responses r ON r.job_id = j.id
        WHERE 1=1
      `;
      const params = [];
      if (status && status !== 'all') { params.push(status); sql += ` AND j.status = $${params.length}`; }
      if (q) { params.push('%' + q + '%'); sql += ` AND (j.title ILIKE $${params.length} OR u.name ILIKE $${params.length})`; }
      params.push(limit);
      sql += ` GROUP BY j.id, u.name ORDER BY j.created_at DESC LIMIT $${params.length}`;

      const result = await pool.query(sql, params);
      return res.json({ ok: true, jobs: result.rows });
    }

    if (req.method === 'GET' && req.query.id) {
      const result = await pool.query(
        `SELECT j.*, u.name as employer_name FROM jobs j LEFT JOIN users u ON j.employer_id = u.id WHERE j.id = $1`,
        [req.query.id]
      );
      if (!result.rows.length) return res.status(404).json({ error: 'Заказ не найден' });
      return res.json({ ok: true, job: result.rows[0] });
    }

    // PATCH — редактирование полей и/или статуса
    if (req.method === 'PATCH') {
      const { id, title, pay, description, status } = req.body;
      if (!id) return res.status(400).json({ error: 'Укажите id' });
      const fields = [];
      const params = [];
      if (title !== undefined) { params.push(title); fields.push(`title = $${params.length}`); }
      if (pay !== undefined) { params.push(pay); fields.push(`pay = $${params.length}`); }
      if (description !== undefined) { params.push(description); fields.push(`description = $${params.length}`); }
      if (status !== undefined) { params.push(status); fields.push(`status = $${params.length}`); }
      if (!fields.length) return res.status(400).json({ error: 'Нечего обновлять' });
      params.push(id);
      await pool.query(`UPDATE jobs SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${params.length}`, params);
      return res.json({ ok: true });
    }

    // DELETE — настоящее удаление (в отличие от старой версии, которая
    // под видом "удалить" просто ставила статус "отменён")
    if (req.method === 'DELETE') {
      const { id } = req.query;
      if (!id) return res.status(400).json({ error: 'Укажите id' });
      await pool.query('DELETE FROM jobs WHERE id = $1', [id]);
      return res.json({ ok: true });
    }

    res.status(405).json({ error: 'Метод не поддерживается' });
  } catch (err) {
    console.error('admin-orders error:', err);
    res.status(500).json({ error: 'Ошибка сервера: ' + err.message });
  }
};
