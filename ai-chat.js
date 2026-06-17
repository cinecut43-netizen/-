// /api/ai-chat.js
//
// Serverless-функция Vercel. Принимает запрос от чата на сайте (без ключа),
// сама обращается к Anthropic API с ключом, который хранится в переменной
// окружения ANTHROPIC_API_KEY (Vercel → Settings → Environment Variables).
// Ключ никогда не попадает в браузер пользователя.

export default async function handler(req, res) {
  // Разрешаем только POST — это endpoint для отправки сообщения в AI
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Метод не поддерживается, используйте POST' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    // Ключ ещё не настроен на Vercel — понятная ошибка вместо падения
    return res.status(500).json({
      error: 'AI-помощник временно недоступен: на сервере не настроен ANTHROPIC_API_KEY.',
    });
  }

  const { question, systemPrompt } = req.body || {};

  if (!question || typeof question !== 'string') {
    return res.status(400).json({ error: 'Поле "question" обязательно и должно быть строкой' });
  }

  // Ограничиваем длину входных данных, чтобы не словить злоупотребление
  const safeQuestion = question.slice(0, 2000);
  const safeSystemPrompt = (systemPrompt || '').slice(0, 4000);

  try {
    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 500,
        system: safeSystemPrompt || undefined,
        messages: [{ role: 'user', content: safeQuestion }],
      }),
    });

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text();
      console.error('Anthropic API error:', anthropicRes.status, errText);
      return res.status(502).json({ error: 'AI-помощник вернул ошибку, попробуйте позже' });
    }

    const data = await anthropicRes.json();
    const text = data?.content?.find((b) => b.type === 'text')?.text || '';

    return res.status(200).json({ text });
  } catch (err) {
    console.error('AI proxy error:', err);
    return res.status(500).json({ error: 'Не удалось связаться с AI-помощником' });
  }
}
