// city-pages.js — страницы городов (/rabota, /rabota/<город>) и динамическая карта сайта.
//
// Принципы (чтобы поисковики не сочли страницы спамом-«дорвеями»):
//  • на странице города показываются РЕАЛЬНЫЕ открытые заказы из базы;
//  • если в городе нет открытых заказов — страница получает noindex
//    и не попадает в sitemap.xml, но остаётся доступной для людей;
//  • в sitemap.xml попадают только города, где есть заказы.

const SITE = 'https://shabashka24.ru';

// [название, «в городе»]
const CITY_LIST = [
  ['Москва', 'в Москве'], ['Санкт-Петербург', 'в Санкт-Петербурге'], ['Новосибирск', 'в Новосибирске'],
  ['Екатеринбург', 'в Екатеринбурге'], ['Казань', 'в Казани'], ['Нижний Новгород', 'в Нижнем Новгороде'],
  ['Красноярск', 'в Красноярске'], ['Челябинск', 'в Челябинске'], ['Самара', 'в Самаре'], ['Уфа', 'в Уфе'],
  ['Ростов-на-Дону', 'в Ростове-на-Дону'], ['Краснодар', 'в Краснодаре'], ['Омск', 'в Омске'],
  ['Воронеж', 'в Воронеже'], ['Пермь', 'в Перми'], ['Волгоград', 'в Волгограде'], ['Саратов', 'в Саратове'],
  ['Тюмень', 'в Тюмени'], ['Тольятти', 'в Тольятти'], ['Ижевск', 'в Ижевске'], ['Барнаул', 'в Барнауле'],
  ['Ульяновск', 'в Ульяновске'], ['Иркутск', 'в Иркутске'], ['Хабаровск', 'в Хабаровске'],
  ['Ярославль', 'в Ярославле'], ['Владивосток', 'во Владивостоке'], ['Махачкала', 'в Махачкале'],
  ['Томск', 'в Томске'], ['Оренбург', 'в Оренбурге'], ['Кемерово', 'в Кемерове'],
  ['Новокузнецк', 'в Новокузнецке'], ['Рязань', 'в Рязани'], ['Астрахань', 'в Астрахани'],
  ['Набережные Челны', 'в Набережных Челнах'], ['Пенза', 'в Пензе'], ['Киров', 'в Кирове'],
  ['Липецк', 'в Липецке'], ['Чебоксары', 'в Чебоксарах'], ['Балашиха', 'в Балашихе'],
  ['Калининград', 'в Калининграде'], ['Тула', 'в Туле'], ['Курск', 'в Курске'], ['Севастополь', 'в Севастополе'],
  ['Сочи', 'в Сочи'], ['Улан-Удэ', 'в Улан-Удэ'], ['Ставрополь', 'в Ставрополе'], ['Тверь', 'в Твери'],
  ['Магнитогорск', 'в Магнитогорске'], ['Иваново', 'в Иванове'], ['Брянск', 'в Брянске'],
  ['Белгород', 'в Белгороде'], ['Сургут', 'в Сургуте'], ['Владимир', 'во Владимире'],
  ['Архангельск', 'в Архангельске'], ['Чита', 'в Чите'], ['Калуга', 'в Калуге'], ['Смоленск', 'в Смоленске'],
  ['Волжский', 'в Волжском'], ['Курган', 'в Кургане'], ['Орёл', 'в Орле'], ['Череповец', 'в Череповце'],
  ['Вологда', 'в Вологде'], ['Владикавказ', 'во Владикавказе'], ['Саранск', 'в Саранске'],
  ['Якутск', 'в Якутске'], ['Мурманск', 'в Мурманске'], ['Подольск', 'в Подольске'], ['Грозный', 'в Грозном'],
  ['Тамбов', 'в Тамбове'], ['Стерлитамак', 'в Стерлитамаке'], ['Петрозаводск', 'в Петрозаводске'],
  ['Кострома', 'в Костроме'], ['Нижневартовск', 'в Нижневартовске'], ['Новороссийск', 'в Новороссийске'],
  ['Йошкар-Ола', 'в Йошкар-Оле'], ['Химки', 'в Химках'], ['Таганрог', 'в Таганроге'],
  ['Комсомольск-на-Амуре', 'в Комсомольске-на-Амуре'], ['Сыктывкар', 'в Сыктывкаре'],
  ['Нальчик', 'в Нальчике'], ['Шахты', 'в Шахтах'], ['Дзержинск', 'в Дзержинске'], ['Орск', 'в Орске'],
  ['Братск', 'в Братске'], ['Благовещенск', 'в Благовещенске'], ['Энгельс', 'в Энгельсе'],
  ['Ангарск', 'в Ангарске'], ['Королёв', 'в Королёве'], ['Великий Новгород', 'в Великом Новгороде'],
  ['Старый Оскол', 'в Старом Осколе'], ['Мытищи', 'в Мытищах'], ['Псков', 'в Пскове'],
  ['Люберцы', 'в Люберцах'], ['Бийск', 'в Бийске'], ['Прокопьевск', 'в Прокопьевске'],
  ['Южно-Сахалинск', 'в Южно-Сахалинске'], ['Балаково', 'в Балаково'], ['Армавир', 'в Армавире'],
  ['Рыбинск', 'в Рыбинске'], ['Абакан', 'в Абакане'], ['Северодвинск', 'в Северодвинске'],
  ['Норильск', 'в Норильске'], ['Петропавловск-Камчатский', 'в Петропавловске-Камчатском'],
  ['Красногорск', 'в Красногорске'], ['Сызрань', 'в Сызрани'], ['Обнинск', 'в Обнинске'],
  ['Одинцово', 'в Одинцове'], ['Домодедово', 'в Домодедове'], ['Электросталь', 'в Электростали'],
];

// Дополнительные написания, которые люди используют в адресе заказа.
const ALIASES = {
  'Москва': ['мск'],
  'Санкт-Петербург': ['спб', 'питер', 'петербург', 'санкт петербург', 'с-петербург'],
  'Нижний Новгород': ['н. новгород', 'нижний'],
  'Екатеринбург': ['екб'],
  'Ростов-на-Дону': ['ростов', 'ростов на дону'],
  'Набережные Челны': ['н. челны', 'наб. челны', 'челны'],
  'Великий Новгород': ['новгород'],
  'Петропавловск-Камчатский': ['петропавловск-камчатский', 'петропавловск камчатский'],
};

const CATEGORIES = {
  move: ['🚚', 'Переезды и грузчики'],
  build: ['🔨', 'Строительство и ремонт'],
  clean: ['🧹', 'Уборка'],
  event: ['🎉', 'Мероприятия'],
  other: ['📦', 'Другие задачи'],
};

// ---------- транслитерация для адресов страниц ----------
const TR = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l',
  м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'kh', ц: 'ts', ч: 'ch',
  ш: 'sh', щ: 'shch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
};
function slugify(name) {
  return name.toLowerCase().split('').map(function (ch) {
    return TR[ch] !== undefined ? TR[ch] : ch;
  }).join('').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}
function norm(s) { // для сравнения названий: нижний регистр, ё → е
  return String(s || '').toLowerCase().replace(/ё/g, 'е').trim();
}

const CITIES = CITY_LIST.map(function (c) {
  const name = c[0];
  const names = [norm(name)].concat((ALIASES[name] || []).map(norm));
  return { name: name, inCity: c[1], slug: slugify(name), names: names };
});
const BY_SLUG = {};
CITIES.forEach(function (c) { BY_SLUG[c.slug] = c; });

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function plural(n, one, few, many) {
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
}
function money(n) { return Number(n).toLocaleString('ru-RU') + ' ₽'; }

// SQL-выражение: «город» из адреса заказа (часть до первой запятой, без «г.»)
const CITY_SQL =
  "replace(lower(regexp_replace(trim(split_part(coalesce(location,''), ',', 1)), '^(г\\.?|город)\\s+', '', 'i')), 'ё', 'е')";
const OPEN_SQL = "status IN ('new','has_responses')";

// ---------- простой кеш, чтобы не нагружать базу ----------
const cache = {};
async function cached(key, ttlMs, fn) {
  const hit = cache[key];
  if (hit && Date.now() - hit.t < ttlMs) return hit.v;
  const v = await fn();
  cache[key] = { t: Date.now(), v: v };
  return v;
}

module.exports = function registerCityPages(app, pool) {
  // сколько открытых заказов в каждом городе из нашего списка
  async function countsByCity() {
    return cached('counts', 5 * 60 * 1000, async function () {
      const r = await pool.query(
        'SELECT ' + CITY_SQL + ' AS c, COUNT(*)::int AS n FROM jobs WHERE ' + OPEN_SQL + ' GROUP BY 1'
      );
      const raw = {};
      r.rows.forEach(function (row) { raw[row.c] = row.n; });
      const out = {};
      CITIES.forEach(function (city) {
        out[city.slug] = city.names.reduce(function (sum, nm) { return sum + (raw[nm] || 0); }, 0);
      });
      return out;
    });
  }

  async function cityData(city) {
    return cached('city:' + city.slug, 3 * 60 * 1000, async function () {
      const jobs = await pool.query(
        'SELECT id, title, emoji, category, pay, pay_label, people, date, urgent, created_at FROM jobs ' +
        'WHERE ' + OPEN_SQL + ' AND ' + CITY_SQL + ' = ANY($1) ORDER BY urgent DESC, created_at DESC LIMIT 30',
        [city.names]
      );
      const stats = await pool.query(
        'SELECT category, COUNT(*)::int AS n, ROUND(AVG(pay))::int AS avg_pay FROM jobs ' +
        'WHERE ' + OPEN_SQL + ' AND ' + CITY_SQL + ' = ANY($1) GROUP BY category',
        [city.names]
      );
      return { jobs: jobs.rows, stats: stats.rows };
    });
  }

  const CSS =
    '*{box-sizing:border-box;margin:0;padding:0}' +
    ':root{--o:#E8510A;--d:#1A1A18;--g:#6B6B67;--l:#F4F3EF;--b:#E2E1DB}' +
    'body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:var(--l);color:var(--d);line-height:1.55}' +
    'nav{background:#fff;border-bottom:1px solid var(--b);padding:0 20px;height:56px;display:flex;align-items:center;gap:16px}' +
    '.logo{font-size:19px;font-weight:800;color:var(--d);text-decoration:none}.logo span{color:var(--o)}' +
    'nav a.cta{margin-left:auto;background:var(--o);color:#fff;text-decoration:none;font-weight:700;font-size:13px;padding:8px 14px;border-radius:9px}' +
    '.wrap{max-width:760px;margin:0 auto;padding:28px 16px 48px}' +
    '.crumbs{font-size:12.5px;color:var(--g);margin-bottom:12px}.crumbs a{color:var(--g)}' +
    'h1{font-size:26px;font-weight:800;letter-spacing:-.3px;margin-bottom:8px}' +
    '.lead{color:#2A2A28;font-size:15px;margin-bottom:18px}' +
    '.card{background:#fff;border:1px solid var(--b);border-radius:14px;padding:18px 20px;margin-bottom:14px}' +
    '.card h2{font-size:16px;margin-bottom:10px}' +
    '.chips{display:flex;flex-wrap:wrap;gap:8px}.chip{background:var(--l);border:1px solid var(--b);border-radius:20px;padding:6px 12px;font-size:13px}' +
    '.job{display:flex;gap:12px;align-items:center;padding:12px 0;border-bottom:1px solid var(--b);text-decoration:none;color:inherit}' +
    '.job:last-child{border-bottom:none}.job .em{font-size:24px;flex-shrink:0}.job .t{font-weight:700;font-size:14.5px}' +
    '.job .m{font-size:12.5px;color:var(--g);margin-top:2px}.job .p{margin-left:auto;font-weight:800;color:var(--o);white-space:nowrap}' +
    '.btn{display:inline-block;background:var(--o);color:#fff;text-decoration:none;font-weight:700;padding:11px 20px;border-radius:10px;font-size:14px}' +
    '.cities{display:flex;flex-wrap:wrap;gap:6px 14px;font-size:13.5px}.cities a{color:var(--d)}' +
    'details{border-top:1px solid var(--b);padding:10px 0}details:first-of-type{border-top:none}summary{cursor:pointer;font-weight:600;font-size:14px}details p{font-size:13.5px;color:#2A2A28;margin-top:6px}' +
    'footer{padding:24px 16px;text-align:center;font-size:12.5px;color:var(--g)}footer a{color:var(--g);margin:0 8px}';

  function shell(opts, body) {
    const robots = opts.noindex ? 'noindex, follow' : 'index, follow';
    const ld = opts.breadcrumbs
      ? '<script type="application/ld+json">' + JSON.stringify({
          '@context': 'https://schema.org', '@type': 'BreadcrumbList',
          itemListElement: opts.breadcrumbs.map(function (b, i) {
            return { '@type': 'ListItem', position: i + 1, name: b[0], item: b[1] };
          }),
        }).replace(/</g, '\\u003c') + '</script>'
      : '';
    return '<!DOCTYPE html><html lang="ru"><head><meta charset="UTF-8">' +
      '<meta name="viewport" content="width=device-width, initial-scale=1.0">' +
      '<title>' + esc(opts.title) + '</title>' +
      '<meta name="description" content="' + esc(opts.description) + '">' +
      '<meta name="robots" content="' + robots + '">' +
      '<link rel="canonical" href="' + esc(opts.canonical) + '">' +
      '<meta property="og:title" content="' + esc(opts.title) + '">' +
      '<meta property="og:description" content="' + esc(opts.description) + '">' +
      '<meta property="og:url" content="' + esc(opts.canonical) + '">' +
      '<meta property="og:type" content="website">' +
      '<link rel="icon" type="image/x-icon" href="/favicon.ico">' +
      '<style>' + CSS + '</style>' + ld + '</head><body>' +
      '<nav><a class="logo" href="/">Шаба<span>шка</span></a><a class="cta" href="/register">Войти</a></nav>' +
      '<div class="wrap">' + body + '</div>' +
      '<footer><a href="/privacy">Конфиденциальность</a><a href="/terms">Условия использования</a>' +
      '<a href="/offer">Оферта</a><a href="/contacts">Контакты</a><div style="margin-top:8px">© Шабашка · 18+</div></footer>' +
      '</body></html>';
  }

  // ---------- /rabota — список городов ----------
  app.get('/rabota', async function (req, res) {
    try {
      let counts = {};
      try { counts = await countsByCity(); } catch (e) { /* без базы показываем просто список */ }
      const active = CITIES.filter(function (c) { return counts[c.slug] > 0; })
        .sort(function (a, b) { return counts[b.slug] - counts[a.slug]; });
      const rest = CITIES.filter(function (c) { return !(counts[c.slug] > 0); });
      let body = '<div class="crumbs"><a href="/">Шабашка</a> › Города</div>' +
        '<h1>Подработка и разовая работа по городам России</h1>' +
        '<p class="lead">Выбери свой город: грузчики, уборка, ремонт, помощь на мероприятиях. Оплата в день работы.</p>';
      if (active.length) {
        body += '<div class="card"><h2>Города с открытыми заказами</h2><div class="cities">' +
          active.map(function (c) {
            return '<a href="/rabota/' + c.slug + '">' + esc(c.name) + ' (' + counts[c.slug] + ')</a>';
          }).join('') + '</div></div>';
      }
      body += '<div class="card"><h2>' + (active.length ? 'Другие города' : 'Города') + '</h2><div class="cities">' +
        rest.map(function (c) { return '<a href="/rabota/' + c.slug + '">' + esc(c.name) + '</a>'; }).join('') +
        '</div></div>';
      res.set('Cache-Control', 'public, max-age=300');
      res.type('html').send(shell({
        title: 'Подработка и разовая работа по городам России — Шабашка',
        description: 'Заказы на разовую работу в городах России: грузчики, уборка, стройка, мероприятия. Оплата в день работы.',
        canonical: SITE + '/rabota',
        breadcrumbs: [['Шабашка', SITE + '/'], ['Города', SITE + '/rabota']],
      }, body));
    } catch (e) {
      console.error('city index error:', e.message);
      res.status(500).send('Ошибка сервера');
    }
  });

  // ---------- /rabota/<город> ----------
  app.get('/rabota/:slug', async function (req, res) {
    const city = BY_SLUG[String(req.params.slug).toLowerCase()];
    if (!city) return res.redirect(302, '/rabota');
    try {
      let data = { jobs: [], stats: [] };
      try { data = await cityData(city); } catch (e) { console.error('city data error:', e.message); }
      const n = data.jobs.length;
      const total = data.stats.reduce(function (s, r) { return s + r.n; }, 0);
      const canonical = SITE + '/rabota/' + city.slug;
      const has = total > 0;

      let body = '<div class="crumbs"><a href="/">Шабашка</a> › <a href="/rabota">Города</a> › ' + esc(city.name) + '</div>' +
        '<h1>Подработка и разовая работа ' + esc(city.inCity) + '</h1>';

      if (has) {
        body += '<p class="lead">Сейчас открыто <b>' + total + '</b> ' + plural(total, 'заказ', 'заказа', 'заказов') +
          ' ' + esc(city.inCity) + '. Откликнись за минуту и получи оплату в день работы.</p>';
        body += '<div class="card"><h2>Что ищут ' + esc(city.inCity) + '</h2><div class="chips">' +
          data.stats.map(function (r) {
            const cat = CATEGORIES[r.category] || CATEGORIES.other;
            return '<span class="chip">' + cat[0] + ' ' + cat[1] + ': ' + r.n + ' · в среднем ' + money(r.avg_pay) + '</span>';
          }).join('') + '</div></div>';
        body += '<div class="card"><h2>Свежие заказы ' + esc(city.inCity) + '</h2>' +
          data.jobs.map(function (j) {
            return '<a class="job" href="/?job=' + j.id + '"><span class="em">' + esc(j.emoji || '📦') + '</span>' +
              '<span><div class="t">' + (j.urgent ? '🔥 ' : '') + esc(j.title) + '</div>' +
              '<div class="m">' + esc(j.date || '') + (j.people > 1 ? ' · нужно ' + j.people + ' чел.' : '') + '</div></span>' +
              '<span class="p">' + money(j.pay) + (j.pay_label ? '<div class="m" style="text-align:right;font-weight:400">' + esc(j.pay_label) + '</div>' : '') + '</span></a>';
          }).join('') +
          '<div style="margin-top:14px"><a class="btn" href="/register?role=worker">Откликнуться на заказ</a></div></div>';
      } else {
        body += '<p class="lead">Открытых заказов ' + esc(city.inCity) + ' пока нет. Если вам нужны грузчики, уборка, помощь с ремонтом ' +
          'или рабочие руки на день, разместите заказ бесплатно, и исполнители смогут откликнуться.</p>' +
          '<div class="card"><a class="btn" href="/register?role=employer">Разместить заказ</a> ' +
          '<a class="btn" style="background:#1A1A18;margin-left:8px" href="/register?role=worker">Я ищу подработку</a></div>';
      }

      body += '<div class="card"><h2>Как это работает</h2>' +
        '<details open><summary>Как найти подработку ' + esc(city.inCity) + '?</summary><p>Зарегистрируйтесь по номеру телефона, выберите заказ из списка и нажмите «Откликнуться». Работодатель сам выберет исполнителя и свяжется с вами.</p></details>' +
        '<details><summary>Когда платят?</summary><p>Условия оплаты указаны в каждом заказе. Для большинства разовых работ оплата происходит в день выполнения.</p></details>' +
        '<details><summary>Сколько стоит размещение заказа?</summary><p>Размещать заказы и откликаться на них сейчас бесплатно. Комиссия за выполненные заказы на старте не взимается.</p></details>' +
        '<details><summary>Какие работы можно заказать ' + esc(city.inCity) + '?</summary><p>Грузчики и переезды, уборка, строительство и ремонт, помощь на мероприятиях и другие разовые задачи.</p></details></div>';

      res.set('Cache-Control', 'public, max-age=300');
      res.type('html').send(shell({
        title: 'Подработка ' + city.inCity + (has ? ' — ' + total + ' ' + plural(total, 'заказ', 'заказа', 'заказов') + ' сегодня' : '') + ' | Шабашка',
        description: has
          ? 'Разовая работа ' + city.inCity + ': ' + total + ' ' + plural(total, 'открытый заказ', 'открытых заказа', 'открытых заказов') + ' — грузчики, уборка, стройка, мероприятия. Оплата в день работы.'
          : 'Подработка и разовые заказы ' + city.inCity + '. Разместите заказ или найдите работу на день на платформе Шабашка.',
        canonical: canonical,
        noindex: !has,
        breadcrumbs: [['Шабашка', SITE + '/'], ['Города', SITE + '/rabota'], [city.name, canonical]],
      }, body));
    } catch (e) {
      console.error('city page error:', e.message);
      res.status(500).send('Ошибка сервера');
    }
  });

  // ---------- динамическая карта сайта ----------
  app.get('/sitemap.xml', async function (req, res) {
    try {
      let counts = {};
      try { counts = await countsByCity(); } catch (e) { /* без базы — только основные страницы */ }
      const today = new Date().toISOString().slice(0, 10);
      const urls = [
        ['/', '1.0', 'daily'], ['/landing', '0.9', 'weekly'], ['/register', '0.8', 'monthly'],
        ['/map', '0.7', 'daily'], ['/rabota', '0.8', 'daily'], ['/contacts', '0.4', 'monthly'],
        ['/privacy', '0.3', 'monthly'], ['/terms', '0.3', 'monthly'], ['/offer', '0.3', 'monthly'],
      ];
      CITIES.forEach(function (c) {
        if (counts[c.slug] > 0) urls.push(['/rabota/' + c.slug, '0.7', 'daily']);
      });
      const xml = '<?xml version="1.0" encoding="UTF-8"?>\n' +
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
        urls.map(function (u) {
          return '  <url><loc>' + SITE + u[0] + '</loc><lastmod>' + today + '</lastmod><changefreq>' + u[2] +
            '</changefreq><priority>' + u[1] + '</priority></url>';
        }).join('\n') + '\n</urlset>\n';
      res.set('Cache-Control', 'public, max-age=600');
      res.type('application/xml').send(xml);
    } catch (e) {
      console.error('sitemap error:', e.message);
      res.status(500).send('Ошибка сервера');
    }
  });
};

module.exports._test = { CITIES: CITIES, slugify: slugify };
