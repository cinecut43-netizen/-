// /api/get-doc.js
//
// Serverless-функция Vercel. Возвращает фото документа по docId.
// ДОСТУП ТОЛЬКО ДЛЯ АДМИНИСТРАТОРОВ — проверяем токен через admin-verify.
//
// Запрос: POST { docId, adminToken, adminRole }
// Ответ: { photo: 'data:image/...base64...' }

const crypto = require('crypto');
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
  } catch(e) { return false; }
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Метод не поддерживается' });
  }

  const { docId, adminToken, adminRole } = req.body || {};
  const tokenSecret = process.env.ADMIN_TOKEN_SECRET;

  // Проверяем что запрашивает администратор с действующим токеном
  if (!tokenSecret || !verifyAdminToken(adminToken, adminRole, tokenSecret)) {
    return res.status(403).json({ error: 'Доступ запрещён' });
  }

  // Только super_admin и moderator могут просматривать документы
  if (!['super_admin', 'moderator'].includes(adminRole)) {
    return res.status(403).json({ error: 'Недостаточно прав для просмотра документов' });
  }

  if (!docId) {
    return res.status(400).json({ error: 'docId не указан' });
  }

  const doc = docs[docId];
  if (!doc) {
    return res.status(404).json({ error: 'Документ не найден или истёк срок хранения' });
  }

  if (Date.now() > doc.expiresAt) {
    delete docs[docId];
    return res.status(404).json({ error: 'Срок хранения документа истёк' });
  }

  // Логируем доступ (в production — в отдельную таблицу аудита)
  console.log('[AUDIT] Doc accessed:', docId, 'by role:', adminRole, 'at:', new Date().toISOString());

  return res.status(200).json({
    ok: true,
    photo: doc.photo,
    type: doc.type,
    uploadedAt: doc.uploadedAt,
    status: doc.status,
  });
};
