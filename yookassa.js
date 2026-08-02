// db/yookassa.js — минимальный клиент ЮKassa REST API (без лишних зависимостей,
// использует встроенный fetch, доступный в Node 18+).
//
// Нужны переменные окружения:
//   YOOKASSA_SHOP_ID, YOOKASSA_SECRET_KEY
// Взять на my.yookassa.ru → Настройки → Ключи API (сначала выдаётся
// тестовый магазин, боевые ключи — после проверки данных).

const crypto = require('crypto');

const SHOP_ID = process.env.YOOKASSA_SHOP_ID;
const SECRET_KEY = process.env.YOOKASSA_SECRET_KEY;
const API_BASE = 'https://api.yookassa.ru/v3';

function isConfigured() {
  return !!(SHOP_ID && SECRET_KEY);
}

function authHeader() {
  return 'Basic ' + Buffer.from(SHOP_ID + ':' + SECRET_KEY).toString('base64');
}

// Создать платёж. amount — сумма в рублях (целое число), description — текст
// в чеке/истории, returnUrl — куда вернуть пользователя после оплаты.
async function createPayment(amount, description, returnUrl, metadata) {
  if (!isConfigured()) throw new Error('ЮKassa не настроена (нет YOOKASSA_SHOP_ID/YOOKASSA_SECRET_KEY)');

  const idempotenceKey = crypto.randomUUID();
  const res = await fetch(API_BASE + '/payments', {
    method: 'POST',
    headers: {
      'Authorization': authHeader(),
      'Idempotence-Key': idempotenceKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount: { value: amount.toFixed(2), currency: 'RUB' },
      confirmation: { type: 'redirect', return_url: returnUrl },
      capture: true,
      description: description,
      metadata: metadata || {},
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error((data && data.description) || 'Ошибка создания платежа в ЮKassa');
  }
  return data; // { id, status, confirmation: { confirmation_url }, ... }
}

// Проверить реальный статус платежа НА СТОРОНЕ ЮKassa — используется в
// вебхуке вместо доверия телу уведомления напрямую (защита от подделки).
async function getPayment(paymentId) {
  if (!isConfigured()) throw new Error('ЮKassa не настроена');
  const res = await fetch(API_BASE + '/payments/' + paymentId, {
    headers: { 'Authorization': authHeader() },
  });
  const data = await res.json();
  if (!res.ok) throw new Error((data && data.description) || 'Платёж не найден в ЮKassa');
  return data;
}

module.exports = { isConfigured, createPayment, getPayment };
