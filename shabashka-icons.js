// Кастомные SVG иконки Шабашки
// Использование: shIcon('home') → <svg>...</svg>
// Или: shIcon('home', 'color:#E8510A;width:28px')

(function() {
  // Загружаем спрайт в DOM
  function loadSprite() {
    if (document.getElementById('shabashka-sprite')) return;
    fetch('/icons/sprite.svg')
      .then(function(r){ return r.text(); })
      .then(function(svg){
        var div = document.createElement('div');
        div.id = 'shabashka-sprite';
        div.style.display = 'none';
        div.innerHTML = svg;
        document.body.insertBefore(div, document.body.firstChild);
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadSprite);
  } else {
    loadSprite();
  }

  // Функция для использования иконки в HTML
  window.shIcon = function(name, style, size) {
    size = size || 24;
    style = style || '';
    return '<svg width="' + size + '" height="' + size + '" style="' + style + '" aria-hidden="true">' +
      '<use href="/icons/sprite.svg#icon-' + name + '"/>' +
    '</svg>';
  };

  // Заменяем Phosphor иконки навигации на кастомные
  window.ShabashkaIcons = {
    home:         function(s){ return window.shIcon('home', s); },
    chat:         function(s){ return window.shIcon('chat', s); },
    profile:      function(s){ return window.shIcon('profile', s); },
    wallet:       function(s){ return window.shIcon('wallet', s); },
    search:       function(s){ return window.shIcon('search', s); },
    bell:         function(s){ return window.shIcon('bell', s); },
    orders:       function(s){ return window.shIcon('orders', s); },
    myOrders:     function(s){ return window.shIcon('my-orders', s); },
    workers:      function(s){ return window.shIcon('workers', s); },
    location:     function(s){ return window.shIcon('location', s); },
    history:      function(s){ return window.shIcon('history', s); },
    settings:     function(s){ return window.shIcon('settings', s); },
    support:      function(s){ return window.shIcon('support', s); },
    responses:    function(s){ return window.shIcon('responses', s); },
  };
})();
