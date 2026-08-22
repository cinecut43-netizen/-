// api/db-users.js — API для пользователей
const { pool } = require('../db');
const { setSessionCookie, clearSessionCookie } = require('../db/session');

module.exports = async function handler(req, res) {
  const method = req.method;
  const action = req.query.action;

  try {
    // POST /api/db-users?action=register — регистрация или вход (upsert по телефону)
    if (method === 'POST' && action === 'register') {
      const { phone, name, role, company, consentText } = req.body;
      if (!phone || !name) return res.status(400).json({ error: 'Укажите телефон и имя' });

      const existing = await pool.query('SELECT id FROM users WHERE phone=$1', [phone]);
      let user;
      if (existing.rows.length) {
        const result = await pool.query(
          `UPDATE users SET name=$1, role=$2, company=$3 WHERE phone=$4 RETURNING *`,
          [name, role || 'worker', company || null, phone]
        );
        user = result.rows[0];
      } else {
        // Фиксируем факт согласия на обработку ПДн (152-ФЗ): дата/время и
        // точный текст, который видел пользователь в момент регистрации.
        const result = await pool.query(
          `INSERT INTO users (phone, name, role, company, consent_at, consent_text)
           VALUES ($1,$2,$3,$4,NOW(),$5) RETURNING *`,
          [phone, name, role || 'worker', company || null,
           consentText || 'Согласен(-на) на обработку персональных данных (152-ФЗ) и с условиями Пользовательского соглашения']
        );
        user = result.rows[0];
      }

      // Настоящая серверная сессия — HttpOnly cookie, а не только localStorage.
      // Дальше сервер сам знает, кто обращается, а не верит тому, что пришлёт клиент.
      setSessionCookie(res, user.id);

      return res.json({ ok: true, user, isNew: !existing.rows.length });
    }

    // POST /api/db-users?action=logout
    if (method === 'POST' && action === 'logout') {
      clearSessionCookie(res);
      return res.json({ ok: true });
    }

    // GET /api/db-users?action=me — кто я сейчас, по cookie сессии
    if (method === 'GET' && action === 'me') {
      if (!req.authUserId) return res.status(401).json({ ok: false, error: 'Не авторизован' });
      const result = await pool.query('SELECT * FROM users WHERE id=$1', [req.authUserId]);
      if (!result.rows.length) return res.status(401).json({ ok: false, error: 'Сессия недействительна' });
      return res.json({ ok: true, user: result.rows[0] });
    }

    // GET /api/db-users?phone=+79001234567 — найти по телефону (проверка при входе).
    // Если находим — это и есть вход, ставим сессию сразу же.
    if (method === 'GET' && req.query.phone) {
      const result = await pool.query('SELECT * FROM users WHERE phone=$1', [req.query.phone]);
      if (!result.rows.length) return res.status(404).json({ error: 'Пользователь не найден' });
      setSessionCookie(res, result.rows[0].id);
      return res.json({ ok: true, user: result.rows[0] });
    }

    // GET /api/db-users?id=1 — найти по id (публичный просмотр профиля — не требует сессии)
    if (method === 'GET' && req.query.id) {
      const result = await pool.query('SELECT * FROM users WHERE id=$1', [req.query.id]);
      if (!result.rows.length) return res.status(404).json({ error: 'Пользователь не найден' });
      return res.json({ ok: true, user: result.rows[0] });
    }

    // GET /api/db-users — список исполнителей
    if (method === 'GET') {
      const { role = 'worker', limit = 50 } = req.query;
      const result = await pool.query(
        `SELECT * FROM users WHERE role=$1 AND status='active' ORDER BY rating DESC, jobs_done DESC LIMIT $2`,
        [role, limit]
      );
      return res.json({ ok: true, users: result.rows });
    }

    // PATCH /api/db-users?action=update — обновить СВОЙ профиль.
    // Раньше id брался из тела запроса без проверки — можно было прислать
    // чужой id и отредактировать чужой профиль. Теперь id всегда берём из
    // подписанной cookie сессии, тело запроса больше не может его подменить.
    if (method === 'PATCH') {
      if (!req.authUserId) return res.status(401).json({ error: 'Не авторизован' });
      const body = req.body || {};

      // Раньше пустая строка (например, чтобы очистить название компании
      // и остаться частным лицом) превращалась в null и COALESCE молча
      // сохранял старое значение — очистить поле было невозможно. Теперь
      // различаем "поле не прислали вообще" (не трогаем) от "прислали
      // пустую строку" (реально очищаем).
      const fieldMap = {
        name: body.name, company: body.company, avatar_url: body.avatar_url,
        city: body.city, bio: body.bio, day_rate: body.day_rate, role: body.role,
      };
      const sets = [];
      const params = [];
      Object.keys(fieldMap).forEach(function (key) {
        if (fieldMap[key] !== undefined) {
          params.push(fieldMap[key] === '' ? null : fieldMap[key]);
          sets.push(key + '=$' + params.length);
        }
      });
      if (body.skills !== undefined) { params.push(body.skills); sets.push('skills=$' + params.length); }
      if (body.categories !== undefined) { params.push(body.categories); sets.push('categories=$' + params.length); }

      if (sets.length) {
        params.push(req.authUserId);
        await pool.query(`UPDATE users SET ${sets.join(', ')} WHERE id=$${params.length}`, params);
      }
      return res.json({ ok: true });
    }

    res.status(405).json({ error: 'Метод не поддерживается' });
  } catch (err) {
    console.error('db-users error:', err);
    res.status(500).json({ error: 'Ошибка сервера: ' + err.message });
  }
};
