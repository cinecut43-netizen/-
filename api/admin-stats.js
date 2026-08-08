// /api/admin-stats.js — реальная агрегированная статистика для админки
// (раньше admin-stats.html сам всё выдумывал: Math.random() для графика
// активности, зашитый топ-5 исполнителей, воронка с придуманными
// коэффициентами x8/x4/x0.3, лента событий с фейковыми таймстемпами)
const crypto = require('crypto');
const { pool } = require('../db');

const TOKEN_LIFETIME_MS = 24 * 60 * 60 * 1000;

function verifyAdminToken(token, role, secret) {
  if (!token || !role || !secret) return false;
  try {
    const dotIdx = token.lastIndexOf('.');
    if (dotIdx === -1) return false;
    const encodedPayload = token.substring(0, dotIdx);
    const signature = token.substring(dotIdx + 1);
    const payload = Buffer.from(encodedPayload, 'base64').toString('utf-8');
    const expectedSig = crypto.createHmac('sha256', secret).update(payload).digest('hex');
    const sigBuf = Buffer.from(signature, 'hex');
    const expectedBuf = Buffer.from(expectedSig, 'hex');
    if (sigBuf.length !== expectedBuf.length) return false;
    if (!crypto.timingSafeEqual(sigBuf, expectedBuf)) return false;
    const parts = payload.split(':');
    if (parts[0] !== role) return false;
    const age = Date.now() - Number(parts[1]);
    return age >= 0 && age < TOKEN_LIFETIME_MS;
  } catch (e) { return false; }
}

module.exports = async function handler(req, res) {
  const tokenSecret = process.env.ADMIN_TOKEN_SECRET;
  const adminToken = req.query.adminToken;
  const adminRole = req.query.adminRole;
  if (!tokenSecret || !verifyAdminToken(adminToken, adminRole, tokenSecret)) {
    return res.status(403).json({ error: 'Доступ запрещён' });
  }
  if (req.method !== 'GET') return res.status(405).json({ error: 'Метод не поддерживается' });

  try {
    const [totalsQ, doneQ, catQ, activityQ, topEmpQ, topWorkQ, feedJobsQ, feedRespQ, feedDoneQ, feedUsersQ] = await Promise.all([
      pool.query(`SELECT (SELECT COUNT(*) FROM jobs) as jobs, (SELECT COUNT(*) FROM responses) as responses, (SELECT COUNT(*) FROM users) as users`),
      pool.query(`SELECT COUNT(*) as cnt, COALESCE(SUM(ROUND(pay * 0.1)),0) as revenue FROM jobs WHERE status = 'done'`),
      pool.query(`SELECT category, COUNT(*) as cnt FROM jobs GROUP BY category`),
      pool.query(`
        SELECT to_char(d.day, 'DD.MM') as label,
          (SELECT COUNT(*) FROM jobs j WHERE j.created_at::date = d.day) as jobs,
          (SELECT COUNT(*) FROM responses r WHERE r.created_at::date = d.day) as responses
        FROM generate_series(CURRENT_DATE - INTERVAL '6 days', CURRENT_DATE, INTERVAL '1 day') as d(day)
        ORDER BY d.day
      `),
      pool.query(`
        SELECT u.name as name, COUNT(j.id) as cnt, COALESCE(SUM(j.pay) FILTER (WHERE j.status='done'),0) as spend
        FROM jobs j JOIN users u ON j.employer_id = u.id
        GROUP BY u.name ORDER BY cnt DESC LIMIT 5
      `),
      pool.query(`
        SELECT name, jobs_done as orders, rating
        FROM users WHERE role = 'worker' AND jobs_done > 0
        ORDER BY jobs_done DESC LIMIT 5
      `),
      pool.query(`SELECT 'job' as kind, title as text, created_at FROM jobs ORDER BY created_at DESC LIMIT 5`),
      pool.query(`SELECT 'response' as kind, j.title as text, r.created_at FROM responses r JOIN jobs j ON r.job_id=j.id ORDER BY r.created_at DESC LIMIT 5`),
      pool.query(`SELECT 'done' as kind, title as text, updated_at as created_at FROM jobs WHERE status='done' ORDER BY updated_at DESC LIMIT 5`),
      pool.query(`SELECT 'user' as kind, name as text, created_at FROM users ORDER BY created_at DESC LIMIT 5`),
    ]);

    const cats = { move: 0, build: 0, clean: 0, event: 0, other: 0 };
    catQ.rows.forEach(function (r) { cats[r.category in cats ? r.category : 'other'] += Number(r.cnt); });

    const feed = feedJobsQ.rows.concat(feedRespQ.rows, feedDoneQ.rows, feedUsersQ.rows)
      .sort(function (a, b) { return new Date(b.created_at) - new Date(a.created_at); })
      .slice(0, 8)
      .map(function (e) {
        var labels = { job: '🆕 Новый заказ «' + e.text + '»', response: '👋 Новый отклик на «' + e.text + '»', done: '✅ Заказ «' + e.text + '» завершён', user: '🎉 Новый пользователь: ' + e.text };
        return { text: labels[e.kind], time: e.created_at };
      });

    res.json({
      ok: true,
      totals: {
        jobs: Number(totalsQ.rows[0].jobs),
        responses: Number(totalsQ.rows[0].responses),
        users: Number(totalsQ.rows[0].users),
        done: Number(doneQ.rows[0].cnt),
        revenue: Number(doneQ.rows[0].revenue),
      },
      categories: cats,
      activity: activityQ.rows.map(function (r) { return { label: r.label, jobs: Number(r.jobs), responses: Number(r.responses) }; }),
      topEmployers: topEmpQ.rows.map(function (r) { return { name: r.name, count: Number(r.cnt), spend: Number(r.spend) }; }),
      topWorkers: topWorkQ.rows.map(function (r) { return { name: r.name, orders: Number(r.orders), rating: Number(r.rating).toFixed(1) }; }),
      feed: feed,
    });
  } catch (err) {
    console.error('admin-stats error:', err);
    res.status(500).json({ error: 'Ошибка сервера: ' + err.message });
  }
};
