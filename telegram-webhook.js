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

// Раньше нажатие на кнопку никак не подтверждалось Telegram — кнопка
// оставалась с "крутилкой загрузки" до тех пор, пока Telegram сам не
// сбросит её по таймауту. Теперь сразу отвечаем на нажатие.
async function answerCallback(callbackQueryId) {
  if (!callbackQueryId) return;
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ callback_query_id: callbackQueryId })
  });
}

// Регистрирует команды бота у самого Telegram — благодаря этому /menu
// и другие команды появляются подсказкой при нажатии "/" в чате и в
// кнопке-меню рядом с полем ввода, а не только по факту, если их
// напечатать руками вслепую.
async function registerBotCommands() {
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/setMyCommands`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      commands: [
        { command: 'menu', description: '📋 Открыть меню' },
        { command: 'stats', description: '📊 Статистика' },
        { command: 'start', description: '👋 Перезапустить бота' },
      ]
    })
  });
}

const MENU_TEXT = '👋 <b>Шабашка Админ</b>\n\nВыберите раздел:';
const MENU_KEYBOARD = [
  [{ text: '📊 Статистика', callback_data: 'stats' }, { text: '📋 Заказы', callback_data: 'jobs' }],
  [{ text: '👥 Пользователи', callback_data: 'users' }, { text: '💬 Отзывы', callback_data: 'feedbacks' }],
  [{ text: '🌐 Открыть сайт', url: 'https://shabashka-lllll16.amvera.io' }],
  [{ text: '🔧 Админка', url: 'https://shabashka-lllll16.amvera.io/admin' }],
];
// Кнопка возврата в меню — добавляется под каждым разделом, чтобы не
// приходилось каждый раз печатать /menu заново руками.
const BACK_TO_MENU = [[{ text: '⬅ В меню', callback_data: 'menu' }]];

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const update = req.body;
  const msg = update.message || update.callback_query?.message;
  const chatId = msg?.chat?.id?.toString();
  const text = update.message?.text || '';
  const callbackData = update.callback_query?.data;
  const callbackId = update.callback_query?.id;

  // Регистрируем команды один раз при первом же обращении к вебхуку —
  // если уже зарегистрированы, Telegram просто примет тот же список заново.
  if (text === '/start') registerBotCommands().catch(function(){});

  // Только для админа
  if (chatId !== ADMIN_CHAT_ID) {
    await sendMessage(chatId, '⛔ Доступ запрещён');
    await answerCallback(callbackId);
    return res.status(200).end();
  }

  if (text === '/start' || text === '/menu' || callbackData === 'menu') {
    await sendMessage(chatId, MENU_TEXT, MENU_KEYBOARD);
  } else if (text === '/stats' || callbackData === 'stats') {
    await sendMessage(chatId,
      '📊 <b>Статистика Шабашки</b>\n\n' +
      '🔗 <a href="https://shabashka-lllll16.amvera.io/admin-stats">Открыть статистику</a>\n\n' +
      '📋 <a href="https://shabashka-lllll16.amvera.io/admin">Главная админки</a>',
      BACK_TO_MENU
    );
  } else if (callbackData === 'jobs') {
    await sendMessage(chatId,
      '📋 <b>Управление заказами</b>\n\n' +
      '🔗 <a href="https://shabashka-lllll16.amvera.io/admin-orders">Открыть заказы</a>',
      BACK_TO_MENU
    );
  } else if (callbackData === 'users') {
    await sendMessage(chatId,
      '👥 <b>Пользователи</b>\n\n' +
      '🔗 <a href="https://shabashka-lllll16.amvera.io/admin-users">Открыть пользователей</a>',
      BACK_TO_MENU
    );
  } else if (callbackData === 'feedbacks') {
    await sendMessage(chatId,
      '💬 <b>Отзывы пользователей</b>\n\n' +
      '🔗 <a href="https://shabashka-lllll16.amvera.io/admin-feedback">Открыть отзывы</a>',
      BACK_TO_MENU
    );
  } else {
    await sendMessage(chatId, '❓ Неизвестная команда. Напиши /menu', BACK_TO_MENU);
  }

  await answerCallback(callbackId);
  res.status(200).json({ ok: true });
};
