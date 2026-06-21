// server.js — главный файл для запуска на Amvera
// Заменяет Vercel serverless функции на Express.js

const express = require('express');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 80;

// Парсинг JSON тела запросов
app.use(express.json({ limit: '10mb' }));

// ===== БЕЗОПАСНЫЕ ЗАГОЛОВКИ =====
app.use(function (req, res, next) {
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(self)');
  if (req.path.startsWith('/api/')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  }
  next();
});

// ===== IN-MEMORY ХРАНИЛИЩА =====
// (в production заменить на PostgreSQL — см. комментарии ниже)
global.__shabashkaCodes = global.__shabashkaCodes || {};
global.__shabashkaDocs  = global.__shabashkaDocs  || {};

// ===== API МАРШРУТЫ =====

// --- Верификация телефона ---
app.post('/api/send-code', require('./api/send-code'));
app.post('/api/verify-code', require('./api/verify-code'));

// --- Загрузка документов ---
app.post('/api/upload-doc', require('./api/upload-doc'));
app.post('/api/get-doc', require('./api/get-doc'));

// --- Новые заказы (polling) ---
app.get('/api/check-new-jobs', require('./api/check-new-jobs'));

// --- Админка ---
app.post('/api/admin-login', require('./api/admin-login'));
app.post('/api/admin-verify', require('./api/admin-verify'));

// --- AI чат ---
app.post('/api/ai-chat', require('./api/ai-chat'));

// ===== СТАТИКА =====
// Раздаём все HTML, CSS, JS файлы из корня проекта
app.use(express.static(path.join(__dirname), {
  // Не кэшируем API и HTML, кэшируем статику
  setHeaders: function (res, filePath) {
    if (filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache');
    } else if (filePath.match(/\.(js|css|svg|png|ico)$/)) {
      res.setHeader('Cache-Control', 'public, max-age=86400'); // 1 день
    }
  }
}));

// ===== РОУТЫ СТРАНИЦ =====
// Все маршруты без расширения → соответствующий .html файл
const routes = {
  '/':           'index.html',
  '/landing':    'landing.html',
  '/register':   'register.html',
  '/profile':    'profile.html',
  '/chat':       'chat.html',
  '/map':        'map.html',
  '/wallet':     'wallet.html',
  '/employer':   'employer.html',
  '/workers':    'workers.html',
  '/favorites':  'favorites.html',
  '/pro':        'pro.html',
  '/referral':   'referral.html',
  '/privacy':    'privacy.html',
  '/terms':      'terms.html',
  '/offer':      'offer.html',
  '/contacts':   'contacts.html',
  '/onboarding': 'onboarding.html',
  '/sitemap.xml':'sitemap.xml',
  '/robots.txt': 'robots.txt',
  // Админка
  '/admin':               'admin.html',
  '/admin-users':         'admin-users.html',
  '/admin-orders':        'admin-orders.html',
  '/admin-workers':       'admin-workers.html',
  '/admin-reviews':       'admin-reviews.html',
  '/admin-complaints':    'admin-complaints.html',
  '/admin-finance':       'admin-finance.html',
  '/admin-settings':      'admin-settings.html',
  '/admin-content':       'admin-content.html',
  '/admin-security':      'admin-security.html',
};

Object.entries(routes).forEach(function ([route, file]) {
  app.get(route, function (req, res) {
    res.sendFile(path.join(__dirname, file));
  });
});

// ===== 404 =====
app.use(function (req, res) {
  res.status(404).sendFile(path.join(__dirname, '404.html'));
});

// ===== ЗАПУСК =====
app.listen(PORT, function () {
  console.log('Шабашка запущена на порту ' + PORT);
});
