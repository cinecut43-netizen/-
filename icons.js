/* icons.js — Lucide SVG иконки для Шабашки
   Использование: icon('home', 20, '#6B6B67')
   Все имена иконок: https://lucide.dev/icons */

(function () {
  // Встроенные SVG-пути для часто используемых иконок —
  // это избавляет от зависимости от внешнего CDN при загрузке страницы.
  // Иконки взяты из Lucide 0.383 (MIT licence).
  var ICONS = {
    'home': 'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9 22V12h6v10',
    'layout-dashboard': 'M3 3h7v7H3z M14 3h7v7h-7z M14 14h7v7h-7z M3 14h7v7H3z',
    'clipboard-list': 'M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2 M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2 M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2 M9 12h6 M9 16h6',
    'users': 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M23 21v-2a4 4 0 0 0-3-3.87 M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M16 3.13a4 4 0 0 1 0 7.75',
    'credit-card': 'M1 4h22v16H1z M1 10h22',
    'building-2': 'M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18z M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2 M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2 M10 6h4 M10 10h4 M10 14h4 M10 18h4',
    'trending-up': 'M23 6l-9.5 9.5-5-5L1 18 M17 6h6v6',
    'message-circle': 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z',
    'map': 'M3 7l6-3 6 3 6-3v13l-6 3-6-3-6 3V7z M9 4v13 M15 7v13',
    'user': 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M12 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
    'package': 'M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z M3.27 6.96L12 12.01l8.73-5.05 M12 22.08V12',
    'hammer': 'M15 12l-8.5 8.5a2.12 2.12 0 0 1-3-3L12 9 M17.64 15L22 10.64 M20.35 6.35L17.65 9.05a2.5 2.5 0 0 0 0 3.54l.01.01a2.5 2.5 0 0 0 3.54 0l2.7-2.7a2.5 2.5 0 0 0 0-3.54l-1.3-1.3a2.5 2.5 0 0 0-3.54 0L16.5 7 M5 14l1.5-1.5',
    'sparkles': 'M12 3l1.5 3.5L17 8l-3.5 1.5L12 13l-1.5-3.5L7 8l3.5-1.5z M5 1l.75 1.75L7.5 3.5 5.75 4.25 5 6l-.75-1.75L2.5 3.5l1.75-.75z M19 13l.75 1.75 1.75.75-1.75.75L19 18l-.75-1.75L16.5 15.5l1.75-.75z',
    'zap': 'M13 2L3 14h9l-1 8 10-12h-9l1-8z',
    'flame': 'M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z',
    'search': 'M11 17.25a6.25 6.25 0 1 1 0-12.5 6.25 6.25 0 0 1 0 12.5z M16 16l4.5 4.5',
    'banknote': 'M2 7h20v14H2z M22 11H2 M12 15a2 2 0 1 0 0-4 2 2 0 0 0 0 4z M6 7V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v2',
    'shield-check': 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z M9 12l2 2 4-4',
    'star': 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z',
    'bell': 'M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9 M13.73 21a2 2 0 0 1-3.46 0',
    'camera': 'M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z M12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
    'calendar': 'M3 4h18v18H3z M16 2v4 M8 2v4 M3 10h18',
    'map-pin': 'M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z M12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
    'alert-triangle': 'M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z M12 9v4 M12 17h.01',
    'menu': 'M3 12h18 M3 6h18 M3 18h18',
    'check': 'M20 6L9 17l-5-5',
    'check-circle': 'M22 11.08V12a10 10 0 1 1-5.93-9.14 M22 4L12 14.01l-3-3',
    'arrow-right': 'M5 12h14 M12 5l7 7-7 7',
    'arrow-left': 'M19 12H5 M12 19l-7-7 7-7',
    'x': 'M18 6L6 18 M6 6l12 12',
    'plus': 'M12 5v14 M5 12h14',
    'log-in': 'M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4 M10 17l5-5-5-5 M15 12H3',
    'log-out': 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4 M16 17l5-5-5-5 M21 12H9',
    'settings': 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z',
    'filter': 'M22 3H2l8 9.46V19l4 2v-8.54z',
    'sort-desc': 'M11 5h10 M11 9h7 M11 13h4 M3 4l4 16 M3 4l4 16',
    'phone': 'M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z',
  };

  /* Генерирует SVG-строку для иконки.
     name  — имя иконки из списка выше
     size  — размер в px (по умолчанию 20)
     color — цвет обводки (по умолчанию currentColor — наследует CSS)
  */
  function icon(name, size, color) {
    size = size || 20;
    color = color || 'currentColor';
    var paths = ICONS[name];
    if (!paths) {
      console.warn('[icons.js] Unknown icon:', name);
      return '';
    }
    var pathEls = paths.split(' M ').map(function (p, i) {
      var d = i === 0 ? p : 'M ' + p;
      return '<path d="' + d + '" />';
    }).join('');

    return '<svg xmlns="http://www.w3.org/2000/svg" width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="' + color + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + pathEls + '</svg>';
  }

  /* Заменяет все <i data-icon="name" data-size="20" data-color="#fff"> элементы
     на SVG — удобно для статичного HTML без JS-шаблонизации */
  function renderAll() {
    document.querySelectorAll('[data-icon]').forEach(function (el) {
      var name = el.getAttribute('data-icon');
      var size = parseInt(el.getAttribute('data-size')) || 20;
      var color = el.getAttribute('data-color') || 'currentColor';
      el.innerHTML = icon(name, size, color);
      el.style.display = 'inline-flex';
      el.style.alignItems = 'center';
    });
  }

  window.ShabashkaIcons = { icon: icon, renderAll: renderAll, ICONS: ICONS };

  // Авто-рендер при загрузке DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', renderAll);
  } else {
    renderAll();
  }
})();
