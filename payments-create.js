// /api/payments-create.js — создать платёж на пополнение баланса через ЮKassa
const { pool } = require('../db');
const yookassa = require('../db/yookassa');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Метод не поддерживается' });

  if (!yookassa.isConfigured()) {
    return res.status(503).json({
      error: 'Приём платежей пока не настроен на сервере (нет ключей ЮKassa). Обратитесь к администратору сайта.',
    });
  }

  try {
    const { user_id, amount } = req.body || {};
    const amountNum = Math.round(Number(amount));
    if (!user_id) return res.status(400).json({ error: 'Не удалось определить пользователя' });
    if (!amountNum || amountNum < 10) return res.status(400).json({ error: 'Минимальная сумма пополнения — 10 ₽' });
    if (amountNum > 500000) return res.status(400).json({ error: 'Слишком большая сумма за один раз' });

    const userRes = await pool.query('SELECT id, name FROM users WHERE id=$1', [user_id]);
    if (!userRes.rows.length) return res.status(404).json({ error: 'Пользователь не найден' });

    const origin = (req.headers.origin) || ('https://' + req.headers.host);
    const returnPath = req.body.returnPath || '/wallet';
    const returnUrl = origin + returnPath + (returnPath.indexOf('?') === -1 ? '?' : '&') + 'payment=return';

    const payment = await yookassa.createPayment(
      amountNum,
      'Пополнение баланса Шабашка — ' + userRes.rows[0].name,
      returnUrl,
      { user_id: String(user_id) }
    );

    await pool.query(
      `INSERT INTO payments (user_id, yookassa_payment_id, amount, status, description)
       VALUES ($1,$2,$3,$4,$5)`,
      [user_id, payment.id, amountNum, payment.status, 'Пополнение баланса']
    );

    return res.json({ ok: true, confirmationUrl: payment.confirmation.confirmation_url, paymentId: payment.id });
  } catch (err) {
    console.error('payments-create error:', err);
    res.status(500).json({ error: err.message || 'Ошибка сервера' });
  }
};
