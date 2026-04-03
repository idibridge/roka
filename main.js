/* ─── ROKA Digital Assets — Shared JS v7 ─── */
(function(){
  'use strict';

  /* ══════════════════════════════════════════
     1. SMOOTH SCROLL (aziatkaz.com style)
     Inertia-based lerp scroll — slower, cinematic
  ══════════════════════════════════════════ */
  let smoothScrollActive = false;
  let targetY  = 0;
  let currentY = 0;
  const SMOOTH  = 0.062; // ← lower = more inertia, slower cinematic feel
  const WHEEL_SCALE = 0.65;

  function lerp(a,b,t){ return a+(b-a)*t; }

  function initSmoothScroll(){
    // Disable on touch/mobile - they have native momentum already
    if(window.matchMedia('(pointer:coarse)').matches) return;
    // Disable if user prefers-reduced-motion
    if(window.matchMedia('(prefers-reduced-motion:reduce)').matches) return;

    // Sync start position
    targetY  = window.scrollY;
    currentY = window.scrollY;
    smoothScrollActive = true;

    // Override CSS scroll-behavior so our JS controls it
    document.documentElement.style.scrollBehavior = 'auto';

    // Intercept wheel — accumulate target, don't let browser scroll natively
    window.addEventListener('wheel', e => {
      e.preventDefault();
      const maxY = document.body.scrollHeight - window.innerHeight;
      targetY = Math.max(0, Math.min(targetY + e.deltaY * WHEEL_SCALE, maxY));
    }, { passive: false });

    // Keyboard support
    window.addEventListener('keydown', e => {
      const maxY = document.body.scrollHeight - window.innerHeight;
      const step = window.innerHeight * 0.88;
      if(e.key === 'ArrowDown' || e.key === 'PageDown'){
        e.preventDefault();
        targetY = Math.min(targetY + step, maxY);
      }
      if(e.key === 'ArrowUp' || e.key === 'PageUp'){
        e.preventDefault();
        targetY = Math.max(0, targetY - step);
      }
      if(e.key === 'Home'){ e.preventDefault(); targetY = 0; }
      if(e.key === 'End')  { e.preventDefault(); targetY = maxY; }
    });

    // Touch-drag for hybrid devices — update targetY from touchmove delta
    let touchStartY = 0;
    window.addEventListener('touchstart', e => { touchStartY = e.touches[0].clientY; }, {passive:true});
    window.addEventListener('touchmove', e => {
      const dy = touchStartY - e.touches[0].clientY;
      touchStartY = e.touches[0].clientY;
      const maxY = document.body.scrollHeight - window.innerHeight;
      targetY = Math.max(0, Math.min(targetY + dy, maxY));
    }, {passive:true});

    // RAF loop — apply lerped scroll
    (function tick(){
      // Snap when close enough to avoid infinite drift
      if(Math.abs(targetY - currentY) < 0.3){
        currentY = targetY;
      } else {
        currentY = lerp(currentY, targetY, SMOOTH);
      }
      window.scrollTo(0, currentY);

      // Keep targetY in sync if something else changed scrollY (anchor links, etc.)
      if(Math.abs(window.scrollY - currentY) > 4) {
        currentY = window.scrollY;
        targetY  = window.scrollY;
      }
      requestAnimationFrame(tick);
    })();

    // Allow anchor links to work by updating targetY to the element offset
    document.addEventListener('click', e => {
      const a = e.target.closest('a[href^="#"]');
      if(!a) return;
      const id = a.getAttribute('href').slice(1);
      const el = document.getElementById(id);
      if(!el) return;
      e.preventDefault();
      targetY = Math.max(0, el.getBoundingClientRect().top + currentY - 80);
    });
  }

  /* ══════════════════════════════════════════
     2. CURSOR BLOB — hero section only
     Not fixed/global. Position absolute inside hero.
  ══════════════════════════════════════════ */
  function initCursorBlob(){
    const blob = document.querySelector('.blob-cursor');
    if(!blob) return;
    if(window.matchMedia('(pointer:coarse)').matches){
      blob.style.display = 'none';
      return;
    }

    const hero = document.querySelector('.hero-wrap');
    if(!hero) return;

    let tx = 0.5, ty = 0.4; // fractional within hero (0..1)
    let px = 0.5, py = 0.4;
    let isInHero = false;

    // Track mouse relative to hero — glow ONLY inside hero zone
    hero.addEventListener('mouseenter', () => { isInHero = true; blob.style.opacity = '1'; });
    hero.addEventListener('mouseleave', () => {
      isInHero = false;
      blob.style.opacity = '0';
    });

    hero.addEventListener('mousemove', e => {
      const r = hero.getBoundingClientRect();
      tx = (e.clientX - r.left) / r.width;
      ty = (e.clientY - r.top)  / r.height;
    }, {passive:true});

    // Start at centre
    blob.style.left = '50%';
    blob.style.top  = '40%';
    blob.style.opacity = '0.7';
    blob.style.transition = 'opacity .6s ease';

    (function loop(){
      px = lerp(px, tx, 0.1);
      py = lerp(py, ty, 0.1);
      // Use percentage — blob-cursor is position:absolute inside hero
      blob.style.left = (px * 100).toFixed(2) + '%';
      blob.style.top  = (py * 100).toFixed(2) + '%';
      requestAnimationFrame(loop);
    })();
  }

  /* ══════════════════════════════════════════
     3. REVEALS — investax.io style
     a) Clip-path wipe for section labels + h2
     b) Staggered children in grids/lists
     c) Slide-from-left for .label elements
     d) Section "sweep line" on enter
  ══════════════════════════════════════════ */
  function initReveal(){
    // Auto-stagger children inside grids/lists
    document.querySelectorAll('.services-grid,.process-grid,.who-grid,.benefits-grid,.aud-grid,.blog-grid,.asset-grid-home,.mkt-grid,.why-grid').forEach(grid => {
      Array.from(grid.children).forEach((child, i) => {
        if(!child.classList.contains('reveal')){
          child.classList.add('reveal');
        }
        // Only add delay if not already explicit
        if(!child.className.match(/reveal-d[1-4]/)){
          const delay = Math.min(i * 0.08, 0.48); // cap at ~480ms
          child.style.transitionDelay = delay + 's';
        }
      });
    });

    // All reveal elements — observe and add .in when visible
    const allReveal = document.querySelectorAll('.reveal');
    if(!allReveal.length) return;

    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if(e.isIntersecting){
          e.target.classList.add('in');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.06, rootMargin: '0px 0px -40px 0px' });

    allReveal.forEach(el => io.observe(el));
  }

  /* ══════════════════════════════════════════
     4. SECTION PROGRESS LINE + PARALLAX (investax accent)
     Thin accent line draws across top of each section on enter
     + subtle parallax shift on section content
  ══════════════════════════════════════════ */
  function initSectionLines(){
    document.querySelectorAll('section.section').forEach(sec => {
      const line = document.createElement('div');
      line.className = 'section-sweep-line';
      sec.prepend(line);

      const io = new IntersectionObserver(([entry]) => {
        if(entry.isIntersecting){
          line.classList.add('drawn');
          io.disconnect();
        }
      }, { threshold: 0.08 });
      io.observe(sec);
    });

    // Subtle parallax: sections translate slightly based on scroll position
    if(window.matchMedia('(pointer:coarse)').matches) return;
    if(window.matchMedia('(prefers-reduced-motion:reduce)').matches) return;

    const sections = document.querySelectorAll('section.section');
    let ticking = false;
    function onParallaxScroll(){
      if(ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const wh = window.innerHeight;
        sections.forEach(sec => {
          const rect = sec.getBoundingClientRect();
          const ctr = sec.querySelector('.ctr');
          if(!ctr) return;
          // Only apply when section is in viewport
          if(rect.bottom < 0 || rect.top > wh) return;
          // Normalized position: 0 = just entering bottom, 1 = just leaving top
          const progress = 1 - (rect.bottom / (wh + rect.height));
          // Subtle Y shift: -12px to +12px
          const shift = (progress - 0.5) * -18;
          ctr.style.transform = `translateY(${shift.toFixed(1)}px)`;
        });
        ticking = false;
      });
    }
    window.addEventListener('scroll', onParallaxScroll, {passive:true});
  }

  /* ══════════════════════════════════════════
     5. FAVICON
  ══════════════════════════════════════════ */
  function setFavicon(lang){
    const canvas = document.createElement('canvas');
    canvas.width = 64; canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 64, 64);
    ctx.fillStyle = '#E2E8F4';
    ctx.font = 'bold 20px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(lang === 'ru' ? 'РОКА' : 'ROKA', 32, 34);
    const link = document.querySelector("link[rel='icon']") || document.createElement('link');
    link.rel = 'icon'; link.type = 'image/png';
    link.href = canvas.toDataURL();
    if(!document.querySelector("link[rel='icon']")) document.head.appendChild(link);
  }

  /* ── Nav scroll ── */
  function initNav(){
    const nav = document.querySelector('.nav');
    if(!nav) return;
    const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 80);
    window.addEventListener('scroll', onScroll, {passive:true});
    onScroll();
  }

  /* ── Mobile menu ── */
  function initMobileMenu(){
    const burger = document.querySelector('.burger');
    const menu   = document.querySelector('.mob-menu');
    const close  = document.querySelector('.mob-close');
    if(!burger || !menu) return;
    burger.addEventListener('click', () => { menu.classList.add('open'); document.body.style.overflow='hidden'; });
    const closeMenu = () => { menu.classList.remove('open'); document.body.style.overflow=''; };
    if(close) close.addEventListener('click', closeMenu);
    menu.querySelectorAll('a').forEach(a => a.addEventListener('click', closeMenu));
    document.addEventListener('keydown', e => { if(e.key==='Escape') closeMenu(); });
  }

  /* ── Language ── */
  const DEFAULT_LANG = localStorage.getItem('roka_lang') || 'ru';

  function initCurtain(lang){
    const c = document.querySelector('.curtain');
    if(!c) return;
    setTimeout(() => { c.style.pointerEvents = 'none'; c.style.visibility = 'hidden'; }, 2000);
  }

  function initLang(){
    const btns = document.querySelectorAll('.lang-sw button');
    btns.forEach(btn => {
      if(btn.dataset.lang === DEFAULT_LANG) btn.classList.add('on');
      btn.addEventListener('click', () => {
        const l = btn.dataset.lang;
        localStorage.setItem('roka_lang', l);
        btns.forEach(b => b.classList.toggle('on', b.dataset.lang === l));
        setFavicon(l);
        applyLang(l);
      });
    });
    applyLang(DEFAULT_LANG);
    setFavicon(DEFAULT_LANG);
    initCurtain(DEFAULT_LANG);
  }

  function applyLang(lang){
    document.querySelectorAll('[data-ru],[data-en]').forEach(el => {
      const txt = el.getAttribute(`data-${lang}`);
      if(txt !== null) el.textContent = txt;
    });
    document.querySelectorAll('[data-ru-html],[data-en-html]').forEach(el => {
      const txt = el.getAttribute(`data-${lang}-html`);
      if(txt !== null) el.innerHTML = txt;
    });
    document.querySelectorAll('.logo-text').forEach(el => {
      el.textContent = lang === 'ru' ? 'РОКА' : 'ROKA';
    });
  }

  /* ── Active nav link ── */
  function initActiveLink(){
    const path = location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.nav-links a, .mob-menu a').forEach(a => {
      const href = a.getAttribute('href');
      if(href === path || (path === '' && href === 'index.html')) a.classList.add('active');
    });
  }

  /* ── Counter ── */
  function initCounters(){
    document.querySelectorAll('[data-count]').forEach(el => {
      const target = parseFloat(el.dataset.count);
      const suffix = el.dataset.suffix || '';
      const dur = 1800;
      let start = null;
      const io = new IntersectionObserver(([entry]) => {
        if(!entry.isIntersecting) return;
        io.disconnect();
        (function anim(ts){
          if(!start) start=ts;
          const p = Math.min((ts-start)/dur,1);
          const ease = 1-Math.pow(1-p,3);
          const val = target < 100 ? (ease*target).toFixed(target%1?1:0) : Math.round(ease*target);
          el.textContent = val + suffix;
          if(p<1) requestAnimationFrame(anim);
        })(performance.now());
      },{threshold:0.5});
      io.observe(el);
    });
  }

  /* ── Init ── */
  document.addEventListener('DOMContentLoaded', () => {
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
