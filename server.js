const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Ищем index.html по всем возможным путям
function findRoot() {
  const candidates = [
    '/app',
    '/app/site',
    __dirname,
    path.join(__dirname, 'site'),
  ];
  
  // Выводим содержимое /app для диагностики
  try {
    const appContents = fs.readdirSync('/app');
    console.log('Содержимое /app:', appContents.join(', '));
  } catch(e) {
    console.log('Не удалось прочитать /app:', e.message);
  }

  for (const dir of candidates) {
    try {
      if (fs.existsSync(path.join(dir, 'index.html'))) {
        console.log('Нашёл index.html в:', dir);
        return dir;
      } else {
        console.log('index.html НЕТ в:', dir);
      }
    } catch(e) {
      console.log('Ошибка проверки', dir, ':', e.message);
    }
  }
  
  console.log('index.html не найден нигде, используем __dirname:', __dirname);
  return __dirname;
}

const ROOT = findRoot();
console.log('ROOT =', ROOT);

app.use(express.json({ limit: '10mb' }));

app.use(function (req, res, next) {
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.path.startsWith('/api/')) {
    res.setHeader('Cache-Control', 'no-store');
  }
  next();
});

global.__shabashkaCodes = global.__shabashkaCodes || {};
global.__shabashkaDocs  = global.__shabashkaDocs  || {};

// API
try { app.post('/api/send-code',     require(path.join(ROOT, 'api/send-code'))); } catch(e) { console.log('api/send-code не найден'); }
try { app.post('/api/verify-code',   require(path.join(ROOT, 'api/verify-code'))); } catch(e) {}
try { app.post('/api/upload-doc',    require(path.join(ROOT, 'api/upload-doc'))); } catch(e) {}
try { app.post('/api/get-doc',       require(path.join(ROOT, 'api/get-doc'))); } catch(e) {}
try { app.get('/api/check-new-jobs', require(path.join(ROOT, 'api/check-new-jobs'))); } catch(e) {}
try { app.post('/api/admin-login',   require(path.join(ROOT, 'api/admin-login'))); } catch(e) {}
try { app.post('/api/admin-verify',  require(path.join(ROOT, 'api/admin-verify'))); } catch(e) {}
try { app.post('/api/ai-chat',       require(path.join(ROOT, 'api/ai-chat'))); } catch(e) {}

// Статика
app.use(express.static(ROOT));

// coming-soon страница
app.get('/coming-soon', function(req, res) {
  res.sendFile(path.join(ROOT, 'coming-soon.html'));
});

// Страницы
const pages = {
  '/profile': 'profile.html', '/chat': 'chat.html', '/map': 'map.html',
  '/wallet': 'wallet.html', '/employer': 'employer.html', '/workers': 'workers.html',
  '/favorites': 'favorites.html', '/pro': 'pro.html', '/privacy': 'privacy.html',
  '/terms': 'terms.html', '/offer': 'offer.html', '/contacts': 'contacts.html',
  '/onboarding': 'onboarding.html', '/admin': 'admin.html',
  '/admin-users': 'admin-users.html', '/admin-orders': 'admin-orders.html',
  '/admin-workers': 'admin-workers.html', '/admin-reviews': 'admin-reviews.html',
  '/admin-complaints': 'admin-complaints.html', '/admin-finance': 'admin-finance.html',
  '/admin-settings': 'admin-settings.html', '/admin-content': 'admin-content.html',
  '/admin-security': 'admin-security.html',
};

Object.entries(pages).forEach(function([route, file]) {
  app.get(route, function(req, res) {
    const filePath = path.join(ROOT, file);
    if (fs.existsSync(filePath)) {
      res.sendFile(filePath);
    } else {
      res.status(404).send('Файл не найден: ' + filePath);
    }
  });
});

app.use(function(req, res) {
  const f = path.join(ROOT, '404.html');
  if (fs.existsSync(f)) {
    res.status(404).sendFile(f);
  } else {
    res.status(404).send('404 - страница не найдена');
  }
});

app.listen(PORT, function() {
  console.log('Шабашка запущена на порту ' + PORT);
});
