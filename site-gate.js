// site-gate.js — настоящий пароль на вход на сайт (проверяет СЕРВЕР, а не страница).
//
// Как включить:  в Амвере добавьте переменную окружения SITE_PASSWORD
//                (значение = пароль) и перезапустите проект.
// Как выключить: удалите переменную SITE_PASSWORD и перезапустите проект.
//
// Пока пароль задан, без него не открывается НИЧЕГО (страницы, заказы, API),
// кроме двух вебхуков (Телеграм и ЮKassa), которым нужен доступ снаружи.
// Для поисковиков в это время отдаётся robots.txt «Disallow: /» и заголовок noindex.

const crypto = require('crypto');

const COOKIE = 'shabashka_gate';
const MAX_AGE_SEC = 30 * 24 * 60 * 60; // пароль запоминается на 30 дней
const OPEN_PATHS = ['/api/telegram-webhook', '/api/payments-webhook']; // вебхуки внешних сервисов
const MAX_FAILS = 5;                    // неверных попыток…
const WINDOW_MS = 10 * 60 * 1000;       // …за 10 минут с одного адреса

const fails = {}; // ip -> { n, first }

function token(password) {
  // Метка «пароль введён». Привязана к самому паролю: сменили пароль — старые метки перестали работать.
  const key = (process.env.SESSION_SECRET || '') + '|' + password;
  return crypto.createHmac('sha256', key).update('shabashka-site-gate-v1').digest('hex');
}
function safeEqual(a, b) {
  const x = Buffer.from(String(a)), y = Buffer.from(String(b));
  if (x.length !== y.length) return false;
  return crypto.timingSafeEqual(x, y);
}
function passwordOk(input, password) { // сравнение без утечки по времени, длина не влияет
  const h = function (s) { return crypto.createHash('sha256').update(String(s)).digest(); };
  return crypto.timingSafeEqual(h(input), h(password));
}
function getCookie(req, name) {
  const raw = req.headers.cookie || '';
  const parts = raw.split(';');
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i].trim();
    if (p.slice(0, name.length + 1) === name + '=') return decodeURIComponent(p.slice(name.length + 1));
  }
  return '';
}
function clientIp(req) {
  const xff = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return xff || (req.socket && req.socket.remoteAddress) || 'unknown';
}
function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function safeNext(n) { // только путь внутри сайта; «//evil.com» и «http://…» отбрасываем
  n = String(n || '/');
  return n.charAt(0) === '/' && n.charAt(1) !== '/' && n.charAt(1) !== '\\' ? n.slice(0, 500) : '/';
}

function page(next, error) {
  return '<!DOCTYPE html><html lang="ru"><head><meta charset="UTF-8">' +
    '<meta name="viewport" content="width=device-width, initial-scale=1.0">' +
    '<meta name="robots" content="noindex, nofollow"><title>Шабашка — доступ закрыт</title><style>' +
    '*{box-sizing:border-box;margin:0;padding:0}body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;' +
    'background:#14151A;min-height:100vh;display:flex;align-items:center;justify-content:center;color:#fff;padding:20px}' +
    '.card{background:#1E1E1C;border-radius:24px;padding:40px 32px;max-width:380px;width:100%;text-align:center}' +
    '.logo{font-size:36px;font-weight:900;letter-spacing:-1px;margin-bottom:8px}.logo span{color:#E8510A}' +
    'p{font-size:14px;color:rgba(255,255,255,.55);line-height:1.6;margin:16px 0 24px}' +
    'input{width:100%;padding:14px 16px;background:rgba(255,255,255,.07);border:1.5px solid rgba(255,255,255,.12);border-radius:12px;color:#fff;font-size:16px;outline:none;margin-bottom:12px;text-align:center}' +
    'input:focus{border-color:#E8510A}button{width:100%;padding:15px;background:#E8510A;color:#fff;border:none;border-radius:12px;font-size:16px;font-weight:700;cursor:pointer}' +
    '.err{color:#FF6B6B;font-size:13px;margin-bottom:12px}</style></head><body><div class="card">' +
    '<div class="logo">Шаба<span>шка</span></div><p>Сайт сейчас закрыт.<br>Введите пароль, чтобы войти.</p>' +
    (error ? '<div class="err">' + esc(error) + '</div>' : '') +
    '<form method="POST" action="/__gate"><input type="hidden" name="next" value="' + esc(next) + '">' +
    '<input type="password" name="password" placeholder="Пароль" autocomplete="current-password" autofocus required>' +
    '<button type="submit">Войти</button></form></div></body></html>';
}

function applyHeaders(res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
}

module.exports = function siteGate(app) {
  app.use(function (req, res, next) {
    const password = process.env.SITE_PASSWORD;
    if (!password) return next(); // пароль не задан — сайт открыт как обычно

    const path = req.path;

    // внешние сервисы: Телеграм и ЮKassa стучатся сами, пароля у них нет
    if (OPEN_PATHS.indexOf(path) !== -1) return next();

    // роботам поисковиков — «не индексировать»
    if (path === '/robots.txt') {
      applyHeaders(res);
      return res.type('text/plain').send('User-agent: *\nDisallow: /\n');
    }

    // уже вводили пароль
    const have = getCookie(req, COOKIE);
    if (have && safeEqual(have, token(password))) return next();

    // отправка формы с паролем
    if (path === '/__gate' && req.method === 'POST') {
      applyHeaders(res);
      const ip = clientIp(req);
      const now = Date.now();
      const rec = fails[ip];
      if (rec && now - rec.first > WINDOW_MS) delete fails[ip];
      if (fails[ip] && fails[ip].n >= MAX_FAILS) {
        return res.status(429).type('html').send(page('/', 'Слишком много попыток. Подождите 10 минут.'));
      }
      let body = '';
      let size = 0;
      req.on('data', function (c) { size += c.length; if (size < 4096) body += c; });
      req.on('end', function () {
        const form = new URLSearchParams(body);
        const next2 = safeNext(form.get('next'));
        if (passwordOk(form.get('password') || '', password)) {
          delete fails[ip];
          const secure = String(req.headers['x-forwarded-proto'] || req.protocol) === 'https' ? '; Secure' : '';
          res.setHeader('Set-Cookie', COOKIE + '=' + token(password) + '; Path=/; HttpOnly; SameSite=Lax; Max-Age=' + MAX_AGE_SEC + secure);
          return res.redirect(303, next2);
        }
        if (!fails[ip]) fails[ip] = { n: 0, first: now };
        fails[ip].n++;
        return res.status(401).type('html').send(page(next2, 'Неверный пароль'));
      });
      return;
    }

    // всё остальное закрыто
    applyHeaders(res);
    if (path.indexOf('/api/') === 0) {
      return res.status(401).json({ error: 'Сайт закрыт паролем' });
    }
    return res.status(200).type('html').send(page(req.originalUrl || '/', ''));
  });
};
