// feedback.js — плавающая кнопка обратной связи
(function() {
  if (document.getElementById('shb-feedback-btn')) return;

  // Кнопка
  var btn = document.createElement('button');
  btn.id = 'shb-feedback-btn';
  btn.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>';
  btn.title = 'Оставить отзыв';

  var style = document.createElement('style');
  style.textContent =
    '#shb-feedback-btn{position:fixed;right:16px;bottom:80px;width:48px;height:48px;border-radius:50%;background:#E8510A;color:#fff;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 16px rgba(232,81,10,.4);z-index:500;transition:transform .15s}' +
    '#shb-feedback-btn:active{transform:scale(.92)}' +
    '@media(min-width:601px){#shb-feedback-btn{bottom:24px}}' +
    '#shb-feedback-overlay{position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9998;display:flex;align-items:flex-end}' +
    '@media(min-width:601px){#shb-feedback-overlay{align-items:center;justify-content:center}}' +
    '#shb-feedback-modal{background:#fff;width:100%;border-radius:20px 20px 0 0;padding:24px;padding-bottom:calc(24px + env(safe-area-inset-bottom,0px));max-width:460px}' +
    '@media(min-width:601px){#shb-feedback-modal{border-radius:20px}}' +
    '.shb-fb-handle{width:36px;height:4px;background:#E2E1DB;border-radius:2px;margin:0 auto 20px}' +
    '.shb-fb-title{font-size:18px;font-weight:800;color:#14151A;margin-bottom:4px}' +
    '.shb-fb-sub{font-size:13px;color:#9A9A96;margin-bottom:18px}' +
    '.shb-fb-types{display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap}' +
    '.shb-fb-type{padding:7px 14px;border:1.5px solid #E2E1DB;border-radius:20px;font-size:13px;cursor:pointer;font-family:inherit;background:#fff;color:#6B6B67;font-weight:500;transition:all .15s}' +
    '.shb-fb-type.active{border-color:#E8510A;color:#E8510A;background:#FFF0E8}' +
    '.shb-fb-stars{display:flex;gap:6px;margin-bottom:16px}' +
    '.shb-fb-star{font-size:28px;cursor:pointer;transition:transform .1s;background:none;border:none;padding:0}' +
    '.shb-fb-star:active{transform:scale(1.3)}' +
    '.shb-fb-text{width:100%;height:100px;padding:12px 14px;border:1.5px solid #E2E1DB;border-radius:12px;font-size:14px;font-family:inherit;outline:none;resize:none;color:#14151A;margin-bottom:16px}' +
    '.shb-fb-text:focus{border-color:#E8510A}' +
    '.shb-fb-btns{display:flex;gap:10px}' +
    '.shb-fb-cancel{flex:1;padding:13px;background:#F4F3EF;border:none;border-radius:12px;font-size:14px;font-weight:600;cursor:pointer;font-family:inherit;color:#14151A}' +
    '.shb-fb-send{flex:2;padding:13px;background:#E8510A;border:none;border-radius:12px;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit;color:#fff}';

  document.head.appendChild(style);
  document.body.appendChild(btn);

  var TYPES = ['💡 Идея', '🐛 Ошибка', '😍 Похвала', '😞 Жалоба', '❓ Вопрос'];
  var selectedType = '';
  var selectedRating = 0;

  btn.onclick = function() {
    if (document.getElementById('shb-feedback-overlay')) return;
    selectedType = '';
    selectedRating = 0;

    var overlay = document.createElement('div');
    overlay.id = 'shb-feedback-overlay';
    overlay.onclick = function(e){ if(e.target===overlay) close(); };

    var page = window.location.pathname;

    overlay.innerHTML =
      '<div id="shb-feedback-modal">' +
        '<div class="shb-fb-handle"></div>' +
        '<div class="shb-fb-title">Ваше мнение важно</div>' +
        '<div class="shb-fb-sub">Помогите сделать Шабашку лучше</div>' +
        '<div class="shb-fb-types" id="fbTypes">' +
          TYPES.map(function(t){
            return '<button class="shb-fb-type" onclick="fbSelectType(this,\''+t+'\')">' + t + '</button>';
          }).join('') +
        '</div>' +
        '<div class="shb-fb-stars" id="fbStars">' +
          [1,2,3,4,5].map(function(n){
            return '<button class="shb-fb-star" onclick="fbSetStar('+n+')">☆</button>';
          }).join('') +
        '</div>' +
        '<textarea class="shb-fb-text" id="fbText" placeholder="Расскажите подробнее..."></textarea>' +
        '<div class="shb-fb-btns">' +
          '<button class="shb-fb-cancel" onclick="document.getElementById(\'shb-feedback-overlay\').remove()">Отмена</button>' +
          '<button class="shb-fb-send" onclick="fbSend()">Отправить</button>' +
        '</div>' +
      '</div>';

    document.body.appendChild(overlay);
  };

  window.fbSelectType = function(btn, type) {
    selectedType = type;
    document.querySelectorAll('.shb-fb-type').forEach(function(b){ b.classList.remove('active'); });
    btn.classList.add('active');
  };

  window.fbSetStar = function(n) {
    selectedRating = n;
    var stars = document.querySelectorAll('.shb-fb-star');
    stars.forEach(function(s, i){ s.textContent = i < n ? '⭐' : '☆'; });
  };

  window.fbSend = function() {
    var text = document.getElementById('fbText').value.trim();
    if (!text && !selectedType) {
      document.getElementById('fbText').style.borderColor = '#E8510A';
      return;
    }

    // Сохраняем в базу данных и отправляем в Telegram
    var user = (window.Shabashka && Shabashka.getUser) ? Shabashka.getUser() : {};
    fetch('/api/db-feedbacks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: selectedType || '💬 Отзыв',
        rating: selectedRating,
        text: text,
        page: window.location.pathname,
        user_name: user.name || 'Аноним',
        phone: user.phone || '',
      })
    }).catch(function(){});

    // Также сохраняем локально
    var feedbacks = JSON.parse(localStorage.getItem('shabashka_feedbacks') || '[]');
    feedbacks.unshift({
      id: Date.now(),
      type: selectedType || '💬 Отзыв',
      rating: selectedRating,
      text: text,
      page: window.location.pathname,
      date: new Date().toLocaleString('ru'),
      user: user.name || 'Аноним',
      phone: user.phone || '',
    });
    localStorage.setItem('shabashka_feedbacks', JSON.stringify(feedbacks));

    // Закрываем и показываем спасибо
    document.getElementById('shb-feedback-overlay').remove();
    var toast = document.createElement('div');
    toast.textContent = '🙏 Спасибо за отзыв!';
    toast.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:#1A7A4A;color:#fff;padding:12px 22px;border-radius:20px;font-size:14px;font-weight:600;z-index:999;white-space:nowrap;box-shadow:0 4px 16px rgba(0,0,0,.2)';
    document.body.appendChild(toast);
    setTimeout(function(){ toast.remove(); }, 3000);
  };

  function close() {
    var o = document.getElementById('shb-feedback-overlay');
    if (o) o.remove();
  }
})();
