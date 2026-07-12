// api/verify-code.js — проверка Flash Call кода
module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { phone, code } = req.body || {};
  if (!phone || !code) return res.status(400).json({ error: 'Укажите телефон и код' });

  const cleanPhone = phone.replace(/\D/g, '');

  // Проверяем сохранённый pincode
  if (global.zvonokCodes && global.zvonokCodes[cleanPhone]) {
    const entry = global.zvonokCodes[cleanPhone];
    if (entry.expires > Date.now() && entry.pincode === String(code)) {
      delete global.zvonokCodes[cleanPhone];
      return res.json({ ok: true });
    }
  }

  return res.status(400).json({ error: 'Неверный код или код устарел' });
};
