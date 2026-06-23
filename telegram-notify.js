// /api/telegram-notify.js — отправка уведомлений в Telegram
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const ADMIN_CHAT_ID = process.env.TELEGRAM_ADMIN_ID;

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

  switch(type) {
    case 'new_job':
      text = `🆕 <b>Новый заказ</b>\n` +
             `📋 ${data.title}\n` +
             `💰 ${data.pay?.toLocaleString('ru')} ₽\n` +
             `📍 ${data.location}\n` +
             `👤 ${data.company}`;
      break;

    case 'new_response':
      text = `👋 <b>Новый отклик</b>\n` +
             `📋 На заказ: ${data.jobTitle}\n` +
             `👤 Исполнитель: ${data.workerName}\n` +
             `💬 ${data.message || 'Без сообщения'}`;
      break;

    case 'new_user':
      text = `🎉 <b>Новый пользователь</b>\n` +
             `👤 ${data.name}\n` +
             `📱 ${data.phone}\n` +
             `🎭 Роль: ${data.role === 'employer' ? 'Работодатель' : 'Исполнитель'}`;
      break;

    case 'job_done':
      text = `✅ <b>Заказ завершён</b>\n` +
             `📋 ${data.title}\n` +
             `💰 Комиссия: ${Math.round(data.pay * 0.1)?.toLocaleString('ru')} ₽\n` +
             `👤 ${data.company}`;
      break;

    case 'new_feedback':
      text = `💬 <b>Новый отзыв</b>\n` +
             `${data.type}\n` +
             `${data.rating ? '⭐'.repeat(data.rating) + '\n' : ''}` +
             `📝 ${data.text}\n` +
             `👤 ${data.user} · ${data.page}`;
      break;

    case 'new_dispute':
      text = `⚠️ <b>Новый спор</b>\n` +
             `📋 Заказ: ${data.jobTitle}\n` +
             `👤 ${data.userName}\n` +
             `📝 ${data.reason}`;
      break;

    case 'passport_uploaded':
      text = `🪪 <b>Загружен паспорт</b>\n` +
             `👤 ${data.name}\n` +
             `📱 ${data.phone}\n` +
             `🔍 Требует проверки в /admin-workers`;
      break;

    default:
      text = `📢 <b>Событие:</b> ${type}\n${JSON.stringify(data, null, 2)}`;
  }

  if (text) await sendTelegram(text);
  res.status(200).json({ ok: true });
};

// Экспортируем функцию для использования в других API
module.exports.sendTelegram = sendTelegram;
