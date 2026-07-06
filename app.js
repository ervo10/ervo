  // ─── COOKIE CONSENT BANNER ───
  (function() {
    if (localStorage.getItem('ervo_cookie_consent')) return;
    const banner = document.createElement('div');
    banner.id = 'cookieBanner';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-label', 'Slapukų sutikimas');
    banner.innerHTML = `
      <div style="display:flex;align-items:flex-start;gap:16px;flex-wrap:wrap;">
        <div style="flex:1;min-width:220px;">
          <p style="margin:0 0 6px;font-weight:600;font-size:15px;color:#14130f;">Naudojame slapukus</p>
          <p style="margin:0;font-size:13px;color:#6b6759;line-height:1.55;">Svetainė naudoja būtinus ir analitinius slapukus. Plačiau: <a href="slapukai.html" style="color:#1a7a5a;text-decoration:underline;">Slapukų politika</a>.</p>
        </div>
        <div style="display:flex;gap:10px;align-items:center;flex-shrink:0;margin-top:2px;">
          <button id="cookieDecline" style="background:none;border:1.5px solid #d1cfc8;padding:9px 18px;border-radius:8px;cursor:pointer;font-size:13px;font-weight:500;color:#6b6759;white-space:nowrap;">Tik būtini</button>
          <button id="cookieAccept" style="background:#14130f;color:#fff;border:none;padding:9px 20px;border-radius:8px;cursor:pointer;font-size:13px;font-weight:600;white-space:nowrap;">Sutinku</button>
        </div>
      </div>`;
    banner.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#fff;border:1.5px solid #e8e6e0;border-radius:16px;padding:18px 22px;width:calc(100% - 48px);max-width:680px;box-shadow:0 8px 32px rgba(0,0,0,.12);z-index:9999;box-sizing:border-box;';
    document.body.appendChild(banner);
    const close = (val) => {
      localStorage.setItem('ervo_cookie_consent', val);
      banner.style.transition = 'opacity .3s,transform .3s';
      banner.style.opacity = '0';
      banner.style.transform = 'translateX(-50%) translateY(12px)';
      setTimeout(() => banner.remove(), 320);
    };
    document.getElementById('cookieAccept').addEventListener('click', () => close('all'));
    document.getElementById('cookieDecline').addEventListener('click', () => close('required'));
  })();

  // Header shadow on scroll
  const hdr = document.getElementById('hdr');
  const onScroll = () => hdr.classList.toggle('scrolled', window.scrollY > 12);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Reveal on scroll
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
  }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });
  document.querySelectorAll('.reveal').forEach(el => io.observe(el));

  // FAQ — single open at a time
  const faqs = document.querySelectorAll('.faq-item');
  faqs.forEach(d => d.addEventListener('toggle', () => {
    if (d.open) faqs.forEach(o => { if (o !== d) o.open = false; });
  }));

  // ─── CART ───
  const Cart = (() => {
    const KEY = 'ervo_cart';
    let items = [];
    try { items = JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) { items = []; }

    const fmt = n => new Intl.NumberFormat('lt-LT').format(n) + ' €';
    const save = () => localStorage.setItem(KEY, JSON.stringify(items));
    const count = () => items.reduce((s, i) => s + i.qty, 0);
    const total = () => items.reduce((s, i) => s + i.price * i.qty, 0);

    const renderBadge = () => {
      const el = document.getElementById('cartCount');
      const c = count();
      el.textContent = c;
      el.classList.toggle('show', c > 0);
    };

    const render = () => {
      const wrap = document.getElementById('cartItems');
      const foot = document.getElementById('cartFoot');
      if (!items.length) {
        wrap.innerHTML = '<div class="cart-empty"><svg viewBox="0 0 24 24" fill="none" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg><p>Jūsų krepšelis tuščias.</p></div>';
        foot.style.display = 'none';
      } else {
        wrap.innerHTML = items.map(i => `
          <div class="cart-row">
            <img class="cart-row-img" src="${i.img}" alt="${i.name}" loading="lazy">
            <div class="cart-row-info">
              <div class="cart-row-name">${i.name}</div>
              <div class="cart-row-price">${fmt(i.price)}</div>
              <div class="qty">
                <button aria-label="Mažinti" onclick="Cart.dec('${i.id}')">−</button>
                <span>${i.qty}</span>
                <button aria-label="Didinti" onclick="Cart.inc('${i.id}')">+</button>
              </div>
            </div>
            <button class="cart-row-remove" onclick="Cart.remove('${i.id}')">Šalinti</button>
          </div>`).join('');
        document.getElementById('cartTotal').textContent = fmt(total());
        foot.style.display = 'block';
      }
      renderBadge();
    };

    const toast = (msg) => {
      const t = document.getElementById('toast');
      document.getElementById('toastMsg').textContent = msg;
      t.classList.add('show');
      clearTimeout(t._t);
      t._t = setTimeout(() => t.classList.remove('show'), 2400);
    };

    return {
      add(p) {
        const ex = items.find(i => i.id === p.id);
        if (ex) ex.qty++; else items.push({ ...p, qty: 1 });
        save(); render(); toast(p.name + ' pridėta į krepšelį');
      },
      inc(id) { const i = items.find(x => x.id === id); if (i) { i.qty++; save(); render(); } },
      dec(id) { const i = items.find(x => x.id === id); if (i) { i.qty--; if (i.qty <= 0) items = items.filter(x => x.id !== id); save(); render(); } },
      remove(id) { items = items.filter(x => x.id !== id); save(); render(); },
      open() { document.getElementById('cartDrawer').classList.add('open'); document.getElementById('cartOverlay').classList.add('open'); },
      close() { document.getElementById('cartDrawer').classList.remove('open'); document.getElementById('cartOverlay').classList.remove('open'); },
      _init() { render(); }
    };
  })();
  window.Cart = Cart;
  Cart._init();

  // Wire add-to-cart buttons
  document.querySelectorAll('.add-cart').forEach(btn => {
    btn.addEventListener('click', () => {
      Cart.add({
        id: btn.dataset.id,
        name: btn.dataset.name,
        price: Number(btn.dataset.price),
        img: btn.dataset.img
      });
      Cart.open();
    });
  });

  // Color selectors (spotlight + product cards) — generic
  document.querySelectorAll('.color-group').forEach(group => {
    const img = group.dataset.img ? document.querySelector(group.dataset.img) : null;
    const buy = group.dataset.buy ? document.querySelector(group.dataset.buy) : null;
    const nameEl = group.dataset.name ? document.querySelector(group.dataset.name) : null;
    const base = group.dataset.base || '';
    const idBase = group.dataset.idbase || '';
    group.querySelectorAll('[data-color]').forEach(sw => {
      sw.addEventListener('click', () => {
        group.querySelectorAll('[data-color]').forEach(s => s.classList.remove('active'));
        sw.classList.add('active');
        const cname = sw.dataset.colorName;
        if (img) { img.src = sw.dataset.img; img.alt = base + ' ergonominė kėdė, ' + cname.toLowerCase() + ' spalva'; }
        if (nameEl) nameEl.textContent = cname;
        if (buy) { buy.dataset.id = idBase + '-' + sw.dataset.color; buy.dataset.name = base + ' — ' + cname; buy.dataset.img = sw.dataset.img; }
      });
    });
  });

  // Countdown timers — find all .cd-box containers and tick
  (function() {
    const containers = document.querySelectorAll('[id^="cd-"]');
    if (!containers.length) return;
    const end = (() => {
      const d = new Date();
      d.setHours(d.getHours() + 11, d.getMinutes() + 47, d.getSeconds() + 33, 0);
      return d;
    })();
    const pad = n => String(n).padStart(2, '0');
    const tick = () => {
      const diff = Math.max(0, end - Date.now());
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      containers.forEach(c => {
        const hEl = c.querySelector('[data-cd="h"]');
        const mEl = c.querySelector('[data-cd="m"]');
        const sEl = c.querySelector('[data-cd="s"]');
        if (hEl) hEl.textContent = pad(h);
        if (mEl) mEl.textContent = pad(m);
        if (sEl) sEl.textContent = pad(s);
      });
    };
    tick();
    setInterval(tick, 1000);
  })();

  // Product image gallery + lightbox — generic
  document.querySelectorAll('.gallery').forEach(g => {
    const main = g.querySelector('.gallery-main img');
    if (!main) return;
    const thumbs = [...g.querySelectorAll('.thumb')];
    const imgs = thumbs.map(t => t.dataset.img || t.querySelector('img').src);
    let idx = 0;

    const setActive = (i) => {
      idx = (i + imgs.length) % imgs.length;
      thumbs.forEach(x => x.classList.remove('active'));
      if (thumbs[idx]) thumbs[idx].classList.add('active');
      const ti = thumbs[idx] && thumbs[idx].querySelector('img');
      main.src = imgs[idx];
      if (ti) main.alt = ti.alt;
    };

    thumbs.forEach((t, i) => t.addEventListener('click', () => setActive(i)));

    // Lightbox (built once, shared)
    let lb = document.getElementById('lightbox');
    if (!lb) {
      lb = document.createElement('div');
      lb.id = 'lightbox';
      lb.innerHTML =
        '<button class="lb-close" aria-label="Uždaryti"><svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg></button>' +
        '<button class="lb-nav lb-prev" aria-label="Ankstesnė"><svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg></button>' +
        '<img id="lbImg" alt="">' +
        '<button class="lb-nav lb-next" aria-label="Kita"><svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg></button>';
      document.body.appendChild(lb);
    }
    const lbImg = lb.querySelector('#lbImg');
    const openLb = () => { lbImg.src = imgs[idx]; lbImg.alt = main.alt; lb.classList.add('open'); document.body.style.overflow = 'hidden'; };
    const closeLb = () => { lb.classList.remove('open'); document.body.style.overflow = ''; };
    main.addEventListener('click', openLb);
    lb.querySelector('.lb-close').addEventListener('click', closeLb);
    lb.querySelector('.lb-prev').addEventListener('click', () => { setActive(idx - 1); lbImg.src = imgs[idx]; lbImg.alt = main.alt; });
    lb.querySelector('.lb-next').addEventListener('click', () => { setActive(idx + 1); lbImg.src = imgs[idx]; lbImg.alt = main.alt; });
    lb.addEventListener('click', (e) => { if (e.target === lb) closeLb(); });
    document.addEventListener('keydown', (e) => {
      if (!lb.classList.contains('open')) return;
      if (e.key === 'Escape') closeLb();
      if (e.key === 'ArrowLeft') { setActive(idx - 1); lbImg.src = imgs[idx]; lbImg.alt = main.alt; }
      if (e.key === 'ArrowRight') { setActive(idx + 1); lbImg.src = imgs[idx]; lbImg.alt = main.alt; }
    });
  });
