// admin-auth.js — защита страниц админки
(function() {
  var ADMIN_KEY = 'shabashka_admin_auth';
  var ADMIN_PASS = 'shabashka_admin_2025'; // временный пароль

  function isAuthed() {
    return sessionStorage.getItem(ADMIN_KEY) === '1';
  }

  function showLoginScreen() {
    document.body.innerHTML = '';
    var div = document.createElement('div');
    div.style.cssText = 'position:fixed;inset:0;background:#14151A;display:flex;align-items:center;justify-content:center;font-family:-apple-system,sans-serif';
    div.innerHTML =
      '<div style="background:#1E1E1C;border-radius:20px;padding:36px 32px;width:340px;text-align:center">' +
        '<div style="font-size:32px;margin-bottom:8px">🔐</div>' +
        '<div style="font-size:20px;font-weight:800;color:#fff;margin-bottom:4px">Шабашка Админ</div>' +
        '<div style="font-size:13px;color:rgba(255,255,255,.4);margin-bottom:24px">Введите пароль для доступа</div>' +
        '<input id="adminPass" type="password" placeholder="Пароль" ' +
          'style="width:100%;padding:13px 16px;background:rgba(255,255,255,.07);border:1.5px solid rgba(255,255,255,.1);border-radius:12px;color:#fff;font-size:16px;font-family:inherit;outline:none;text-align:center;margin-bottom:12px" ' +
          'onkeydown="if(event.key===\'Enter\')checkPass()">' +
        '<div id="adminErr" style="color:#FF6B6B;font-size:13px;margin-bottom:12px;display:none">Неверный пароль</div>' +
        '<button onclick="checkPass()" ' +
          'style="width:100%;padding:14px;background:#E8510A;color:#fff;border:none;border-radius:12px;font-size:15px;font-weight:700;cursor:pointer;font-family:inherit">' +
          'Войти' +
        '</button>' +
      '</div>';
    document.body.appendChild(div);

    window.checkPass = function() {
      var val = document.getElementById('adminPass').value;
      if (val === ADMIN_PASS) {
        sessionStorage.setItem(ADMIN_KEY, '1');
        window.location.reload();
      } else {
        var err = document.getElementById('adminErr');
        err.style.display = 'block';
        document.getElementById('adminPass').value = '';
        document.getElementById('adminPass').style.borderColor = '#FF6B6B';
        setTimeout(function(){ err.style.display = 'none'; document.getElementById('adminPass').style.borderColor = 'rgba(255,255,255,.1)'; }, 2000);
      }
    };
  }

  if (!isAuthed()) {
    document.addEventListener('DOMContentLoaded', showLoginScreen);
    // Если DOM уже загружен
    if (document.readyState !== 'loading') showLoginScreen();
  }
})();
