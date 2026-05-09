/* ─────────────────────────────────────────────────────────────
   ПАВЕЛ САВИНКИН · script.js
   1. Прогресс-бар сверху + граница топбара при скролле.
   2. Reveal текстовых блоков.
   3. Прорисовка SVG-линий (.line--scroll) по мере скролла.
   4. Авто-тема: тёмная с 22:30 до 07:00. Тоггл циклически меняет
      auto → light → dark → auto и сохраняет выбор в localStorage.
   ───────────────────────────────────────────────────────────── */

(() => {

  const REDUCE = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── 1. PROGRESS / TOPBAR ─────────────────────────────────── */
  const progress = document.querySelector('.progress');
  const topbar   = document.querySelector('.topbar');

  function onScroll() {
    const h = document.documentElement;
    const total = h.scrollHeight - h.clientHeight;
    const pct = total > 0 ? (h.scrollTop / total) * 100 : 0;
    if (progress) progress.style.width = pct + '%';
    if (topbar) topbar.classList.toggle('is-scrolled', h.scrollTop > 8);
    updateLines();
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });


  /* ── 2. REVEAL ────────────────────────────────────────────── */
  const reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          e.target.classList.add('is-in');
          io.unobserve(e.target);
        }
      }
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    reveals.forEach(el => io.observe(el));
  } else {
    reveals.forEach(el => el.classList.add('is-in'));
  }


  /* ── 3. LINES ON SCROLL ───────────────────────────────────── */
  const lines = Array.from(document.querySelectorAll('.line--scroll'));
  const groups = new Map();
  lines.forEach((el) => {
    const svg = el.closest('svg');
    if (!svg) return;
    if (!groups.has(svg)) groups.set(svg, []);
    groups.get(svg).push(el);
  });

  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function easeOut(t) { return 1 - Math.pow(1 - t, 2.4); }

  function updateLines() {
    if (REDUCE) return;
    const vh = window.innerHeight;
    groups.forEach((els, svg) => {
      const r = svg.getBoundingClientRect();
      const start = vh * 0.95;
      const end   = vh * 0.15;
      let p = (start - r.top) / (start - end);
      p = clamp01(p);
      const heightFactor = Math.min(1, vh / Math.max(r.height, 1));
      const eased = easeOut(p * (0.6 + 0.4 * heightFactor));
      els.forEach((el, i) => {
        const delay = i * 0.06;
        const local = clamp01((eased - delay) / Math.max(0.001, 1 - delay));
        el.style.strokeDashoffset = (1 - local).toFixed(4);
      });
    });
  }

  if (!REDUCE) {
    updateLines();
    window.addEventListener('load', updateLines);
  } else {
    lines.forEach(el => el.style.strokeDashoffset = 0);
  }


  /* ── 4. SMOOTH ANCHOR ─────────────────────────────────────── */
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href').slice(1);
      if (!id) return;
      const target = document.getElementById(id);
      if (!target) return;
      e.preventDefault();
      const top = target.getBoundingClientRect().top + window.scrollY - 60;
      window.scrollTo({ top, behavior: 'smooth' });
    });
  });


  /* ── 5. THEME (auto / light / dark) ───────────────────────── */
  /*
     Auto: тёмная тема с 22:30 до 07:00 по локальному времени.
     Пользователь может зациклить тоггл: auto → light → dark → auto.
     Выбор сохраняется в localStorage и переопределяет авто-режим.
   */
  const STORAGE_KEY = 'pc-theme-mode';
  const MODES = ['auto', 'light', 'dark'];
  const LABELS = { auto: 'Авто', light: 'День', dark: 'Ночь' };
  const toggleBtn   = document.querySelector('.theme-toggle');
  const toggleLabel = document.querySelector('.theme-toggle__label');

  function isNightTime(now = new Date()) {
    const minutes = now.getHours() * 60 + now.getMinutes();
    // ночь: с 22:30 (1350) до 07:00 (420) — переход через полночь
    return minutes >= 22 * 60 + 30 || minutes < 7 * 60;
  }

  function effectiveTheme(mode) {
    if (mode === 'light' || mode === 'dark') return mode;
    return isNightTime() ? 'dark' : 'light';
  }

  function applyTheme() {
    const mode = localStorage.getItem(STORAGE_KEY) || 'auto';
    const theme = effectiveTheme(mode);
    document.documentElement.setAttribute('data-theme', theme);
    document.querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', theme === 'dark' ? '#0e0d12' : '#f6f4ee');
    if (toggleLabel) toggleLabel.textContent = LABELS[mode];
    if (toggleBtn) toggleBtn.setAttribute('title', `Тема: ${LABELS[mode]} (сейчас ${theme === 'dark' ? 'ночь' : 'день'})`);
  }

  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      const current = localStorage.getItem(STORAGE_KEY) || 'auto';
      const next = MODES[(MODES.indexOf(current) + 1) % MODES.length];
      localStorage.setItem(STORAGE_KEY, next);
      applyTheme();
    });
  }

  applyTheme();
  // Авто-режим перепроверяет тему раз в минуту.
  setInterval(() => {
    const mode = localStorage.getItem(STORAGE_KEY) || 'auto';
    if (mode === 'auto') applyTheme();
  }, 60 * 1000);

})();
