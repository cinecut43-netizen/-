/* splash.js — экран загрузки Шабашки */
(function() {
  var logoSVG = '<svg width="72" height="72" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">' +
    '<rect width="56" height="56" rx="13" fill="#E8510A"/>' +
    '<rect x="8"  y="30" width="8" height="18" rx="1.5" fill="white"/>' +
    '<rect x="24" y="30" width="8" height="18" rx="1.5" fill="white"/>' +
    '<rect x="40" y="30" width="8" height="18" rx="1.5" fill="white"/>' +
    '<rect x="8"  y="44" width="40" height="4"  rx="1.5" fill="white"/>' +
    '<rect x="25.5" y="16" width="5" height="18" rx="2.5" fill="white"/>' +
    '<rect x="15" y="9"  width="26" height="10" rx="4"   fill="white"/>' +
    '<rect x="34" y="7"  width="9"  height="7"  rx="2.5" fill="white"/>' +
  '</svg>';

  var splash = document.createElement('div');
  splash.id = 'shabashka-splash';
  splash.innerHTML =
    '<div class="spl-inner">' +
      '<div class="spl-logo">' +
        '<div class="spl-icon">' + logoSVG + '</div>' +
        '<div class="spl-name">Шаба<span>шка</span></div>' +
        '<div class="spl-tag">работа есть всегда</div>' +
      '</div>' +
      '<div class="spl-dots">' +
        '<div class="spl-dot"></div>' +
        '<div class="spl-dot"></div>' +
        '<div class="spl-dot"></div>' +
      '</div>' +
    '</div>';

  var style = document.createElement('style');
  style.textContent =
    '#shabashka-splash{position:fixed;inset:0;background:#14151A;z-index:99999;display:flex;align-items:center;justify-content:center;transition:opacity 0.4s ease;}' +
    '.spl-inner{display:flex;flex-direction:column;align-items:center;gap:52px;}' +
    '.spl-logo{display:flex;flex-direction:column;align-items:center;gap:18px;animation:spl-in 0.5s cubic-bezier(0.34,1.56,0.64,1) both;}' +
    '.spl-icon{width:96px;height:96px;border-radius:24px;background:#E8510A;display:flex;align-items:center;justify-content:center;box-shadow:0 12px 40px rgba(232,81,10,0.45);}' +
    '.spl-icon svg{width:72px;height:72px;}' +
    '.spl-name{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;font-size:42px;font-weight:900;letter-spacing:-1.5px;color:#fff;}' +
    '.spl-name span{color:#E8510A;}' +
    '.spl-tag{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;font-size:14px;color:rgba(255,255,255,0.4);letter-spacing:2px;text-transform:lowercase;font-weight:400;}' +
    '.spl-dots{display:flex;gap:10px;animation:spl-in 0.5s 0.15s both;}' +
    '.spl-dot{width:8px;height:8px;border-radius:50%;background:#E8510A;opacity:0.4;animation:spl-pulse 1.2s ease-in-out infinite;}' +
    '.spl-dot:nth-child(2){animation-delay:0.2s;}' +
    '.spl-dot:nth-child(3){animation-delay:0.4s;}' +
    '@keyframes spl-in{from{opacity:0;transform:translateY(20px) scale(0.93)}to{opacity:1;transform:translateY(0) scale(1)}}' +
    '@keyframes spl-pulse{0%,100%{opacity:0.4;transform:scale(1)}50%{opacity:1;transform:scale(1.4)}}' +
    '#shabashka-splash.spl-hide{opacity:0;pointer-events:none;}';

  document.head.appendChild(style);
  document.body.appendChild(splash);

  function hide() {
    splash.classList.add('spl-hide');
    setTimeout(function(){ if(splash.parentNode) splash.parentNode.removeChild(splash); }, 450);
  }

  if (document.readyState === 'complete') {
    setTimeout(hide, 700);
  } else {
    window.addEventListener('load', function(){ setTimeout(hide, 500); });
    setTimeout(hide, 3000);
  }
})();
