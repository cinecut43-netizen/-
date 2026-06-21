// /api/upload-doc.js
//
// Serverless-функция Vercel. Принимает фото документа (base64), сохраняет
// его in-memory с TTL 48 часов, возвращает UUID для отслеживания статуса.
//
// ВАЖНО О БЕЗОПАСНОСТИ:
// — Фото НЕ сохраняется в localStorage браузера пользователя
// — Фото доступно только через этот API с правильным токеном администратора
// — In-memory хранилище: при "засыпании" функции данные теряются
//   (для production нужно S3/R2 или другое защищённое хранилище)
// — Размер фото ограничен 5МБ
//
// Для production: заменить in-memory на Cloudflare R2 / AWS S3 с presigned URLs,
// добавить шифрование AES-256 перед сохранением.

const crypto = require('crypto');

const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5МБ
const DOC_TTL_MS = 48 * 60 * 60 * 1000; // 48 часов

// In-memory хранилище документов
const docs = global.__shabashkaDocs || (global.__shabashkaDocs = {});

// Очищаем просроченные документы
function cleanExpired() {
  const now = Date.now();
  Object.keys(docs).forEach(function(id) {
    if (now > docs[id].expiresAt) {
      delete docs[id];
    }
  });
}

module.exports = async function handler(req, res) {
  // Разрешаем только POST
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Метод не поддерживается' });
  }

  const { photo, type } = req.body || {};

  if (!photo || typeof photo !== 'string') {
    return res.status(400).json({ error: 'Фото не передано' });
  }

  // Проверяем что это base64 изображение
  if (!photo.startsWith('data:image/')) {
    return res.status(400).json({ error: 'Допустимы только изображения (JPEG, PNG)' });
  }

  // Проверка размера (base64 примерно на 33% больше оригинала)
  const approxBytes = Math.ceil(photo.length * 0.75);
  if (approxBytes > MAX_SIZE_BYTES) {
    return res.status(413).json({ error: 'Файл слишком большой. Максимум 5 МБ.' });
  }

  // Разрешённые типы
  const allowedTypes = ['data:image/jpeg;', 'data:image/jpg;', 'data:image/png;', 'data:image/webp;'];
  if (!allowedTypes.some(function(t) { return photo.startsWith(t); })) {
    return res.status(400).json({ error: 'Допустимые форматы: JPEG, PNG, WebP' });
  }

  cleanExpired();

  // Генерируем UUID для документа
  const docId = crypto.randomBytes(16).toString('hex');
  const now = Date.now();

  docs[docId] = {
    photo: photo,
    type: type || 'passport',
    uploadedAt: now,
    expiresAt: now + DOC_TTL_MS,
    status: 'pending',
  };

  return res.status(200).json({
    ok: true,
    docId: docId,
    expiresIn: '48 часов',
  });
};
