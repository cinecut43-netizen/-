// AI Агент Шабашки — универсальный помощник
(function() {
  if (document.getElementById('shb-ai-btn')) return;

  var style = document.createElement('style');
  style.textContent =
    '#shb-ai-btn{position:fixed;right:16px;bottom:136px;width:52px;height:52px;border-radius:50%;background:linear-gradient(135deg,#E8510A,#FF8C42);color:#fff;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 20px rgba(232,81,10,.5);z-index:500;transition:transform .15s;font-size:22px}' +
    '#shb-ai-btn:active{transform:scale(.92)}' +
    '@media(min-width:601px){#shb-ai-btn{bottom:72px}}' +
    '#shb-ai-wrap{position:fixed;right:12px;bottom:200px;width:340px;background:#fff;border-radius:20px;box-shadow:0 8px 40px rgba(0,0,0,.18);z-index:9997;display:none;flex-direction:column;overflow:hidden;max-height:70vh}' +
    '@media(max-width:600px){#shb-ai-wrap{left:8px;right:8px;width:auto;bottom:80px;max-height:75vh}}' +
    '#shb-ai-header{background:linear-gradient(135deg,#E8510A,#FF8C42);padding:14px 16px;display:flex;align-items:center;gap:10px;flex-shrink:0}' +
    '.shb-ai-avatar{width:36px;height:36px;border-radius:50%;background:rgba(255,255,255,.25);display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0}' +
    '.shb-ai-title{color:#fff;font-weight:700;font-size:15px}' +
    '.shb-ai-sub{color:rgba(255,255,255,.75);font-size:11px;margin-top:1px}' +
    '#shb-ai-close{margin-left:auto;width:28px;height:28px;border-radius:50%;background:rgba(255,255,255,.2);border:none;cursor:pointer;color:#fff;font-size:16px;display:flex;align-items:center;justify-content:center}' +
    '#shb-ai-msgs{flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:10px}' +
    '.ai-msg{max-width:85%;padding:10px 13px;border-radius:14px;font-size:14px;line-height:1.5}' +
    '.ai-msg.bot{background:#F4F3EF;color:#14151A;border-bottom-left-radius:4px;align-self:flex-start}' +
    '.ai-msg.user{background:#E8510A;color:#fff;border-bottom-right-radius:4px;align-self:flex-end}' +
    '.ai-msg.typing{background:#F4F3EF;color:#9A9A96;font-style:italic}' +
    '.ai-chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:4px}' +
    '.ai-chip{padding:6px 12px;background:#FFF0E8;color:#E8510A;border:1px solid #FDDBC7;border-radius:20px;font-size:12px;cursor:pointer;font-family:inherit;font-weight:500;transition:all .1s}' +
    '.ai-chip:active{background:#E8510A;color:#fff}' +
    '#shb-ai-input-row{padding:10px 12px;border-top:1px solid #F0EFE9;display:flex;gap:8px;flex-shrink:0}' +
    '#shb-ai-input{flex:1;padding:10px 14px;border:1.5px solid #E2E1DB;border-radius:12px;font-size:14px;font-family:inherit;outline:none;color:#14151A}' +
    '#shb-ai-input:focus{border-color:#E8510A}' +
    '#shb-ai-send{width:38px;height:38px;border-radius:10px;background:#E8510A;color:#fff;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:16px}';
  document.head.appendChild(style);

  // Кнопка
  var btn = document.createElement('button');
  btn.id = 'shb-ai-btn';
  btn.title = 'AI помощник';
  btn.textContent = '🤖';
  document.body.appendChild(btn);

  // Окно чата
  var wrap = document.createElement('div');
  wrap.id = 'shb-ai-wrap';
  wrap.innerHTML =
    '<div id="shb-ai-header">' +
      '<div class="shb-ai-avatar">🤖</div>' +
      '<div><div class="shb-ai-title">AI помощник Шабашки</div>' +
      '<div class="shb-ai-sub">Онлайн · отвечает за секунды</div></div>' +
      '<button id="shb-ai-close">×</button>' +
    '</div>' +
    '<div id="shb-ai-msgs"></div>' +
    '<div id="shb-ai-input-row">' +
      '<input id="shb-ai-input" placeholder="Напишите вопрос..." type="text">' +
      '<button id="shb-ai-send">➤</button>' +
    '</div>';
  document.body.appendChild(wrap);

  var msgs = document.getElementById('shb-ai-msgs');
  var input = document.getElementById('shb-ai-input');
  var history = [];
  var isOpen = false;

  var SYSTEM_PROMPT =
    'Ты — AI помощник платформы Шабашка (биржа разовых подработок в России). ' +
    'Помогаешь пользователям: 1) найти подходящий заказ по их навыкам, 2) написать привлекательное описание заказа для работодателей, 3) отвечаешь на вопросы о платформе. ' +
    'Платформа: исполнители откликаются на заказы (грузчики, строители, уборка, ивент и промо, прочее). Работодатели размещают заказы. ' +
    'Отвечай коротко, по делу, на русском языке. Будь дружелюбным. ' +
    'Если спрашивают о заказах — уточни навыки и город. ' +
    'Если просят написать описание заказа — задай вопросы: что нужно сделать, сколько людей, когда, где, сколько платят. ' +
    'Не выдумывай конкретные заказы — они находятся на сайте в разделе "Главная".';

  function addMsg(text, type, chips) {
    var div = document.createElement('div');
    div.className = 'ai-msg ' + type;
    div.textContent = text;
    if (chips && chips.length) {
      var chipsDiv = document.createElement('div');
      chipsDiv.className = 'ai-chips';
      chips.forEach(function(c) {
        var chip = document.createElement('button');
        chip.className = 'ai-chip';
        chip.textContent = c;
        chip.onclick = function() { sendMsg(c); };
        chipsDiv.appendChild(chip);
      });
      div.appendChild(chipsDiv);
    }
    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
    return div;
  }

  function showWelcome() {
    msgs.innerHTML = '';
    history = [];
    addMsg(
      'Привет! 👋 Я AI помощник Шабашки. Чем могу помочь?',
      'bot',
      ['🔍 Найти заказ', '📝 Составить описание заказа', '❓ Вопрос о сайте', '💰 Как заработать больше']
    );
  }

  async function sendMsg(text) {
    if (!text.trim()) return;
    input.value = '';
    addMsg(text, 'user');
    history.push({ role: 'user', content: text });

    var typing = addMsg('Печатает...', 'bot typing');

    try {
      var res = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system: SYSTEM_PROMPT,
          messages: history,
        })
      });
      var data = await res.json();
      var reply = data.text || 'Извините, не могу ответить прямо сейчас.';
      typing.remove();

      // Умные подсказки исходя из контекста ответа
      var chips = [];
      if (reply.toLowerCase().includes('навык') || reply.toLowerCase().includes('умеет')) {
        chips = ['Грузчик', 'Строитель', 'Уборщик', 'Промоутер'];
      } else if (reply.toLowerCase().includes('город') || reply.toLowerCase().includes('где')) {
        chips = ['Москва', 'Санкт-Петербург', 'Другой город'];
      } else if (reply.toLowerCase().includes('заказ')) {
        chips = ['Посмотреть заказы', '📝 Создать заказ', 'Ещё вопрос'];
      } else {
        chips = ['Спасибо!', 'Ещё вопрос', '🔍 Найти заказ'];
      }

      addMsg(reply, 'bot', chips);
      history.push({ role: 'assistant', content: reply });

      // Специальные действия
      if (text === 'Посмотреть заказы') {
        window.location.href = '/';
      }
      if (text === '📝 Создать заказ') {
        window.location.href = '/employer';
      }

    } catch(e) {
      typing.remove();
      addMsg('Ошибка соединения. Попробуйте позже.', 'bot');
    }
  }

  btn.onclick = function() {
    isOpen = !isOpen;
    wrap.style.display = isOpen ? 'flex' : 'none';
    if (isOpen && !msgs.children.length) showWelcome();
    if (isOpen) input.focus();
  };

  document.getElementById('shb-ai-close').onclick = function() {
    isOpen = false;
    wrap.style.display = 'none';
  };

  document.getElementById('shb-ai-send').onclick = function() {
    sendMsg(input.value.trim());
  };

  input.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') sendMsg(input.value.trim());
  });
})();
