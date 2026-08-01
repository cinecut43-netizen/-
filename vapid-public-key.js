// /api/vapid-public-key.js — отдаёт публичный VAPID-ключ фронтенду
// (приватный ключ никогда не покидает сервер)
module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  const key = process.env.VAPID_PUBLIC_KEY || '';
  return res.status(200).json({ publicKey: key, configured: !!key });
};
