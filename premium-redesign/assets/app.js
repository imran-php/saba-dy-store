'use strict';
(() => {
  const DAY = 86400000;
  const CART_KEY = 'saba-dy-premium-cart';
  const NOTICE_KEY = 'saba-dy-premium-notice';
  const products = {
    lavender: { name: 'Лаванда и мёд', price: 350, image: 'assets/images/lavender.webp', note: 'Травяной аромат с тёплыми медовыми нотами.', description: 'Нежное мыло с экстрактом лаванды и натуральным мёдом для вашего ежедневного ритуала.', composition: 'Оливковое масло, кокосовое масло, лавандовое масло, натуральный мёд, луговой мёд.', usage: 'Нанесите на влажную кожу, вспеньте и смойте тёплой водой. Перед применением ознакомьтесь с составом.' },
    rose: { name: 'Роза и молоко', price: 420, image: 'assets/images/rose.webp', note: 'Цветочный аромат и нежная кремовая пена.', description: 'Кремовое мыло с розовым маслом и молочными протеинами. Небольшое удовольствие, которое всегда под рукой.', composition: 'Масло ши, миндальное масло, розовое масло, молочные протеины, глицерин.', usage: 'Массирующими движениями нанесите на влажную кожу и смойте водой. Не используйте при непереносимости компонентов.' }
  };
  const money = value => new Intl.NumberFormat('ru-RU').format(value) + ' ₽';
  const icon = name => `<span class="icon ${name}" aria-hidden="true"></span>`;
  const read = key => { try { return JSON.parse(localStorage.getItem(key)); } catch { return null; } };
  const remove = key => { try { localStorage.removeItem(key); } catch { /* Browsing still works with storage blocked. */ } };
  let storageAvailable = true;
  const write = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch { storageAvailable = false; } };
  let cart = {};
  const saved = read(CART_KEY);
  if (saved && saved.expires > Date.now() && saved.items && typeof saved.items === 'object') {
    for (const id of Object.keys(products)) {
      const qty = saved.items[id];
      if (Number.isInteger(qty) && qty > 0 && qty <= 99) cart[id] = qty;
    }
  } else remove(CART_KEY);
  const count = () => Object.values(cart).reduce((a, b) => a + b, 0);
  const total = () => Object.entries(cart).reduce((sum, [id, qty]) => sum + products[id].price * qty, 0);
  const saveCart = () => {
    if (count()) write(CART_KEY, { items: cart, expires: Date.now() + 30 * DAY });
    else remove(CART_KEY);
  };
  let toastTimer;
  function toast(text) {
    const el = document.querySelector('.toast');
    if (!el) return;
    el.textContent = text;
    el.classList.add('visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('visible'), 2800);
  }
  function openDialog(id) {
    const dialog = document.getElementById(id);
    if (!dialog || dialog.open) return;
    document.querySelectorAll('dialog[open]').forEach(el => el.close());
    dialog.showModal();
    document.body.classList.add('has-dialog');
  }
  function cartRow(id, qty, editable = true) {
    const p = products[id];
    return `<article class="cart-item"><img src="${p.image}" alt="${p.name}" width="85" height="85"><div><h3>${p.name}</h3><p class="cart-item-price">${money(p.price)}${editable ? '' : ` × ${qty}`}</p>${editable ? `<div class="cart-item-bottom"><div class="quantity"><button type="button" data-decrease="${id}" aria-label="Уменьшить количество: ${p.name}">${icon('minus')}</button><output aria-label="Количество: ${p.name}">${qty}</output><button type="button" data-increase="${id}" aria-label="Увеличить количество: ${p.name}" ${qty >= 99 ? 'disabled' : ''}>${icon('plus')}</button></div><button class="remove-item" type="button" data-remove="${id}" aria-label="Удалить ${p.name}">Убрать</button></div>` : ''}</div></article>`;
  }
  function renderCart() {
    document.querySelectorAll('.cart-count').forEach(el => el.textContent = count());
    document.querySelectorAll('[data-open-cart]').forEach(el => el.setAttribute('aria-label', `Открыть корзину, товаров: ${count()}`));
    const el = document.getElementById('cart-content');
    if (!el) return;
    if (!count()) {
      el.innerHTML = `<div class="cart-empty">${icon('bag')}<h3>Здесь будет ваша забота</h3><p>Добавьте аромат, который хочется забрать с собой.</p><button type="button" class="button primary" data-close-dialog>Посмотреть коллекцию${icon('arrow-right')}</button></div>`;
      return;
    }
    el.innerHTML = Object.entries(cart).map(([id, qty]) => cartRow(id, qty)).join('') + `<div class="cart-total"><span>Итого</span><span>${money(total())}</span></div><p class="cart-footnote">Доставка рассчитывается на следующем шаге. Это демонстрация: реальные заказы и платежи не создаются.</p>${storageAvailable ? '<a class="button primary cart-checkout" href="checkout.html">Перейти к оформлению' + icon('arrow-right') + '</a>' : '<p class="cart-footnote">Хранилище браузера отключено. Корзина работает в этой вкладке. Разрешите локальное хранение для перехода к демонстрационному оформлению.</p>'}`;
  }
  function renderProduct(id) {
    const p = products[id];
    if (!p) return;
    document.getElementById('product-detail').innerHTML = `<img class="detail-image" src="${p.image}" alt="${p.name}" width="600" height="700"><div class="detail-copy"><h2 id="product-dialog-title">${p.name}</h2><span class="price">${money(p.price)}</span><p>${p.description}</p><h3>Состав</h3><p>${p.composition}</p><h3>Как использовать</h3><p>${p.usage}</p><button type="button" class="button primary" data-add="${id}">Добавить в корзину${icon('plus')}</button><p class="concept-caption">Концептуальное изображение. Состав и цена взяты из исходного каталога; перед покупкой уточните информацию на этикетке.</p></div>`;
    openDialog('product-dialog');
  }
  function noticeState() {
    const savedNotice = read(NOTICE_KEY);
    const acknowledged = savedNotice && savedNotice.version === 1 && savedNotice.expires > Date.now();
    if (!acknowledged) remove(NOTICE_KEY);
    document.querySelectorAll('.cookie-notice').forEach(el => el.hidden = Boolean(acknowledged));
  }
  function changeQuantity(id, delta) {
    if (!products[id]) return;
    const next = Math.max(0, Math.min(99, (cart[id] || 0) + delta));
    if (next) cart[id] = next;
    else delete cart[id];
    saveCart();
    renderCart();
    toast(next ? `${products[id].name}: ${next} шт.` : 'Товар убран из корзины');
  }
  document.addEventListener('click', event => {
    const el = event.target.closest('button, a');
    if (!el) return;
    if (el.hasAttribute('data-open-cart')) { renderCart(); openDialog('cart-dialog'); }
    if (el.hasAttribute('data-close-dialog')) el.closest('dialog')?.close();
    if (el.hasAttribute('data-open-menu')) openDialog('menu-dialog');
    if (el.hasAttribute('data-open-privacy')) openDialog('privacy-dialog');
    if (el.dataset.product) renderProduct(el.dataset.product);
    if (el.dataset.add && products[el.dataset.add]) {
      const id = el.dataset.add;
      if ((cart[id] || 0) >= 99) { toast('Максимум 99 штук одного товара'); return; }
      changeQuantity(id, 1);
      const previous = el.innerHTML;
      el.innerHTML = `Добавлено ${icon('check')}`;
      el.disabled = true;
      setTimeout(() => { el.innerHTML = previous; el.disabled = false; }, 900);
    }
    if (el.dataset.increase || el.dataset.decrease) {
      const attr = el.dataset.increase ? 'data-increase' : 'data-decrease';
      const id = el.dataset.increase || el.dataset.decrease;
      changeQuantity(id, el.dataset.increase ? 1 : -1);
      document.querySelector(`[${attr}="${id}"]`)?.focus();
    }
    if (el.dataset.remove) { delete cart[el.dataset.remove]; saveCart(); renderCart(); document.querySelector('#cart-dialog [data-close-dialog]')?.focus(); toast('Товар убран из корзины'); }
    if (el.dataset.filter) {
      document.querySelectorAll('[data-filter]').forEach(btn => { const active = btn === el; btn.classList.toggle('active', active); btn.setAttribute('aria-pressed', String(active)); });
      let n = 0;
      document.querySelectorAll('.product-card').forEach(card => { const visible = el.dataset.filter === 'all' || card.dataset.category === el.dataset.filter; card.hidden = !visible; if (visible) { card.classList.add('in-view'); n++; } });
      document.querySelector('.result-count').textContent = n === 1 ? '1 аромат' : `${n} аромата`;
    }
    if (el.hasAttribute('data-dismiss-notice')) {
      write(NOTICE_KEY, { version: 1, expires: Date.now() + 180 * DAY });
      document.querySelector('.cookie-notice').hidden = true;
    }
    if (el.hasAttribute('data-clear-storage')) {
      cart = {}; remove(CART_KEY); remove(NOTICE_KEY); renderCart(); noticeState();
      document.querySelector('.storage-status').textContent = 'Корзина и отметка уведомления очищены.';
    }
    if (el.classList.contains('theme-toggle')) {
      const current = document.documentElement.dataset.theme || (matchMedia('(prefers-color-scheme:dark)').matches ? 'dark' : 'light');
      const next = current === 'dark' ? 'light' : 'dark';
      document.documentElement.dataset.theme = next;
      document.querySelectorAll('.theme-toggle').forEach(btn => { btn.setAttribute('aria-label', next === 'dark' ? 'Включить светлую тему' : 'Включить тёмную тему'); const glyph = btn.querySelector('.icon'); if (glyph) glyph.className = `icon ${next === 'dark' ? 'sun' : 'moon'}`; });
    }
    if (el.closest('#menu-dialog nav')) el.closest('dialog').close();
  });
  document.querySelectorAll('dialog').forEach(dialog => {
    dialog.addEventListener('close', () => { if (!document.querySelector('dialog[open]')) document.body.classList.remove('has-dialog'); });
    dialog.addEventListener('click', event => {
      const r = dialog.getBoundingClientRect();
      if (event.target === dialog && (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom)) dialog.close();
    });
  });
  document.querySelectorAll('.desktop-nav a').forEach(link => link.addEventListener('click', () => { document.querySelector('.desktop-nav .active')?.classList.remove('active'); link.classList.add('active'); }));
  if ('IntersectionObserver' in window) {
    document.documentElement.classList.add('js');
    const observer = new IntersectionObserver(entries => entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('in-view'); observer.unobserve(entry.target); } }), { threshold: .08 });
    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
  }
  const summary = document.getElementById('checkout-items');
  if (summary) {
    if (!count()) {
      document.querySelector('.checkout-layout').hidden = true;
      document.querySelector('#checkout-empty').hidden = false;
    } else {
      summary.innerHTML = Object.entries(cart).map(([id, qty]) => cartRow(id, qty, false)).join('');
      const prices = { pickup: 0, courier: 300, cdek: 0, ozon: 220 };
      const updateSummary = () => {
        const method = document.querySelector('input[name="delivery"]:checked').value;
        document.getElementById('subtotal').textContent = money(total());
        document.getElementById('delivery-amount').textContent = method === 'cdek' ? 'При получении' : money(prices[method]);
        document.getElementById('checkout-total').textContent = money(total() + prices[method]);
        document.getElementById('delivery-note').textContent = method === 'cdek' ? 'Стоимость доставки СДЭК оплачивается отдельно и не входит в итог.' : method === 'courier' ? 'В примере показана доставка в черте города. Отдалённые районы согласовываются отдельно.' : 'Итог рассчитан для демонстрации интерфейса.';
      };
      document.querySelectorAll('input[name="delivery"]').forEach(input => input.addEventListener('change', updateSummary));
      updateSummary();
      document.getElementById('demo-order').addEventListener('click', () => {
        // Deliberately no request, no payment SDK, no contact data, no production endpoint.
        document.querySelector('.checkout-heading').hidden = true;
        document.querySelector('.checkout-layout').hidden = true;
        const success = document.getElementById('checkout-success');
        success.hidden = false;
        success.querySelector('h1').focus();
      });
    }
  }
  renderCart(); noticeState();
})();
