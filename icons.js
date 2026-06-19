/* icons.js — Phosphor Icons Bold для Шабашки
   Подключение: <link> на CDN добавляется автоматически этим скриптом.
   Использование:
     icon('house')              → <i class="ph-bold ph-house">
     icon('house', 20, '#E8510A') → с размером и цветом
     <span data-icon="house">   → авто-рендер при загрузке страницы */

(function () {

  // Маппинг коротких имён на Phosphor-классы
  var PH = {
    'home':              'ph-house',
    'search':            'ph-magnifying-glass',
    'map':               'ph-map-pin',
    'message-circle':    'ph-chat-circle-dots',
    'credit-card':       'ph-credit-card',
    'wallet':            'ph-wallet',
    'user':              'ph-user-circle',
    'layout-dashboard':  'ph-chart-bar',
    'clipboard-list':    'ph-clipboard-text',
    'users':             'ph-users',
    'building-2':        'ph-buildings',
    'trending-up':       'ph-trend-up',
    'package':           'ph-package',
    'hammer':            'ph-hammer',
    'sparkles':          'ph-broom',
    'zap':               'ph-lightning',
    'flame':             'ph-fire',
    'shield-check':      'ph-shield-check',
    'star':              'ph-star',
    'bell':              'ph-bell',
    'camera':            'ph-camera',
    'calendar':          'ph-calendar',
    'map-pin':           'ph-map-pin',
    'alert-triangle':    'ph-warning',
    'menu':              'ph-list',
    'check':             'ph-check',
    'check-circle':      'ph-check-circle',
    'arrow-right':       'ph-arrow-right',
    'arrow-left':        'ph-arrow-left',
    'x':                 'ph-x',
    'plus':              'ph-plus',
    'log-out':           'ph-sign-out',
    'log-in':            'ph-sign-in',
    'settings':          'ph-gear',
    'filter':            'ph-funnel',
    'banknote':          'ph-money',
    'phone':             'ph-phone',
    'sort-desc':         'ph-sort-descending',
    // категории
    'all':               'ph-squares-four',
    'move':              'ph-truck',
    'build':             'ph-hard-hat',
    'clean':             'ph-broom',
    'event':             'ph-confetti',
    'other':             'ph-lightning',
  };

  function injectCDN() {
    if (document.getElementById('phosphor-css')) return;
    var link = document.createElement('link');
    link.id = 'phosphor-css';
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/@phosphor-icons/web@2.1.1/src/bold/style.css';
    document.head.appendChild(link);
  }

  function icon(name, size, color) {
    var ph = PH[name] || ('ph-' + name);
    var style = '';
    if (size) style += 'font-size:' + size + 'px;';
    if (color) style += 'color:' + color + ';';
    return '<i class="ph-bold ' + ph + '"' +
      (style ? ' style="' + style + '"' : '') +
      ' aria-hidden="true"></i>';
  }

  function renderAll() {
    document.querySelectorAll('[data-icon]').forEach(function (el) {
      var name  = el.getAttribute('data-icon');
      var size  = el.getAttribute('data-size') || null;
      var color = el.getAttribute('data-color') || null;
      el.innerHTML = icon(name, size, color);
      el.style.display = 'inline-flex';
      el.style.alignItems = 'center';
    });
  }

  injectCDN();

  window.ShabashkaIcons = { icon: icon, renderAll: renderAll };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', renderAll);
  } else {
    renderAll();
  }
})();
