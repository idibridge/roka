/* ─── ROKA Digital Assets — Shared JS v9 ─── */
(function(){
  'use strict';

  /* 1. SMOOTH SCROLL — jitter-free
     Root cause of jitter: continuous RAF + parallax scroll listener
     Fix: demand-driven RAF, Math.round to prevent sub-pixel oscillation,
          no parallax translateY that conflicts with scrollY
  */
  var targetY = 0, currentY = 0, rafId = null;
  var SMOOTH = 0.10;
  var WHEEL_SCALE = 0.8;
  var smoothScrollEnabled = false;

  function lerp(a, b, t) { return a + (b - a) * t; }

  function initSmoothScroll() {
    if (window.matchMedia('(pointer:coarse)').matches) return;
    if (window.matchMedia('(prefers-reduced-motion:reduce)').matches) return;
    if (window.innerWidth < 1025) return;

    smoothScrollEnabled = true;
    targetY  = window.scrollY;
    currentY = window.scrollY;
    document.documentElement.style.scrollBehavior = 'auto';
    document.body.style.overscrollBehavior = 'none';

    window.addEventListener('wheel', function(e) {
      e.preventDefault();
      var maxY = Math.max(0, document.body.scrollHeight - window.innerHeight);
      targetY = Math.max(0, Math.min(targetY + e.deltaY * WHEEL_SCALE, maxY));
      if (!rafId) rafId = requestAnimationFrame(tick);
    }, { passive: false });

    window.addEventListener('keydown', function(e) {
      var maxY = Math.max(0, document.body.scrollHeight - window.innerHeight);
      var step = window.innerHeight * 0.85;
      var moved = false;
      if (e.key === 'ArrowDown' || e.key === 'PageDown') { e.preventDefault(); targetY = Math.min(targetY + step, maxY); moved = true; }
      if (e.key === 'ArrowUp'   || e.key === 'PageUp')   { e.preventDefault(); targetY = Math.max(0, targetY - step);  moved = true; }
      if (e.key === 'Home') { e.preventDefault(); targetY = 0;    moved = true; }
      if (e.key === 'End')  { e.preventDefault(); targetY = maxY; moved = true; }
      if (moved && !rafId) rafId = requestAnimationFrame(tick);
    });

    document.addEventListener('click', function(e) {
      var a = e.target.closest('a[href^="#"]');
      if (!a) return;
      var id = a.getAttribute('href').slice(1);
      var el = document.getElementById(id);
      if (!el) return;
      e.preventDefault();
      targetY = Math.max(0, el.getBoundingClientRect().top + currentY - 80);
      if (!rafId) rafId = requestAnimationFrame(tick);
    });
  }

  function tick() {
    rafId = null;
    var diff = targetY - currentY;
    /* Snap when close — CRITICAL: prevents infinite micro-oscillation (jitter) */
    if (Math.abs(diff) < 0.5) {
      currentY = targetY;
      window.scrollTo(0, currentY);
      return; /* Stop — do NOT reschedule RAF */
    }
    currentY = lerp(currentY, targetY, SMOOTH);
    window.scrollTo(0, Math.round(currentY)); /* Math.round kills sub-pixel jitter */
    rafId = requestAnimationFrame(tick);
  }

  /* 2. CURSOR BLOB */
  function initCursorBlob() {
    var blob = document.querySelector('.blob-cursor');
    if (!blob) return;
    if (window.matchMedia('(pointer:coarse)').matches) { blob.style.display = 'none'; return; }
    var hero = document.querySelector('.hero-wrap');
    if (!hero) return;
    var tx = 0.5, ty = 0.4, px = 0.5, py = 0.4;
    hero.addEventListener('mouseenter', function() { blob.style.opacity = '1'; }, { passive: true });
    hero.addEventListener('mouseleave', function() { blob.style.opacity = '0'; }, { passive: true });
    hero.addEventListener('mousemove', function(e) {
      var r = hero.getBoundingClientRect();
      tx = (e.clientX - r.left) / r.width;
      ty = (e.clientY - r.top)  / r.height;
    }, { passive: true });
    blob.style.left = '50%'; blob.style.top = '40%';
    blob.style.opacity = '0.7'; blob.style.transition = 'opacity .6s ease';
    (function loop() {
      px = lerp(px, tx, 0.08); py = lerp(py, ty, 0.08);
      blob.style.left = (px * 100).toFixed(2) + '%';
      blob.style.top  = (py * 100).toFixed(2) + '%';
      requestAnimationFrame(loop);
    })();
  }

  /* 3. REVEALS */
  function initReveal() {
    var grids = '.services-grid,.process-grid,.who-grid,.benefits-grid,.aud-grid,.blog-grid,.mkt-grid,.why-grid,.blog-full-grid';
    document.querySelectorAll(grids).forEach(function(grid) {
      Array.from(grid.children).forEach(function(child, i) {
        if (!child.classList.contains('reveal')) child.classList.add('reveal');
        if (!child.className.match(/reveal-d[1-4]/)) child.style.transitionDelay = Math.min(i * 0.07, 0.35) + 's';
      });
    });
    var io = new IntersectionObserver(function(entries) {
      entries.forEach(function(e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { threshold: 0.05, rootMargin: '0px 0px -20px 0px' });
    document.querySelectorAll('.reveal').forEach(function(el) { io.observe(el); });
  }

  /* 4. SECTION LINES (NO parallax — was causing jitter) */
  function initSectionLines() {
    document.querySelectorAll('section.section').forEach(function(sec) {
      var line = document.createElement('div');
      line.className = 'section-sweep-line';
      sec.prepend(line);
      var io = new IntersectionObserver(function(entries) {
        if (entries[0].isIntersecting) { line.classList.add('drawn'); io.disconnect(); }
      }, { threshold: 0.06 });
      io.observe(sec);
    });
    /* Parallax translateY REMOVED — caused layout thrash + jitter on scroll */
  }

  /* 5. FAVICON */
  function setFavicon(lang) {
    var canvas = document.createElement('canvas');
    canvas.width = 64; canvas.height = 64;
    var ctx = canvas.getContext('2d');
    ctx.fillStyle = '#E2E8F4';
    ctx.font = 'bold 18px Arial,sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(lang === 'ru' ? 'РОКА' : 'ROKA', 32, 34);
    var link = document.querySelector("link[rel='icon']") || document.createElement('link');
    link.rel = 'icon'; link.type = 'image/png'; link.href = canvas.toDataURL();
    if (!document.querySelector("link[rel='icon']")) document.head.appendChild(link);
  }

  /* 6. NAV */
  function initNav() {
    var nav = document.querySelector('.nav');
    if (!nav) return;
    var fn = function() { nav.classList.toggle('scrolled', window.scrollY > 80); };
    window.addEventListener('scroll', fn, { passive: true });
    fn();
  }

  /* 7. MOBILE MENU */
  function initMobileMenu() {
    var burger = document.querySelector('.burger');
    var menu   = document.querySelector('.mob-menu');
    var close  = document.querySelector('.mob-close');
    if (!burger || !menu) return;
    function openMenu()  { menu.classList.add('open'); document.body.style.overflow = 'hidden'; }
    function closeMenu() { menu.classList.remove('open'); document.body.style.overflow = ''; }
    burger.addEventListener('click', openMenu);
    if (close) close.addEventListener('click', closeMenu);
    menu.querySelectorAll('a').forEach(function(a) { a.addEventListener('click', closeMenu); });
    document.addEventListener('keydown', function(e) { if (e.key === 'Escape') closeMenu(); });
  }

  /* 8. LANGUAGE */
  var DEFAULT_LANG = localStorage.getItem('roka_lang') || 'ru';

  function initLang() {
    var btns = document.querySelectorAll('.lang-sw button');
    btns.forEach(function(btn) {
      if (btn.dataset.lang === DEFAULT_LANG) btn.classList.add('on');
      btn.addEventListener('click', function() {
        var l = btn.dataset.lang;
        localStorage.setItem('roka_lang', l);
        btns.forEach(function(b) { b.classList.toggle('on', b.dataset.lang === l); });
        setFavicon(l); applyLang(l);
      });
    });
    applyLang(DEFAULT_LANG); setFavicon(DEFAULT_LANG);
    var c = document.querySelector('.curtain');
    if (c) setTimeout(function() { c.style.pointerEvents = 'none'; c.style.visibility = 'hidden'; }, 1800);
  }

  function applyLang(lang) {
    document.querySelectorAll('[data-ru],[data-en]').forEach(function(el) {
      if (el.querySelector('[data-ru],[data-en],[data-ru-html],[data-en-html]')) return;
      var txt = el.getAttribute('data-' + lang);
      if (txt !== null) el.textContent = txt;
    });
    document.querySelectorAll('[data-ru-html],[data-en-html]').forEach(function(el) {
      var txt = el.getAttribute('data-' + lang + '-html');
      if (txt !== null) el.innerHTML = txt;
    });
    document.querySelectorAll('.logo-text').forEach(function(el) {
      el.textContent = lang === 'ru' ? 'РОКА' : 'ROKA';
    });
    /* Switch input/textarea placeholders */
    document.querySelectorAll('[data-ru-placeholder],[data-en-placeholder]').forEach(function(el) {
      var ph = el.getAttribute('data-' + lang + '-placeholder');
      if (ph !== null) el.placeholder = ph;
    });
  }

  /* 9. ACTIVE LINK */
  function initActiveLink() {
    var path = location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.nav-links a,.mob-menu a').forEach(function(a) {
      var href = a.getAttribute('href');
      if (href === path || (path === '' && href === 'index.html')) a.classList.add('active');
    });
  }

  /* 10. COUNTERS */
  function initCounters() {
    document.querySelectorAll('[data-count]').forEach(function(el) {
      var target = parseFloat(el.dataset.count);
      var suffix = el.dataset.suffix || '';
      var dur = 1600;
      var io = new IntersectionObserver(function(entries) {
        if (!entries[0].isIntersecting) return;
        io.disconnect();
        var start = null;
        (function anim(ts) {
          if (!start) start = ts;
          var p = Math.min((ts - start) / dur, 1);
          var ease = 1 - Math.pow(1 - p, 3);
          var val = target < 100 ? (ease * target).toFixed(target % 1 ? 1 : 0) : Math.round(ease * target);
          el.textContent = val + suffix;
          if (p < 1) requestAnimationFrame(anim);
        })(performance.now());
      }, { threshold: 0.5 });
      io.observe(el);
    });
  }

  /* 11. FAQ global toggle */
  window.toggleFaq = function(btn) {
    var item = btn.closest('.faq-item');
    var isOpen = item.classList.contains('open');
    document.querySelectorAll('.faq-item.open').forEach(function(el) { el.classList.remove('open'); });
    if (!isOpen) item.classList.add('open');
  };

  /* INIT */
  document.addEventListener('DOMContentLoaded', function() {
    initSmoothScroll();
    initNav();
    initMobileMenu();
    initLang();
    initCursorBlob();
    initReveal();
    initSectionLines();
    initCounters();
    initActiveLink();
  });

})();
