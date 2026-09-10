// /api/telegram-notify.js — отправка уведомлений в Telegram
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const ADMIN_CHAT_ID = process.env.TELEGRAM_ADMIN_ID;
const SITE = 'https://shabashka-lllll16.amvera.io';

async function sendTelegram(text) {
  if (!BOT_TOKEN || !ADMIN_CHAT_ID) return;
  try {
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: ADMIN_CHAT_ID,
        text: text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      })
    });
  } catch(e) {
    console.error('Telegram notify error:', e);
  }
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { type, data } = req.body || {};

  let text = '';

  // Раньше уведомления вообще не содержали ссылок на сайт — узнать о
  // событии можно было, только зная точный адрес нужного раздела админки
  // наизусть. Теперь у каждого типа события — прямая ссылка.
  switch(type) {
    case 'new_job':
      text = `🆕 <b>Новый заказ</b>\n` +
             `📋 ${data.title}\n` +
             `💰 ${data.pay?.toLocaleString('ru')} ₽\n` +
             `📍 ${data.location}\n` +
             `👤 ${data.company}\n\n` +
             `🔗 <a href="${SITE}/admin-orders">Открыть заказы</a>`;
      break;

    case 'new_response':
      text = `👋 <b>Новый отклик</b>\n` +
             `📋 На заказ: ${data.jobTitle}\n` +
             `👤 Исполнитель: ${data.workerName}\n` +
             `💬 ${data.message || 'Без сообщения'}\n\n` +
             `🔗 <a href="${SITE}/admin-orders">Открыть заказы</a>`;
      break;

    case 'new_user':
      text = `🎉 <b>Новый пользователь</b>\n` +
             `👤 ${data.name}\n` +
             `📱 ${data.phone}\n` +
             `🎭 Роль: ${data.role === 'employer' ? 'Работодатель' : 'Исполнитель'}\n\n` +
             `🔗 <a href="${SITE}/admin-users">Открыть пользователей</a>`;
      break;

    case 'job_done':
      // Раньше здесь считалась комиссия 10% и показывалась как реальный
      // доход — хотя монетизация сейчас выключена и комиссия не взимается.
      text = `✅ <b>Заказ завершён</b>\n` +
             `📋 ${data.title}\n` +
             `💰 Оплата: ${data.pay?.toLocaleString('ru')} ₽ (без комиссии — платформа сейчас бесплатна)\n` +
             `👤 ${data.company}\n\n` +
             `🔗 <a href="${SITE}/admin-orders">Открыть заказы</a>`;
      break;

    case 'new_feedback':
      text = `💬 <b>Новый отзыв</b>\n` +
             `${data.type}\n` +
             `${data.rating ? '⭐'.repeat(data.rating) + '\n' : ''}` +
             `📝 ${data.text}\n` +
             `👤 ${data.user} · ${data.page}\n\n` +
             `🔗 <a href="${SITE}/admin-feedback">Открыть отзывы</a>`;
      break;

    case 'new_dispute':
      text = `⚠️ <b>Новый спор</b>\n` +
             `📋 Заказ: ${data.jobTitle}\n` +
             `👤 ${data.userName}\n` +
             `📝 ${data.reason}\n\n` +
             `🔗 <a href="${SITE}/admin-complaints">Открыть споры</a>`;
      break;

    case 'passport_uploaded':
      text = `🪪 <b>Загружен паспорт</b>\n` +
             `👤 ${data.name}\n` +
             `📱 ${data.phone}\n\n` +
             `🔗 <a href="${SITE}/admin-workers">Проверить в админке</a>`;
      break;

    default:
      text = `📢 <b>Событие:</b> ${type}\n${JSON.stringify(data, null, 2)}\n\n` +
             `🔗 <a href="${SITE}/admin">Открыть админку</a>`;
  }

  if (text) await sendTelegram(text);
  res.status(200).json({ ok: true });
};

// Экспортируем функцию для использования в других API
module.exports.sendTelegram = sendTelegram;
