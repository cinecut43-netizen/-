// /api/ai-chat.js
//
// Serverless-функция Vercel. Принимает запрос от чата на сайте (без ключа),
// сама обращается к Groq API с ключом, который хранится в переменной
// окружения GROQ_API_KEY (Vercel → Settings → Environment Variables).
// Ключ никогда не попадает в браузер пользователя.
//
// Groq даёт бесплатный доступ без банковской карты (лимиты по запросам в
// минуту/день, этого с избытком хватает для одного сайта). Получить ключ:
// console.groq.com → Sign up → API Keys → Create API Key.
// Модель llama-3.3-70b-versatile — открытая модель Meta, быстрая и достаточно
// умная для роли помощника на сайте. Эндпоинт OpenAI-совместимый.

export default async function handler(req, res) {
  // Разрешаем только POST — это endpoint для отправки сообщения в AI
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Метод не поддерживается, используйте POST' });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    // Ключ ещё не настроен на Vercel — понятная ошибка вместо падения
    return res.status(500).json({
      error: 'AI-помощник временно недоступен: на сервере не настроен GROQ_API_KEY.',
    });
  }

  const { question, systemPrompt } = req.body || {};

  if (!question || typeof question !== 'string') {
    return res.status(400).json({ error: 'Поле "question" обязательно и должно быть строкой' });
  }

  // Ограничиваем длину входных данных, чтобы не словить злоупотребление
  // и не выйти за бесплатный лимит токенов в минуту у Groq
  const safeQuestion = question.slice(0, 2000);
  const safeSystemPrompt = (systemPrompt || '').slice(0, 4000);

  try {
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        max_tokens: 500,
        messages: [
          ...(safeSystemPrompt ? [{ role: 'system', content: safeSystemPrompt }] : []),
          { role: 'user', content: safeQuestion },
        ],
      }),
    });

    if (!groqRes.ok) {
      const errText = await groqRes.text();
      console.error('Groq API error:', groqRes.status, errText);
      // 429 у Groq — превышен бесплатный лимит запросов, отдаём понятный текст
      if (groqRes.status === 429) {
        return res.status(429).json({ error: 'AI-помощник сейчас перегружен запросами, попробуйте через минуту' });
      }
      return res.status(502).json({ error: 'AI-помощник вернул ошибку, попробуйте позже' });
    }

    const data = await groqRes.json();
    const text = data?.choices?.[0]?.message?.content || '';

    return res.status(200).json({ text });
  } catch (err) {
    console.error('AI proxy error:', err);
    return res.status(500).json({ error: 'Не удалось связаться с AI-помощником' });
  }
}
