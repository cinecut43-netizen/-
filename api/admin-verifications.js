// /api/admin-verifications.js
//
// Очередь заявок на верификацию паспорта — для админки.
// Раньше это работало через localStorage прямо в браузере админа, из-за чего
// админ технически видел только СВОЮ собственную (случайно совпавшую) заявку,
// а не очередь реальных пользователей. Здесь — честный список по всем
// документам, загруженным через /api/upload-doc, с привязкой к user_id в БД.
//
// GET  — список заявок (по умолчанию только pending)
// PATCH — одобрить/отклонить заявку конкретного пользователя

const crypto = require('crypto');
const { pool } = require('../db');

const TOKEN_LIFETIME_MS = 24 * 60 * 60 * 1000;
const docs = global.__shabashkaDocs || (global.__shabashkaDocs = {});

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
  if (!['super_admin', 'moderator'].includes(adminRole)) {
    return res.status(403).json({ error: 'Недостаточно прав' });
  }

  try {
    if (req.method === 'GET') {
      const statusFilter = req.query.status || 'pending';
      const ids = Object.keys(docs).filter(function (id) {
        return docs[id].type === 'passport' && (statusFilter === 'all' || docs[id].status === statusFilter);
      });

      const userIds = ids.map(function (id) { return docs[id].userId; }).filter(Boolean);
      let usersById = {};
      if (userIds.length) {
        const result = await pool.query('SELECT id, name, phone FROM users WHERE id = ANY($1)', [userIds]);
        result.rows.forEach(function (u) { usersById[u.id] = u; });
      }

      const items = ids.map(function (id) {
        const d = docs[id];
        const u = usersById[d.userId];
        return {
          docId: id,
          userId: d.userId || null,
          userName: u ? u.name : 'Пользователь не найден',
          userPhone: u ? u.phone : '',
          status: d.status,
          uploadedAt: d.uploadedAt,
          rejectReason: d.rejectReason || null,
        };
      }).sort(function (a, b) { return b.uploadedAt - a.uploadedAt; });

      return res.json({ ok: true, items: items });
    }

    if (req.method === 'PATCH') {
      const { docId, decision, reason } = req.body;
      const doc = docs[docId];
      if (!doc) return res.status(404).json({ error: 'Заявка не найдена или истёк срок хранения' });
      if (!doc.userId) return res.status(400).json({ error: 'Заявка не привязана к пользователю' });

      if (decision === 'approved') {
        doc.status = 'approved';
        await pool.query('UPDATE users SET verified = true WHERE id = $1', [doc.userId]);
      } else if (decision === 'rejected') {
        doc.status = 'rejected';
        doc.rejectReason = reason || 'Документ нечёткий или неподходящий';
      } else {
        return res.status(400).json({ error: 'decision должен быть approved или rejected' });
      }

      return res.json({ ok: true });
    }

    res.status(405).json({ error: 'Метод не поддерживается' });
  } catch (err) {
    console.error('admin-verifications error:', err);
    res.status(500).json({ error: 'Ошибка сервера: ' + err.message });
  }
};
