// /api/payments-status.js — проверить статус платежа (для страницы
// возврата после оплаты). Заодно служит запасным способом зачисления
// баланса, если вебхук ещё не настроен в личном кабинете ЮKassa —
// логика идемпотентна, повторное зачисление исключено.
const { pool } = require('../db');
const yookassa = require('../db/yookassa');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  try {
    const { paymentId } = req.query;
    if (!paymentId) return res.status(400).json({ error: 'Укажите paymentId' });

    const dbRow = await pool.query('SELECT * FROM payments WHERE yookassa_payment_id=$1', [paymentId]);
    if (!dbRow.rows.length) return res.status(404).json({ error: 'Платёж не найден' });
    const record = dbRow.rows[0];

    if (record.status === 'succeeded') {
      return res.json({ ok: true, status: 'succeeded' });
    }

    const payment = await yookassa.getPayment(paymentId);

    if (payment.status === 'succeeded' && record.status !== 'succeeded') {
      await pool.query('UPDATE payments SET status=$1, confirmed_at=NOW() WHERE yookassa_payment_id=$2', ['succeeded', paymentId]);
      await pool.query('UPDATE users SET balance = balance + $1 WHERE id=$2', [record.amount, record.user_id]);
    } else if (payment.status === 'canceled') {
      await pool.query('UPDATE payments SET status=$1 WHERE yookassa_payment_id=$2', ['canceled', paymentId]);
    }

    return res.json({ ok: true, status: payment.status });
  } catch (err) {
    console.error('payments-status error:', err);
    res.status(500).json({ error: err.message || 'Ошибка сервера' });
  }
};
