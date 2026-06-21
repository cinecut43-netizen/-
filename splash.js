/* splash.js — экран загрузки для Шабашки
   Показывается при первом открытии страницы, плавно исчезает когда DOM готов */

(function() {
  // Создаём сплэш прямо при загрузке скрипта
  var splash = document.createElement('div');
  splash.id = 'shabashka-splash';
  splash.innerHTML = [
    '<div class="splash-inner">',
      '<div class="splash-logo">',
        '<div class="splash-icon">',
          '<svg width="56" height="56" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">',
            '<rect width="56" height="56" rx="16" fill="#E8510A"/>',
            '<path d="M14 28C14 20.268 20.268 14 28 14C35.732 14 42 20.268 42 28" stroke="white" stroke-width="3.5" stroke-linecap="round"/>',
            '<path d="M20 35L28 20L36 35" stroke="white" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>',
            '<path d="M22.5 30H33.5" stroke="white" stroke-width="3" stroke-linecap="round"/>',
          '</svg>',
        '</div>',
        '<div class="splash-name">Шаба<span>шка</span></div>',
        '<div class="splash-tagline">Найди работу рядом</div>',
      '</div>',
      '<div class="splash-dots">',
        '<div class="splash-dot"></div>',
        '<div class="splash-dot"></div>',
        '<div class="splash-dot"></div>',
      '</div>',
    '</div>'
  ].join('');

  var style = document.createElement('style');
  style.textContent = [
    '#shabashka-splash{',
      'position:fixed;inset:0;',
      'background:#fff;',
      'z-index:99999;',
      'display:flex;align-items:center;justify-content:center;',
      'transition:opacity 0.4s ease, transform 0.4s ease;',
    '}',
    '.splash-inner{',
      'display:flex;flex-direction:column;align-items:center;gap:48px;',
    '}',
    '.splash-logo{',
      'display:flex;flex-direction:column;align-items:center;gap:14px;',
      'animation:splashIn 0.5s cubic-bezier(0.34,1.56,0.64,1) both;',
    '}',
    '.splash-icon{',
      'width:80px;height:80px;',
      'border-radius:22px;',
      'background:#E8510A;',
      'display:flex;align-items:center;justify-content:center;',
      'box-shadow:0 8px 32px rgba(232,81,10,0.35);',
    '}',
    '.splash-icon svg{width:48px;height:48px;}',
    '.splash-name{',
      'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;',
      'font-size:36px;font-weight:900;',
      'letter-spacing:-1px;',
      'color:#14151A;',
    '}',
    '.splash-name span{color:#E8510A;}',
    '.splash-tagline{',
      'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;',
      'font-size:15px;color:#9A9A96;font-weight:500;',
    '}',
    '.splash-dots{',
      'display:flex;gap:8px;',
      'animation:splashIn 0.5s 0.2s both;',
    '}',
    '.splash-dot{',
      'width:8px;height:8px;border-radius:50%;',
      'background:#E8510A;opacity:0.3;',
      'animation:splashPulse 1.2s ease-in-out infinite;',
    '}',
    '.splash-dot:nth-child(2){animation-delay:0.2s;}',
    '.splash-dot:nth-child(3){animation-delay:0.4s;}',
    '@keyframes splashIn{',
      'from{opacity:0;transform:translateY(16px) scale(0.95)}',
      'to{opacity:1;transform:translateY(0) scale(1)}',
    '}',
    '@keyframes splashPulse{',
      '0%,100%{opacity:0.3;transform:scale(1)}',
      '50%{opacity:1;transform:scale(1.3)}',
    '}',
    '#shabashka-splash.splash-hide{',
      'opacity:0;',
      'pointer-events:none;',
    '}',
  ].join('');

  document.head.appendChild(style);
  document.body.appendChild(splash);

  function hideSplash() {
    splash.classList.add('splash-hide');
    setTimeout(function() {
      if (splash.parentNode) splash.parentNode.removeChild(splash);
    }, 450);
  }

  // Скрываем когда страница загрузилась
  if (document.readyState === 'complete') {
    setTimeout(hideSplash, 800);
  } else {
    window.addEventListener('load', function() {
      setTimeout(hideSplash, 600);
    });
    // Запасной вариант — максимум 3 секунды
    setTimeout(hideSplash, 3000);
  }
})();
