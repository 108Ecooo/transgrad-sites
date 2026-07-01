/* ============================================================
   ТРАНСГРАД — основной скрипт
   GSAP + ScrollTrigger + Lenis, интерактив, hero-фон
   ============================================================ */
(function () {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.documentElement.classList.add('js-ready');

  /* ---------- Интро: держим экран, транспорт разъезжается по скроллу ---------- */
  (function intro() {
    const el = document.getElementById('intro');
    if (!el) return;
    if (reduceMotion) { el.classList.add('is-done'); return; }
    document.body.classList.add('lock');
    let left = false;
    function onIntent() { leave(); }
    function leave() {
      if (left) return; left = true;
      el.classList.add('is-leaving');          // панели плавно разъезжаются (CSS-transition 1.5s)
      document.body.classList.remove('lock');
      setTimeout(() => el.classList.add('is-done'), 1700);
      window.removeEventListener('wheel', onIntent);
      window.removeEventListener('touchstart', onIntent);
      window.removeEventListener('keydown', onIntent);
      el.removeEventListener('click', onIntent);
    }
    // уходит по первому намерению: колесо, тач, клавиша, клик…
    window.addEventListener('wheel', onIntent, { passive: true });
    window.addEventListener('touchstart', onIntent, { passive: true });
    window.addEventListener('keydown', onIntent);
    el.addEventListener('click', onIntent);
    // …или сам через 6 с, если пользователь бездействует
    setTimeout(leave, 6000);
  })();

  /* ---------- Lenis: плавный скролл + синхрон со ScrollTrigger ---------- */
  let lenis = null;
  if (!reduceMotion && window.Lenis) {
    lenis = new Lenis({ duration: 1.1, smoothWheel: true });
    lenis.on('scroll', () => window.ScrollTrigger && ScrollTrigger.update());
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }
  // Якорные ссылки через Lenis
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      if (id.length < 2) return;
      const el = document.querySelector(id);
      if (!el) return;
      e.preventDefault();
      closeMenu();
      lenis ? lenis.scrollTo(el, { offset: -70 }) : el.scrollIntoView({ behavior: 'smooth' });
    });
  });

  /* ---------- Хедер: фон при скролле ---------- */
  const header = document.getElementById('header');
  const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 40);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  /* ---------- Бургер-меню ---------- */
  const burger = document.getElementById('burger');
  const nav = document.querySelector('.header__nav');
  function closeMenu() { burger?.classList.remove('is-open'); nav?.classList.remove('is-open'); }
  burger?.addEventListener('click', () => {
    burger.classList.toggle('is-open');
    nav.classList.toggle('is-open');
  });

  /* ---------- GSAP reveal-анимации ---------- */
  if (window.gsap && window.ScrollTrigger) {
    gsap.registerPlugin(ScrollTrigger);

    // Hero — последовательное появление сразу
    gsap.to('.hero [data-reveal]', {
      opacity: 1, y: 0, duration: 1, ease: 'power3.out', stagger: 0.12, delay: 1,
    });

    // Заголовки строк hero (clip-reveal)
    gsap.from('.hero__title .line', {
      yPercent: 110, duration: 1.1, ease: 'power4.out', stagger: 0.12, delay: 1.05,
    });

    // Остальные секции — по скроллу
    document.querySelectorAll('section:not(.hero) [data-reveal]').forEach((el) => {
      gsap.to(el, {
        opacity: 1, y: 0, duration: 0.9, ease: 'power3.out',
        scrollTrigger: { trigger: el, start: 'top 86%' },
      });
    });

    // Строки преимуществ — каскад
    gsap.to('.adv-row', {
      opacity: 1, y: 0, duration: 0.8, ease: 'power3.out', stagger: 0.1,
      scrollTrigger: { trigger: '.adv-list', start: 'top 82%' },
    });

    // Манифест — «подсветка» слов по мере скролла
    document.querySelectorAll('[data-manifest]').forEach((line) => {
      const words = line.children;
      gsap.to(words, {
        opacity: 1, ease: 'none', stagger: 0.5,
        scrollTrigger: { trigger: line, start: 'top 82%', end: 'bottom 55%', scrub: 0.6 },
      });
    });

    // Параллакс свечений hero
    if (!reduceMotion) {
      gsap.to('.hero__glow--red', { yPercent: 30, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
      gsap.to('.hero__glow--blue', { yPercent: -20, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
    }
  } else {
    // Фолбэк без GSAP — просто показать всё
    document.querySelectorAll('[data-reveal]').forEach((el) => { el.style.opacity = 1; el.style.transform = 'none'; });
    document.querySelectorAll('[data-manifest] > *').forEach((el) => { el.style.opacity = 1; });
  }

  /* ---------- Tilt-эффект карточек ---------- */
  if (!reduceMotion && window.matchMedia('(hover:hover)').matches) {
    document.querySelectorAll('[data-tilt]').forEach((card) => {
      const max = 7;
      card.addEventListener('mousemove', (e) => {
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        card.style.transform = `perspective(800px) rotateY(${px * max}deg) rotateX(${-py * max}deg) translateY(-6px)`;
      });
      card.addEventListener('mouseleave', () => { card.style.transform = ''; });
    });
  }

  /* ---------- Модалка «Заказать звонок» ---------- */
  (function modal() {
    const modal = document.getElementById('modal');
    const form = document.getElementById('callForm');
    const success = document.getElementById('modalSuccess');
    if (!modal) return;
    const open = () => { modal.classList.add('is-open'); document.body.classList.add('lock'); lenis?.stop(); };
    const close = () => {
      modal.classList.remove('is-open'); document.body.classList.remove('lock'); lenis?.start();
      setTimeout(() => { form.style.display = ''; success.classList.remove('is-shown'); form.reset(); }, 350);
    };
    document.querySelectorAll('[data-modal-open]').forEach((b) => b.addEventListener('click', open));
    document.querySelectorAll('[data-modal-close]').forEach((b) => b.addEventListener('click', close));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
    form?.addEventListener('submit', (e) => {
      e.preventDefault();
      form.style.display = 'none';
      success.classList.add('is-shown');
    });
  })();

  /* ---------- Индикатор прогресса скролла ---------- */
  (function scrollProgress() {
    const bar = document.getElementById('scrollProgress');
    if (!bar) return;
    const upd = () => {
      const h = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.width = (h > 0 ? (window.scrollY / h) * 100 : 0) + '%';
    };
    upd();
    window.addEventListener('scroll', upd, { passive: true });
    window.addEventListener('resize', upd);
  })();

  /* ---------- Кастомный курсор + магнитные элементы ---------- */
  (function cursorMagnetic() {
    const fine = window.matchMedia('(hover:hover) and (pointer:fine)').matches;
    if (!fine || reduceMotion) return;

    // Магнитное притяжение
    document.querySelectorAll('[data-magnetic]').forEach((el) => {
      const k = 0.3;
      el.addEventListener('mousemove', (e) => {
        const r = el.getBoundingClientRect();
        const mx = e.clientX - (r.left + r.width / 2);
        const my = e.clientY - (r.top + r.height / 2);
        el.style.transform = `translate(${mx * k}px, ${my * k - 3}px)`;
      });
      el.addEventListener('mouseleave', () => { el.style.transform = ''; });
    });

    // Кастомный курсор-самолётик: силуэт (вид сверху) с инерцией и доворотом носа
    const plane = document.createElement('div');
    plane.className = 'cursor-plane';
    plane.innerHTML = '<svg viewBox="0 0 512 512" fill="currentColor"><path d="M256 24c-13 0-23 29-23 71v54L44 270c-4 2-6 6-6 10v34c0 6 6 11 12 9l183-53v98l-45 34c-3 2-5 6-5 9v27c0 5 5 9 10 8l63-16 63 16c5 1 10-3 10-8v-27c0-3-2-7-5-9l-45-34v-98l183 53c6 2 12-3 12-9v-34c0-4-2-8-6-10L279 149V95c0-42-10-71-23-71z"/></svg>';
    document.body.appendChild(plane);

    // rx/ry — сглаженная позиция, mx/my — цель (курсор), angle — угол носа (deg, 0 = вверх)
    let rx = innerWidth / 2, ry = innerHeight / 2, mx = rx, my = ry, angle = 0, hovering = false, shown = false;
    document.addEventListener('mousemove', (e) => {
      mx = e.clientX; my = e.clientY;
      if (!shown) { shown = true; plane.style.opacity = '1'; document.body.classList.add('has-customcursor'); }
    });

    (function follow() {
      const nx = rx + (mx - rx) * 0.18;
      const ny = ry + (my - ry) * 0.18;
      const vx = nx - rx, vy = ny - ry;
      rx = nx; ry = ny;
      const speed = Math.hypot(vx, vy);
      if (speed > 0.35) {
        // нос по вектору движения; арт смотрит вверх → +90°
        const target = Math.atan2(vy, vx) * 180 / Math.PI + 90;
        let diff = ((target - angle + 540) % 360) - 180;
        angle += diff * 0.2;                          // плавный доворот
      }
      const scale = hovering ? 1.45 : 1;
      plane.style.transform = `translate(${rx}px, ${ry}px) rotate(${angle}deg) scale(${scale})`;
      requestAnimationFrame(follow);
    })();

    const hov = 'a, button, .geo__item, [data-tilt], [data-modal-open], input, .btn-route, .cta__phone';
    document.addEventListener('mouseover', (e) => { if (e.target.closest(hov)) { hovering = true; plane.classList.add('is-hover'); } });
    document.addEventListener('mouseout', (e) => { if (e.target.closest(hov)) { hovering = false; plane.classList.remove('is-hover'); } });
  })();

  /* ---------- Параллакс героя от движения мыши ---------- */
  (function heroParallax() {
    if (reduceMotion || !window.matchMedia('(hover:hover)').matches) return;
    const hero = document.getElementById('hero');
    if (!hero) return;
    const content = hero.querySelector('.hero__content');
    const canvas = hero.querySelector('.hero__canvas');
    hero.addEventListener('mousemove', (e) => {
      const cx = e.clientX / innerWidth - 0.5;
      const cy = e.clientY / innerHeight - 0.5;
      if (content) content.style.transform = `translate(${cx * 14}px, ${cy * 11}px)`;
      if (canvas) canvas.style.transform = `translate(${cx * -22}px, ${cy * -16}px)`;
    });
    hero.addEventListener('mouseleave', () => {
      if (content) content.style.transform = '';
      if (canvas) canvas.style.transform = '';
    });
  })();

  /* ============================================================
     HERO — фон «сеть маршрутов» (canvas 2D, лёгкий)
     ============================================================ */
  (function heroNet() {
    const canvas = document.getElementById('net');
    if (!canvas || reduceMotion) return;
    const ctx = canvas.getContext('2d');
    let w, h, dpr, nodes = [], raf;
    const ACCENT = '22,51,95';   // авиационный синий для узлов-хабов на светлом фоне

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth; h = canvas.clientHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.min(46, Math.floor((w * h) / 28000));
      nodes = Array.from({ length: count }, (_, i) => ({
        x: Math.random() * w, y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.24, vy: (Math.random() - 0.5) * 0.24,
        r: Math.random() * 1.6 + 0.6,
        hub: i % 11 === 0,           // редкие «хабы» — крупнее и ярче
      }));
    }

    function draw() {
      ctx.clearRect(0, 0, w, h);
      for (const n of nodes) {
        n.x += n.vx; n.y += n.vy;
        if (n.x < 0 || n.x > w) n.vx *= -1;
        if (n.y < 0 || n.y > h) n.vy *= -1;
      }
      // связи
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i], b = nodes[j];
          const dx = a.x - b.x, dy = a.y - b.y;
          const d = Math.hypot(dx, dy);
          if (d < 155) {
            const o = (1 - d / 155) * 0.16;
            ctx.strokeStyle = `rgba(${ACCENT},${o})`;
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
          }
        }
      }
      // узлы (без canvas shadowBlur — он крайне дорог по перерисовке)
      for (const n of nodes) {
        if (n.hub) {
          ctx.fillStyle = `rgba(${ACCENT},.14)`;
          ctx.beginPath(); ctx.arc(n.x, n.y, n.r + 4, 0, Math.PI * 2); ctx.fill();   // мягкое «свечение» кружком
          ctx.fillStyle = `rgba(${ACCENT},.6)`;
          ctx.beginPath(); ctx.arc(n.x, n.y, n.r + 1.4, 0, Math.PI * 2); ctx.fill();
        } else {
          ctx.fillStyle = `rgba(${ACCENT},.28)`;
          ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2); ctx.fill();
        }
      }
      raf = requestAnimationFrame(draw);
    }
    resize();
    draw();
    window.addEventListener('resize', () => { cancelAnimationFrame(raf); resize(); draw(); });

    // Пауза анимации, когда hero ушёл из вида — экономим ресурсы на остальной странице
    if ('IntersectionObserver' in window) {
      new IntersectionObserver((es) => {
        if (es[0].isIntersecting) { cancelAnimationFrame(raf); draw(); }
        else { cancelAnimationFrame(raf); }
      }, { threshold: 0 }).observe(canvas);
    }
  })();
})();
