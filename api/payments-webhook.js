// /api/payments-webhook.js — сюда ЮKassa шлёт уведомления об изменении
// статуса платежа. НЕ доверяем телу запроса напрямую (его в теории можно
// подделать) — перепроверяем реальный статус платежа через их же API.
//
// Настройка на стороне ЮKassa: my.yookassa.ru → Настройки → HTTP-уведомления
// → указать URL: https://ваш-домен/api/payments-webhook
const { pool } = require('../db');
const yookassa = require('../db/yookassa');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  try {
    const paymentId = req.body && req.body.object && req.body.object.id;
    if (!paymentId) return res.status(400).json({ error: 'Нет id платежа в уведомлении' });

    // Перепроверяем статус напрямую у ЮKassa — тело вебхука само по себе
    // не является надёжным источником истины.
    const payment = await yookassa.getPayment(paymentId);

    const dbRow = await pool.query('SELECT * FROM payments WHERE yookassa_payment_id=$1', [paymentId]);
    if (!dbRow.rows.length) {
      console.error('payments-webhook: неизвестный платёж', paymentId);
      return res.status(200).json({ ok: true }); // отвечаем 200 всё равно, чтобы ЮKassa не долбила повторно
    }
    const record = dbRow.rows[0];

    if (record.status === 'succeeded') {
      // Уже обработан раньше (ЮKassa может слать уведомление повторно) —
      // не начисляем баланс дважды.
      return res.json({ ok: true, already: true });
    }

    if (payment.status === 'succeeded') {
      await pool.query('UPDATE payments SET status=$1, confirmed_at=NOW() WHERE yookassa_payment_id=$2', ['succeeded', paymentId]);
      await pool.query('UPDATE users SET balance = balance + $1 WHERE id=$2', [record.amount, record.user_id]);
      console.log('✅ Платёж', paymentId, 'зачислен пользователю', record.user_id, '+', record.amount, '₽');
    } else if (payment.status === 'canceled') {
      await pool.query('UPDATE payments SET status=$1 WHERE yookassa_payment_id=$2', ['canceled', paymentId]);
    }

    return res.json({ ok: true });
  } catch (err) {
    console.error('payments-webhook error:', err);
    // Всё равно отвечаем 200 — иначе ЮKassa будет бесконечно повторять
    // уведомление, а ошибка уже залогирована для разбора вручную.
    return res.status(200).json({ ok: false });
  }
};
