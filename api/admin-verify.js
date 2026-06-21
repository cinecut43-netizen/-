const crypto = require('crypto');

const TOKEN_LIFETIME_MS = 24 * 60 * 60 * 1000;

function verifyToken(token, secret) {
  if (!token || typeof token !== 'string' || !token.includes('.')) return null;
  const dotIdx = token.lastIndexOf('.');
  const encodedPayload = token.substring(0, dotIdx);
  const signature = token.substring(dotIdx + 1);
  if (!encodedPayload || !signature) return null;

  let payload;
  try {
    payload = Buffer.from(encodedPayload, 'base64').toString('utf-8');
  } catch (e) {
    return null;
  }

  const expectedSig = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  const sigBuf = Buffer.from(signature, 'hex');
  const expectedBuf = Buffer.from(expectedSig, 'hex');
  if (sigBuf.length !== expectedBuf.length) return null;
  if (!crypto.timingSafeEqual(sigBuf, expectedBuf)) return null;

  const parts = payload.split(':');
  if (parts.length < 2) return null;
  const role = parts[0];
  const timestamp = parts[1];

  const age = Date.now() - Number(timestamp);
  if (age < 0 || age >= TOKEN_LIFETIME_MS) return null;

  return { role };
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Метод не поддерживается' });
  }

  const { token, role } = req.body || {};
  const tokenSecret = process.env.ADMIN_TOKEN_SECRET;

  if (!tokenSecret) {
    return res.status(500).json({ valid: false, error: 'ADMIN_TOKEN_SECRET не настроен' });
  }

  const result = verifyToken(token, tokenSecret);

  if (!result || result.role !== role) {
    return res.status(200).json({ valid: false });
  }

  return res.status(200).json({ valid: true });
};
