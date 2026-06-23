// /api/telegram-webhook.js — обработка команд от бота
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const ADMIN_CHAT_ID = process.env.TELEGRAM_ADMIN_ID;

async function sendMessage(chatId, text, keyboard) {
  var body = { chat_id: chatId, text, parse_mode: 'HTML' };
  if (keyboard) body.reply_markup = { inline_keyboard: keyboard };
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const update = req.body;
  const msg = update.message || update.callback_query?.message;
  const chatId = msg?.chat?.id?.toString();
  const text = update.message?.text || '';
  const callbackData = update.callback_query?.data;

  // Только для админа
  if (chatId !== ADMIN_CHAT_ID) {
    await sendMessage(chatId, '⛔ Доступ запрещён');
    return res.status(200).end();
  }

  // Команды
  if (text === '/start' || text === '/menu') {
    await sendMessage(chatId,
      '👋 <b>Шабашка Админ</b>\n\nВыберите раздел:',
      [
        [{ text: '📊 Статистика', callback_data: 'stats' }, { text: '📋 Заказы', callback_data: 'jobs' }],
        [{ text: '👥 Пользователи', callback_data: 'users' }, { text: '💬 Отзывы', callback_data: 'feedbacks' }],
        [{ text: '🌐 Открыть сайт', url: 'https://shabashka-jade.vercel.app' }],
        [{ text: '🔧 Админка', url: 'https://shabashka-jade.vercel.app/admin' }],
      ]
    );
  } else if (text === '/stats' || callbackData === 'stats') {
    await sendMessage(chatId,
      '📊 <b>Статистика Шабашки</b>\n\n' +
      '🔗 <a href="https://shabashka-jade.vercel.app/admin-stats">Открыть статистику</a>\n\n' +
      '📋 <a href="https://shabashka-jade.vercel.app/admin">Главная админки</a>'
    );
  } else if (callbackData === 'jobs') {
    await sendMessage(chatId,
      '📋 <b>Управление заказами</b>\n\n' +
      '🔗 <a href="https://shabashka-jade.vercel.app/admin-orders">Открыть заказы</a>'
    );
  } else if (callbackData === 'users') {
    await sendMessage(chatId,
      '👥 <b>Пользователи</b>\n\n' +
      '🔗 <a href="https://shabashka-jade.vercel.app/admin-users">Открыть пользователей</a>'
    );
  } else if (callbackData === 'feedbacks') {
    await sendMessage(chatId,
      '💬 <b>Отзывы пользователей</b>\n\n' +
      '🔗 <a href="https://shabashka-jade.vercel.app/admin-feedback">Открыть отзывы</a>'
    );
  } else {
    await sendMessage(chatId, '❓ Неизвестная команда. Напиши /menu');
  }

  res.status(200).json({ ok: true });
};
