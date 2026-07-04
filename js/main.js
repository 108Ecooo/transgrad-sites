/* ============================================================
   ТРАНСГРАД — анимации и интерактив
   GSAP + ScrollTrigger + Lenis. Без карт, глобусов и маршрутов.
   ============================================================ */

(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasGsap = typeof gsap !== 'undefined';
  var hasST = hasGsap && typeof ScrollTrigger !== 'undefined';

  if (hasST) gsap.registerPlugin(ScrollTrigger);

  /* ---------- Плавный скролл (Lenis) ---------- */
  var lenis = null;
  if (!reduceMotion && typeof Lenis !== 'undefined' && hasGsap) {
    lenis = new Lenis({ duration: 1.1, smoothWheel: true });
    if (hasST) lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
    gsap.ticker.lagSmoothing(0);
  }

  /* Якорные ссылки через Lenis */
  document.querySelectorAll('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var id = a.getAttribute('href');
      if (id.length < 2) return;
      var el = document.querySelector(id);
      if (!el) return;
      e.preventDefault();
      closeMenu();
      if (lenis) lenis.scrollTo(el, { offset: -70 });
      else el.scrollIntoView({ behavior: 'smooth' });
    });
  });

  /* ---------- Хедер: тень при скролле ---------- */
  var header = document.getElementById('header');
  if (header) {
    var onScroll = function () {
      header.classList.toggle('is-scrolled', window.scrollY > 10);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ---------- Бургер / мобильное меню ---------- */
  var burger = document.getElementById('burger');
  var mobileMenu = document.getElementById('mobileMenu');

  function closeMenu() {
    if (!burger || !mobileMenu) return;
    mobileMenu.classList.remove('is-open');
    burger.classList.remove('is-open');
    burger.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('lock');
  }

  if (burger && mobileMenu) {
    burger.addEventListener('click', function () {
      var open = mobileMenu.classList.toggle('is-open');
      burger.classList.toggle('is-open', open);
      burger.setAttribute('aria-expanded', String(open));
      document.body.classList.toggle('lock', open);
    });
    mobileMenu.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', closeMenu);
    });
  }

  /* ---------- Фирменные шевроны в полосах и разделителях ---------- */
  var CHEVRON_SVG =
    '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
    '<path d="M8 4l8 8-8 8" stroke="#ffffff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>' +
    '</svg>';

  document.querySelectorAll('[data-chevrons]').forEach(function (track) {
    var html = '';
    for (var i = 0; i < 40; i++) html += CHEVRON_SVG;
    track.innerHTML = html;
  });

  /* Движение шевронов при скролле (scrub) */
  if (hasST && !reduceMotion) {
    document.querySelectorAll('[data-chevrons]').forEach(function (track) {
      var reverse = track.hasAttribute('data-chevrons-reverse');
      gsap.to(track, {
        x: reverse ? 260 : -260,
        ease: 'none',
        scrollTrigger: {
          trigger: track.closest('.stripe, .divider') || track,
          start: 'top bottom',
          end: 'bottom top',
          scrub: 1
        }
      });
    });
  }

  /* ---------- Hero: стыковка половин знака + заголовок ---------- */
  var markTop = document.querySelector('.mark-half--top');
  var markBot = document.querySelector('.mark-half--bot');
  var titleLines = document.querySelectorAll('.hero__title .line > span');
  var heroLead = document.querySelector('.hero__lead');
  var heroMeta = document.querySelector('.hero__meta');
  var heroActions = document.querySelector('.hero__actions');

  if (hasGsap && !reduceMotion && markTop && markBot) {
    var tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

    /* половины знака съезжаются с противоположных сторон и стыкуются */
    tl.fromTo(markTop,
      { x: -160, y: -60, opacity: 0 },
      { x: 0, y: 0, opacity: 1, duration: 0.85, ease: 'back.out(1.4)' }
    );
    tl.fromTo(markBot,
      { x: 160, y: 60, opacity: 0 },
      { x: 0, y: 0, opacity: 1, duration: 0.85, ease: 'back.out(1.4)' },
      '<0.08'
    );
    /* лёгкий «удар» стыковки */
    tl.fromTo('#markSvg',
      { scale: 1.04, transformOrigin: '50% 50%' },
      { scale: 1, duration: 0.3, ease: 'power2.out' },
      '-=0.25'
    );

    if (heroMeta) {
      tl.fromTo(heroMeta, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.5 }, '-=0.15');
    }
    if (titleLines.length) {
      tl.fromTo(titleLines,
        { yPercent: 110 },
        { yPercent: 0, duration: 0.8, stagger: 0.12, ease: 'power4.out' },
        '-=0.35'
      );
    }
    if (heroLead) {
      tl.fromTo(heroLead, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.6 }, '-=0.4');
    }
    if (heroActions) {
      tl.fromTo(heroActions, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.6 }, '-=0.45');
    }
  }

  /* ---------- Reveal-анимации секций ---------- */
  var revealEls = document.querySelectorAll('[data-reveal]');
  if (hasST && !reduceMotion) {
    revealEls.forEach(function (el) {
      gsap.fromTo(el,
        { opacity: 0, y: 36 },
        {
          opacity: 1,
          y: 0,
          duration: 0.85,
          ease: 'power3.out',
          scrollTrigger: { trigger: el, start: 'top 86%', once: true }
        }
      );
    });
  } else {
    revealEls.forEach(function (el) {
      el.style.opacity = '1';
      el.style.transform = 'none';
    });
  }

  /* ---------- Манифест: подсветка строк при скролле ---------- */
  var manifestLines = document.querySelectorAll('[data-manifest]');
  if (manifestLines.length) {
    if (hasST && !reduceMotion) {
      manifestLines.forEach(function (line) {
        ScrollTrigger.create({
          trigger: line,
          start: 'top 74%',
          end: 'bottom 26%',
          onEnter: function () { line.classList.add('is-lit'); },
          onLeave: function () { line.classList.remove('is-lit'); },
          onEnterBack: function () { line.classList.add('is-lit'); },
          onLeaveBack: function () { line.classList.remove('is-lit'); }
        });
      });
    } else {
      manifestLines.forEach(function (line) { line.classList.add('is-lit'); });
    }
  }

  /* ---------- Форма заявки: валидация имени и телефона ---------- */
  var formCard = document.getElementById('formCard');
  var leadForm = document.getElementById('leadForm');

  if (leadForm && formCard) {
    var nameInput = leadForm.querySelector('input[name="name"]');
    var phoneInput = leadForm.querySelector('input[name="phone"]');

    /* лёгкая маска: разрешаем только цифры, +, пробелы, скобки, дефисы */
    phoneInput.addEventListener('input', function () {
      this.value = this.value.replace(/[^\d+\s()-]/g, '');
      this.classList.remove('is-invalid');
    });
    nameInput.addEventListener('input', function () {
      this.classList.remove('is-invalid');
    });

    var isValidPhone = function (value) {
      var digits = value.replace(/\D/g, '');
      return digits.length >= 10 && digits.length <= 12;
    };

    leadForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var valid = true;

      if (!nameInput.value.trim()) {
        nameInput.classList.add('is-invalid');
        valid = false;
      }
      if (!isValidPhone(phoneInput.value)) {
        phoneInput.classList.add('is-invalid');
        valid = false;
      }
      if (!valid) return;

      /* ЗАМЕНИТЬ: сюда подключается реальная отправка (email/CRM/бэкенд) */
      formCard.classList.add('is-sent');
    });
  }
})();
