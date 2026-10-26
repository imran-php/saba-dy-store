(() => {
    'use strict';
    const key = 'saba-dy-cookie-notice';
    const version = '2026-09-27';
    let acknowledged = false;
    try {
        const value = JSON.parse(localStorage.getItem(key) || 'null');
        acknowledged = !!value && value.version === version && Number(value.expires) > Date.now();
        if (!acknowledged) localStorage.removeItem(key);
        const expiry = Number(localStorage.getItem('saba-dy-cart-expires'));
        if (expiry && expiry <= Date.now()) {
            localStorage.removeItem('saba-dy-cart');
            localStorage.removeItem('saba-dy-cart-expires');
        }
    } catch (_) { /* Show notice when storage is blocked or malformed. */ }
    const notice = document.createElement('section');
    notice.className = 'cookie-notice';
    notice.setAttribute('aria-label', 'Cookies и данные браузера');
    notice.innerHTML = '<h2>Корзина остаётся с вами</h2><p>Мы сохраняем товары в вашем браузере, чтобы они не терялись между посещениями. Используем только техническое хранилище — без рекламных cookies и аналитики. <a href="/cookies.html">Подробнее о данных</a></p><div class="cookie-actions"><button type="button" class="cookie-primary" data-ack>Понятно</button><button type="button" data-settings>Данные браузера</button></div>';
    notice.hidden = acknowledged;
    document.body.append(notice);
    const dialog = document.createElement('dialog');
    dialog.className = 'cookie-dialog';
    dialog.setAttribute('aria-labelledby', 'cookie-dialog-title');
    dialog.innerHTML = '<h2 id="cookie-dialog-title">Данные в вашем браузере</h2><p><strong>Техническое хранение</strong><br>Корзина — до 30 дней после изменения. Отметка о прочтении уведомления — до 180 дней.</p><p><strong>Аналитика и реклама</strong><br>Не подключены. Кнопка «Понятно» не даёт согласия на их использование.</p><p>Можно очистить корзину на этом устройстве. Это не отменит уже оформленные заказы.</p><a href="/cookies.html">Политика cookies</a><p role="status" data-status></p><div class="cookie-actions"><button type="button" data-clear>Очистить корзину</button><button type="button" data-close autofocus>Закрыть</button></div>';
    document.body.append(dialog);
    function openSettings() { dialog.querySelector('[data-status]').textContent = ''; dialog.showModal(); }
    document.querySelectorAll('[data-cookie-settings]').forEach(button => button.addEventListener('click', openSettings));
    notice.querySelector('[data-settings]').addEventListener('click', openSettings);
    notice.querySelector('[data-ack]').addEventListener('click', () => {
        try { localStorage.setItem(key, JSON.stringify({ version, expires: Date.now() + 180 * 86400000 })); } catch (_) {}
        notice.hidden = true;
        document.querySelector('[data-cookie-settings]')?.focus({ preventScroll: true });
    });
    dialog.querySelector('[data-close]').addEventListener('click', () => dialog.close());
    dialog.querySelector('[data-clear]').addEventListener('click', () => {
        let storageCleared = true;
        try { localStorage.removeItem('saba-dy-cart'); localStorage.removeItem('saba-dy-cart-expires'); } catch (_) { storageCleared = false; }
        if (typeof cart !== 'undefined') {
            cart.items = [];
            cart.updateCartUI();
            if (typeof renderOrderSummary === 'function') renderOrderSummary();
        }
        dialog.querySelector('[data-status]').textContent = storageCleared ? 'Корзина на этом устройстве очищена.' : 'Браузер ограничил доступ к хранилищу. Удалите данные сайта в настройках браузера.';
    });
})();
