// /api/admin-complaints.js — админский просмотр и решение по спорам и жалобам
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
      const kind = req.query.kind; // 'disputes' | 'complaints'

      if (kind === 'disputes') {
        const result = await pool.query(`
          SELECT d.*, j.title as job_title, u.name as opened_by_name
          FROM disputes d
          LEFT JOIN jobs j ON d.job_id = j.id
          LEFT JOIN users u ON d.opened_by = u.id
          ORDER BY d.created_at DESC LIMIT 100
        `);
        return res.json({ ok: true, disputes: result.rows });
      }

      if (kind === 'complaints') {
        const result = await pool.query(`
          SELECT c.*, ru.name as reporter_name, tu.name as target_name, j.title as job_title
          FROM complaints c
          LEFT JOIN users ru ON c.reporter_id = ru.id
          LEFT JOIN users tu ON c.target_id = tu.id
          LEFT JOIN jobs j ON c.job_id = j.id
          ORDER BY c.created_at DESC LIMIT 100
        `);
        return res.json({ ok: true, complaints: result.rows });
      }

      return res.status(400).json({ error: 'Укажите kind=disputes или kind=complaints' });
    }

    if (req.method === 'PATCH') {
      const { kind, id, decision } = req.body; // decision: refunded|rejected (disputes) или resolved (complaints)

      if (kind === 'dispute') {
        const disputeRes = await pool.query('SELECT * FROM disputes WHERE id=$1', [id]);
        const dispute = disputeRes.rows[0];
        if (!dispute) return res.status(404).json({ error: 'Спор не найден' });

        await pool.query('UPDATE disputes SET status=$1, resolved_at=NOW() WHERE id=$2', [decision, id]);
        // refunded — заказ отменяется (деньги возвращаются заказчику);
        // rejected — заказ считается выполненным, деньги идут исполнителю
        await pool.query(
          `UPDATE jobs SET status=$1, updated_at=NOW() WHERE id=$2`,
          [decision === 'refunded' ? 'cancelled' : 'done', dispute.job_id]
        );
        return res.json({ ok: true });
      }

      if (kind === 'complaint') {
        await pool.query('UPDATE complaints SET status=$1 WHERE id=$2', [decision || 'resolved', id]);
        return res.json({ ok: true });
      }

      return res.status(400).json({ error: 'Укажите kind=dispute или kind=complaint' });
    }

    res.status(405).json({ error: 'Метод не поддерживается' });
  } catch (err) {
    console.error('admin-complaints error:', err);
    res.status(500).json({ error: 'Ошибка сервера: ' + err.message });
  }
};
