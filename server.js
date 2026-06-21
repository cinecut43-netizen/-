const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 80;

// Определяем корневую папку — на Amvera файлы могут быть в /app или /app/site
const ROOT = fs.existsSync(path.join(__dirname, 'index.html'))
  ? __dirname
  : fs.existsSync('/app/site/index.html')
    ? '/app/site'
    : __dirname;

console.log('Корневая папка:', ROOT);

app.use(express.json({ limit: '10mb' }));

// Безопасные заголовки
app.use(function (req, res, next) {
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  if (req.path.startsWith('/api/')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  }
  next();
});

// In-memory хранилища
global.__shabashkaCodes = global.__shabashkaCodes || {};
global.__shabashkaDocs  = global.__shabashkaDocs  || {};

// API маршруты
app.post('/api/send-code',     require(path.join(ROOT, 'api/send-code')));
app.post('/api/verify-code',   require(path.join(ROOT, 'api/verify-code')));
app.post('/api/upload-doc',    require(path.join(ROOT, 'api/upload-doc')));
app.post('/api/get-doc',       require(path.join(ROOT, 'api/get-doc')));
app.get('/api/check-new-jobs', require(path.join(ROOT, 'api/check-new-jobs')));
app.post('/api/admin-login',   require(path.join(ROOT, 'api/admin-login')));
app.post('/api/admin-verify',  require(path.join(ROOT, 'api/admin-verify')));
app.post('/api/ai-chat',       require(path.join(ROOT, 'api/ai-chat')));

// Статика
app.use(express.static(ROOT, {
  setHeaders: function (res, filePath) {
    if (filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache');
    } else if (filePath.match(/\.(js|css|svg|png|ico)$/)) {
      res.setHeader('Cache-Control', 'public, max-age=86400');
    }
  }
}));

// Страницы
const pages = {
  '/':                'index.html',
  '/landing':         'landing.html',
  '/register':        'register.html',
  '/profile':         'profile.html',
  '/chat':            'chat.html',
  '/map':             'map.html',
  '/wallet':          'wallet.html',
  '/employer':        'employer.html',
  '/workers':         'workers.html',
  '/favorites':       'favorites.html',
  '/pro':             'pro.html',
  '/privacy':         'privacy.html',
  '/terms':           'terms.html',
  '/offer':           'offer.html',
  '/contacts':        'contacts.html',
  '/onboarding':      'onboarding.html',
  '/admin':           'admin.html',
  '/admin-users':     'admin-users.html',
  '/admin-orders':    'admin-orders.html',
  '/admin-workers':   'admin-workers.html',
  '/admin-reviews':   'admin-reviews.html',
  '/admin-complaints':'admin-complaints.html',
  '/admin-finance':   'admin-finance.html',
  '/admin-settings':  'admin-settings.html',
  '/admin-content':   'admin-content.html',
  '/admin-security':  'admin-security.html',
};

Object.entries(pages).forEach(function([route, file]) {
  app.get(route, function(req, res) {
    res.sendFile(path.join(ROOT, file));
  });
});

// 404
app.use(function(req, res) {
  res.status(404).sendFile(path.join(ROOT, '404.html'));
});

app.listen(PORT, function() {
  console.log('Шабашка запущена на порту ' + PORT);
});
