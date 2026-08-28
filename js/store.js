(() => {
  'use strict';

  const { createClient } = window.supabase || {};
  const cfg = window.ISA_CONFIG || {};
  const ready = Boolean(createClient && cfg.SUPABASE_URL && !cfg.SUPABASE_URL.includes('COLE_SUA_') && cfg.SUPABASE_PUBLISHABLE_KEY && !cfg.SUPABASE_PUBLISHABLE_KEY.includes('COLE_SUA_'));
  const supabase = ready ? createClient(cfg.SUPABASE_URL, cfg.SUPABASE_PUBLISHABLE_KEY, {
    auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: true }
  }) : null;

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const money = (value) => Number(value || 0).toLocaleString('pt-BR', { style:'currency', currency:'BRL' });
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (m) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const safeJSON = (value, fallback) => { try { return value ? JSON.parse(value) : fallback; } catch { return fallback; } };

  let products = [];
  let settings = { store_name: 'Isa Closet', whatsapp: '' };
  let filter = 'Todos';
  let cart = safeJSON(localStorage.getItem('isaClosetCart'), []);
  if (!Array.isArray(cart)) cart = [];
  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  function showConfigError(message) {
    const empty = $('#emptyState');
    if (empty) {
      empty.hidden = false;
      empty.innerHTML = `<strong>Configuração pendente.</strong><span>${esc(message)}</span>`;
    }
  }

  function productPrice(product) {
    return product.promo !== null && product.promo !== undefined && Number(product.promo) > 0 ? Number(product.promo) : Number(product.price);
  }

  function normalizeProduct(row) {
    const images = Array.isArray(row.images) ? row.images : [];
    return {
      ...row,
      price: Number(row.price || 0),
      promo: row.promo === null || row.promo === undefined ? null : Number(row.promo),
      sizes: Array.isArray(row.sizes) ? row.sizes : [],
      images
    };
  }

  async function loadCatalog() {
    if (!supabase) {
      showConfigError('Defina SUPABASE_URL e SUPABASE_PUBLISHABLE_KEY em js/config.js.');
      return;
    }
    const [{ data: productRows, error: productError }, { data: settingRows, error: settingsError }] = await Promise.all([
      supabase.from('products').select('*').eq('active', true).order('display_order', { ascending: true }).order('created_at', { ascending: false }),
      supabase.from('store_settings').select('store_name,whatsapp').eq('id', 1).maybeSingle()
    ]);
    if (productError) {
      console.error(productError);
      showConfigError('Não foi possível carregar o catálogo. Confira a configuração do Supabase e as políticas RLS.');
      return;
    }
    if (settingsError) console.warn(settingsError);
    products = (productRows || []).map(normalizeProduct);
    settings = settingRows || settings;
    document.title = `${settings.store_name || 'Isa Closet'} | Moda feminina`;
    renderCatalog();
  }

  function imageSrc(image, fallback = 'assets/demo/look-verde.webp') {
    if (!image) return fallback;
    return typeof image === 'string' ? image : (image.url || fallback);
  }

  function bindImageFallbacks(root = document) {
    $$('img[data-fallback]', root).forEach(img => {
      img.addEventListener('error', () => {
        if (img.src.endsWith(img.dataset.fallback)) return;
        img.src = img.dataset.fallback;
      }, { once: true });
    });
  }

  function productCard(product) {
    const image = imageSrc(product.images?.[0]);
    const promo = product.promo !== null && product.promo !== undefined && Number(product.promo) > 0;
    return `<article class="product-card">
      <button class="product-image-wrap" data-product="${esc(product.id)}" aria-label="Ver ${esc(product.name)}">
        <img class="product-image" loading="lazy" src="${esc(image)}" data-fallback="assets/demo/look-verde.webp" alt="${esc(product.name)}">
      </button>
      <div class="product-info">
        <span class="product-category">${esc(product.category)}</span>
        <h3 class="product-name">${esc(product.name)}</h3>
        ${promo ? '<span class="sale-badge">Promoção</span>' : ''}
        <div class="price-row">${promo ? `<span class="old-price">${money(product.price)}</span>` : ''}<span class="price">${money(productPrice(product))}</span></div>
        <div class="card-actions">
          <button class="ghost-btn quick-add" data-product="${esc(product.id)}" type="button">Adicionar</button>
          <button class="primary-btn open-product" data-product="${esc(product.id)}" type="button">Detalhes</button>
        </div>
      </div>
    </article>`;
  }

  function renderFilters() {
    const cats = ['Todos', ...new Set(products.map(p => p.category).filter(Boolean))];
    const el = $('#filters');
    if (!el) return;
    el.innerHTML = cats.map(category => `<button class="filter-btn ${filter === category ? 'active' : ''}" type="button" data-filter="${esc(category)}">${esc(category)}</button>`).join('');
    $$('.filter-btn', el).forEach(button => button.addEventListener('click', () => { filter = button.dataset.filter; renderCatalog(); }));
  }

  function bindProductButtons() {
    $$('.open-product, .product-image-wrap').forEach(button => {
      button.addEventListener('click', () => openProduct(button.dataset.product));
    });
    $$('.quick-add').forEach(button => {
      button.addEventListener('click', () => openProduct(button.dataset.product));
    });
  }

  function renderFeatured() {
    const el = $('#featuredGrid');
    if (!el) return;
    el.innerHTML = products.slice(0, 3).map(productCard).join('');
    bindProductButtons();
  }

  function renderCatalog() {
    renderFilters();
    const visible = products.filter(product => filter === 'Todos' || product.category === filter);
    $('#productGrid').innerHTML = visible.map(productCard).join('');
    $('#emptyState').hidden = visible.length !== 0;
    bindProductButtons();
    renderFeatured();
    updateCartCount();
    animateStore();
  }

  function openProduct(id) {
    const product = products.find(item => item.id === id);
    if (!product) return;
    const modal = $('#modalContent');
    const gallery = (product.images?.length ? product.images : ['assets/demo/look-verde.webp'])
      .map(image => `<img loading="lazy" src="${esc(imageSrc(image))}" alt="${esc(product.name)}">`).join('');
    const sizes = product.sizes?.length ? product.sizes : ['P','M','G'];
    const promo = product.promo !== null && product.promo !== undefined && Number(product.promo) > 0;

    modal.innerHTML = `<div class="product-detail">
      <div class="detail-gallery">${gallery}</div>
      <div class="detail-copy">
        <p class="eyebrow">${esc(product.category)}</p>
        <h2>${esc(product.name)}</h2>
        ${promo ? `<div class="price-row"><span class="old-price">${money(product.price)}</span><span class="price">${money(product.promo)}</span></div>` : `<div class="price">${money(product.price)}</div>`}
        <p>${esc(product.description || 'Uma peça pensada para combinar com diferentes momentos.')}</p>
        <div class="notice" id="sizeNotice">Selecione o tamanho antes de adicionar à sacola.</div>
        <div class="size-select">${sizes.map(size => `<button class="size-chip" type="button" data-size="${esc(size)}">${esc(size)}</button>`).join('')}</div>
        <button class="primary-btn full" id="modalAdd" type="button">Adicionar à sacola</button>
      </div>
    </div>`;

    document.body.classList.add('product-open', 'is-locked');
    $('#productModal').setAttribute('aria-hidden', 'false');
    let selectedSize = '';
    $$('.size-chip', modal).forEach(button => button.addEventListener('click', () => {
      $$('.size-chip', modal).forEach(item => item.classList.remove('selected'));
      button.classList.add('selected');
      selectedSize = button.dataset.size;
      $('#sizeNotice').textContent = `Tamanho selecionado: ${selectedSize}`;
    }));
    $('#modalAdd').addEventListener('click', () => {
      if (!selectedSize) { $('#sizeNotice').textContent = 'Escolha um tamanho para continuar.'; return; }
      addToCart(product, selectedSize);
      closeProductModal();
      openCart();
    });
  }

  function closeProductModal() {
    document.body.classList.remove('product-open');
    if (!document.body.classList.contains('cart-open') && !document.body.classList.contains('menu-open')) document.body.classList.remove('is-locked');
    $('#productModal').setAttribute('aria-hidden', 'true');
  }

  function persistCart() { localStorage.setItem('isaClosetCart', JSON.stringify(cart)); updateCartCount(); }
  function updateCartCount() {
    const count = cart.reduce((total, item) => total + item.qty, 0);
    $('#cartCount').textContent = count;
  }

  function addToCart(product, size) {
    const key = `${product.id}_${size}`;
    const existing = cart.find(item => item.key === key);
    if (existing) existing.qty += 1;
    else cart.push({ key, id: product.id, name: product.name, size, qty: 1, price: productPrice(product), image: imageSrc(product.images?.[0]) });
    persistCart();
  }

  function renderCart() {
    const container = $('#cartItems');
    if (!cart.length) {
      container.innerHTML = '<div class="empty-state"><strong>Sua sacola está vazia.</strong><span>Escolha uma peça linda para começar.</span></div>';
      $('#cartTotal').textContent = money(0);
      return;
    }
    container.innerHTML = cart.map((item, index) => `<div class="cart-item">
      <img src="${esc(item.image)}" data-fallback="assets/demo/look-verde.webp" alt="${esc(item.name)}">
      <div><h4>${esc(item.name)}</h4><div class="cart-meta">Tamanho ${esc(item.size)} • ${money(item.price)}</div>
        <div class="qty-row"><button type="button" data-cart="${index}" data-act="minus">−</button><strong>${item.qty}</strong><button type="button" data-cart="${index}" data-act="plus">+</button></div>
      </div>
      <button class="cart-remove" type="button" data-cart="${index}" data-act="remove">remover</button>
    </div>`).join('');
    $$('[data-cart]', container).forEach(button => button.addEventListener('click', () => {
      const index = Number(button.dataset.cart); const action = button.dataset.act;
      if (action === 'plus') cart[index].qty += 1;
      if (action === 'minus') cart[index].qty -= 1;
      if (action === 'remove' || cart[index]?.qty <= 0) cart.splice(index, 1);
      persistCart(); renderCart();
    }));
    const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
    $('#cartTotal').textContent = money(total);
  }

  function openCart() {
    closeMenu();
    document.body.classList.add('cart-open','is-locked');
    $('#cartDrawer').setAttribute('aria-hidden','false');
    renderCart();
  }
  function closeCart() {
    document.body.classList.remove('cart-open');
    if (!document.body.classList.contains('product-open') && !document.body.classList.contains('menu-open')) document.body.classList.remove('is-locked');
    $('#cartDrawer').setAttribute('aria-hidden','true');
  }

  function checkout() {
    if (!cart.length) { alert('Sua sacola está vazia.'); return; }
    const phone = String(settings.whatsapp || '').replace(/\D/g, '');
    if (phone.length < 10) { alert('O WhatsApp da loja ainda não foi configurado no painel administrativo.'); return; }
    const lines = cart.map(item => `• ${item.name} | Tamanho ${item.size} | Qtd ${item.qty} | ${money(item.price * item.qty)}`).join('\n');
    const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
    const message = `Olá! Quero fazer um pedido na ${settings.store_name || 'Isa Closet'}:\n\n${lines}\n\nTotal: ${money(total)}\n\nPode me confirmar a disponibilidade?`;
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    const opened = window.open(url, '_blank', 'noopener,noreferrer');
    if (!opened) location.href = url;
  }

  function nextRandomVideo() { return Math.floor(Math.random() * 5) + 1; }
  function initVideo() {
    const video = $('#heroVideo');
    if (!video) return;
    let last = 0;
    const setVideo = async () => {
      let n = nextRandomVideo();
      if (n === last) n = (n % 5) + 1;
      last = n;
      video.src = `assets/videos/${String(n).padStart(3,'0')}.mp4`;
      video.load();
      try { await video.play(); } catch { /* autoplay may be blocked */ }
    };
    video.addEventListener('ended', setVideo);
    setVideo();
  }

  function openMenu() {
    closeCart();
    document.body.classList.add('menu-open','is-locked');
    $('#menuButton').setAttribute('aria-expanded','true');
    $('#mobileMenu').setAttribute('aria-hidden','false');
  }
  function closeMenu() {
    document.body.classList.remove('menu-open');
    if (!document.body.classList.contains('cart-open') && !document.body.classList.contains('product-open')) document.body.classList.remove('is-locked');
    const button = $('#menuButton'); if (button) button.setAttribute('aria-expanded','false');
    const menu = $('#mobileMenu'); if (menu) menu.setAttribute('aria-hidden','true');
  }

  function animateStore() {
    if (!window.gsap || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    gsap.fromTo('.product-card', { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: .42, stagger: .035, ease: 'power2.out', overwrite: true });
  }

  function bindShell() {
    $('#cartButton')?.addEventListener('click', openCart);
    $('#closeCart')?.addEventListener('click', closeCart);
    $('#drawerBackdrop')?.addEventListener('click', closeCart);
    $('#closeProduct')?.addEventListener('click', closeProductModal);
    $('#productBackdrop')?.addEventListener('click', closeProductModal);
    $('#checkoutButton')?.addEventListener('click', checkout);
    $('#menuButton')?.addEventListener('click', () => {
      document.body.classList.contains('menu-open') ? closeMenu() : openMenu();
    });
    $('#closeMenu')?.addEventListener('click', closeMenu);
    $('#mobileMenuBackdrop')?.addEventListener('click', closeMenu);
    $$('#mobileMenu a').forEach(link => link.addEventListener('click', closeMenu));
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') { closeMenu(); closeCart(); closeProductModal(); }
    });
  }

  function init() {
    bindShell();
    bindImageFallbacks();
    if (window.gsap && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      gsap.from('#siteHeader', { y: -20, opacity: 0, duration:.55, ease:'power2.out' });
      gsap.from('.hero-content > *', { y: 20, opacity: 0, duration:.65, stagger:.07, delay:.18, ease:'power2.out' });
    }
    initVideo();
    updateCartCount();
    loadCatalog();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once:true });
  else init();
})();
