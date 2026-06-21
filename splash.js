(function() {
  var splash = document.createElement('div');
  splash.id = 'shb-splash';
  splash.innerHTML =
    '<div class="shb-inner">' +
      '<div class="shb-logo">' +
        '<img class="shb-icon" src="/logo-icon.png" alt="Шабашка"/>' +
        '<div class="shb-name">\u0428\u0430\u0431\u0430<span>\u0448\u043a\u0430</span></div>' +
        '<div class="shb-tag">\u0440\u0430\u0431\u043e\u0442\u0430 \u0435\u0441\u0442\u044c \u0432\u0441\u0435\u0433\u0434\u0430</div>' +
      '</div>' +
      '<div class="shb-dots"><i></i><i></i><i></i></div>' +
    '</div>';

  var s = document.createElement('style');
  s.textContent =
    '#shb-splash{position:fixed;inset:0;background:#14151A;z-index:99999;display:flex;align-items:center;justify-content:center;transition:opacity .4s ease}' +
    '.shb-inner{display:flex;flex-direction:column;align-items:center;gap:44px}' +
    '.shb-logo{display:flex;flex-direction:column;align-items:center;gap:18px;animation:shb-up .5s cubic-bezier(.34,1.56,.64,1) both}' +
    '.shb-icon{width:110px;height:110px;border-radius:26px;object-fit:cover;box-shadow:0 12px 40px rgba(232,81,10,.35)}' +
    '.shb-name{font-family:-apple-system,BlinkMacSystemFont,sans-serif;font-size:44px;font-weight:900;letter-spacing:-1.5px;color:#fff;margin:0}' +
    '.shb-name span{color:#E8510A}' +
    '.shb-tag{font-family:-apple-system,BlinkMacSystemFont,sans-serif;font-size:13px;color:rgba(255,255,255,.35);letter-spacing:3px;margin:0}' +
    '.shb-dots{display:flex;gap:10px;animation:shb-up .5s .15s both}' +
    '.shb-dots i{display:block;width:8px;height:8px;border-radius:50%;background:#E8510A;opacity:.4;font-style:normal;animation:shb-p 1.2s ease-in-out infinite}' +
    '.shb-dots i:nth-child(2){animation-delay:.2s}' +
    '.shb-dots i:nth-child(3){animation-delay:.4s}' +
    '@keyframes shb-up{from{opacity:0;transform:translateY(18px) scale(.94)}to{opacity:1;transform:none}}' +
    '@keyframes shb-p{0%,100%{opacity:.4;transform:scale(1)}50%{opacity:1;transform:scale(1.4)}}' +
    '#shb-splash.shb-out{opacity:0;pointer-events:none}';

  document.head.appendChild(s);
  document.body.appendChild(splash);

  function hide() {
    splash.classList.add('shb-out');
    setTimeout(function(){ splash.parentNode && splash.parentNode.removeChild(splash); }, 450);
  }

  if (document.readyState === 'complete') { setTimeout(hide, 700); }
  else { window.addEventListener('load', function(){ setTimeout(hide, 500); }); }
  setTimeout(hide, 3000);
})();
