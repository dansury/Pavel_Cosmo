/* ─────────────────────────────────────────────────────────────
   ПАВЕЛ САВИНКИН · script.js
   Минималистичные скролл-анимации:
   1. Прогресс-бар сверху.
   2. Reveal текстовых блоков.
   3. Отрисовка тонких линий (SVG) по мере скролла —
      stroke-dashoffset завязан на положение элемента в viewport.
   4. Тонкое поведение топбара (граница при скролле).
   ───────────────────────────────────────────────────────────── */

(() => {

  const REDUCE = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── 1. PROGRESS BAR ──────────────────────────────────────── */
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


  /* ── 3. LINE DRAWING ON SCROLL ────────────────────────────── */
  /*
     Каждая SVG-линия с классом .line--scroll получает
     stroke-dasharray: 1 и stroke-dashoffset: 1 (через CSS).
     Скрипт смотрит, какую часть viewport проходит её SVG-родитель,
     и плавно сводит dashoffset от 1 (невидимо) до 0 (нарисовано).
   */
  const lines = Array.from(document.querySelectorAll('.line--scroll'));
  // Группируем по ближайшему SVG, чтобы один раз считать его прогресс.
  const groups = new Map();
  lines.forEach((el) => {
    const svg = el.closest('svg');
    if (!svg) return;
    if (!groups.has(svg)) groups.set(svg, []);
    groups.get(svg).push(el);
  });

  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  // Кубическая лёгкая ease-out, чтобы линия рисовалась плавно.
  function easeOut(t) { return 1 - Math.pow(1 - t, 2.4); }

  function updateLines() {
    if (REDUCE) return;
    const vh = window.innerHeight;
    groups.forEach((els, svg) => {
      const r = svg.getBoundingClientRect();
      // Прогресс: 0, когда верх SVG только-только зашёл в viewport,
      // 1 — когда низ SVG поднялся на 30% сверху экрана.
      const start = vh * 0.95;             // верх SVG ниже этой линии = 0
      const end   = vh * 0.15;             // верх SVG выше этой линии = 1
      let p = (start - r.top) / (start - end);
      p = clamp01(p);
      // Дополнительно учитываем размер SVG (для длинных секций).
      const heightFactor = Math.min(1, vh / Math.max(r.height, 1));
      const eased = easeOut(p * (0.6 + 0.4 * heightFactor));
      const dashOffset = (1 - eased).toFixed(4);
      els.forEach((el, i) => {
        // Лёгкий каскад между линиями внутри одной группы.
        const delay = i * 0.06;
        const local = clamp01((eased - delay) / Math.max(0.001, 1 - delay));
        el.style.strokeDashoffset = (1 - local).toFixed(4);
      });
      // подавляем линт — переменная нужна была для подсчёта
      void dashOffset;
    });
  }

  // Инициализация.
  if (!REDUCE) {
    updateLines();
    // Дополнительный проход после загрузки шрифтов/изображений.
    window.addEventListener('load', updateLines);
  } else {
    lines.forEach(el => el.style.strokeDashoffset = 0);
  }


  /* ── 4. SMOOTH ANCHOR (учитывает фикс. шапку) ─────────────── */
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

})();
