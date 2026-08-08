// db/session.js — серверные сессии на подписанной HttpOnly cookie.
//
// Раньше личность пользователя (кто он) целиком держалась в localStorage
// браузера и передавалась клиентом в каждом запросе как есть — сервер
// НИКАК это не проверял, просто верил присланному user_id. Это и хрупко
// (localStorage чистится, слетает на новом устройстве — отсюда все баги
// "пропал аккаунт"/"сообщения не доходят"), и небезопасно (можно было
// прислать чужой user_id и действовать от чужого имени).
//
// Теперь: при входе сервер сам подписывает cookie с id пользователя
// (HMAC, тем же способом, что и админ-токены), ставит её как HttpOnly —
// значит, JS в браузере её даже прочитать не может, только браузер сам
// автоматически прикладывает её к каждому запросу. Подделать нельзя без
// SESSION_SECRET, который есть только на сервере.
const crypto = require('crypto');

const COOKIE_NAME = 'shabashka_session';
const SESSION_LIFETIME_MS = 90 * 24 * 60 * 60 * 1000; // 90 дней

function getSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    console.warn('⚠️ SESSION_SECRET не задан — серверные сессии отключены, вход по cookie работать не будет');
  }
  return secret;
}

function signSession(userId) {
  const secret = getSecret();
  if (!secret) return null;
  const payload = String(userId) + ':' + Date.now();
  const encoded = Buffer.from(payload).toString('base64');
  const sig = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  return encoded + '.' + sig;
}

function verifySession(token) {
  const secret = getSecret();
  if (!secret || !token) return null;
  try {
    const dotIdx = token.lastIndexOf('.');
    if (dotIdx === -1) return null;
    const encoded = token.substring(0, dotIdx);
    const sig = token.substring(dotIdx + 1);
    const payload = Buffer.from(encoded, 'base64').toString('utf-8');
    const expectedSig = crypto.createHmac('sha256', secret).update(payload).digest('hex');
    const sigBuf = Buffer.from(sig, 'hex');
    const expectedBuf = Buffer.from(expectedSig, 'hex');
    if (sigBuf.length !== expectedBuf.length) return null;
    if (!crypto.timingSafeEqual(sigBuf, expectedBuf)) return null;
    const parts = payload.split(':');
    const userId = Number(parts[0]);
    const issuedAt = Number(parts[1]);
    if (!userId || Date.now() - issuedAt > SESSION_LIFETIME_MS) return null;
    return userId;
  } catch (e) {
    return null;
  }
}

// Ставит cookie с сессией на объект ответа Express.
function setSessionCookie(res, userId) {
  const token = signSession(userId);
  if (!token) return;
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,      // недоступна для JS в браузере — не украсть через XSS
    secure: true,        // только по HTTPS
    sameSite: 'lax',     // прикладывается при обычной навигации, но не с чужих сайтов
    maxAge: SESSION_LIFETIME_MS,
    path: '/',
  });
}

function clearSessionCookie(res) {
  res.clearCookie(COOKIE_NAME, { path: '/' });
}

// Express-мидлвар: если cookie валидна, кладёт req.authUserId — иначе null.
// Требует app.use(cookieParser()) до этого мидлвара.
function sessionMiddleware(req, res, next) {
  const token = req.cookies ? req.cookies[COOKIE_NAME] : null;
  req.authUserId = verifySession(token);
  next();
}

module.exports = { setSessionCookie, clearSessionCookie, sessionMiddleware, COOKIE_NAME };
