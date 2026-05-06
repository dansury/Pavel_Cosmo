/* ─────────────────────────────────────────────────────────────
   КОСМОЭНЕРГЕТИКА · script.js
   1. Звёздное поле (canvas) — двухслойный параллакс + редкие
      «кванты», которые вспыхивают на ходу.
   2. Курсор-аура — мягкое свечение, идущее за указателем.
   3. Reveal — секции и карточки появляются на скролле.
   4. Чакра-rail — подсветка активного узла во время скролла.
   ───────────────────────────────────────────────────────────── */

(() => {

  /* ── Reduced motion guard ─────────────────────────────────── */
  const REDUCE = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ════════════════════════════════════════════════════════════
     1. STARFIELD
     ════════════════════════════════════════════════════════════ */
  const canvas = document.getElementById('starfield');
  const ctx = canvas.getContext('2d');
  let dpr = Math.min(window.devicePixelRatio || 1, 2);
  let stars = [];
  let quanta = [];
  let w = 0, h = 0;
  let scrollY = 0;

  const STAR_COUNT = 220;
  const QUANTA_MAX = 18;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.width  = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width  = w + 'px';
    canvas.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    seedStars();
  }

  function rand(a, b) { return a + Math.random() * (b - a); }

  function seedStars() {
    stars = [];
    for (let i = 0; i < STAR_COUNT; i++) {
      const depth = Math.random();              // 0..1, ближе = крупнее
      stars.push({
        x: Math.random() * w,
        y: Math.random() * h * 1.4,
        z: depth,
        r: depth * 1.6 + 0.2,
        tw: Math.random() * Math.PI * 2,        // фаза мерцания
        tws: rand(0.005, 0.02),                 // скорость мерцания
        hue: Math.random() < 0.85 ? 0 : (Math.random() < 0.5 ? 280 : 38) // редкие цветные
      });
    }
  }

  function spawnQuant() {
    if (quanta.length >= QUANTA_MAX) return;
    quanta.push({
      x: Math.random() * w,
      y: Math.random() * h,
      r: 0,
      maxR: rand(40, 90),
      life: 0,
      maxLife: rand(70, 130),
      hue: [38, 200, 320][Math.floor(Math.random() * 3)]
    });
  }

  function drawStar(s) {
    s.tw += s.tws;
    const flicker = 0.55 + Math.sin(s.tw) * 0.45;
    const yWithScroll = s.y - scrollY * (0.06 + s.z * 0.18);
    const yy = ((yWithScroll % (h * 1.4)) + h * 1.4) % (h * 1.4) - h * 0.2;

    ctx.beginPath();
    if (s.hue === 0) {
      ctx.fillStyle = `rgba(255,255,255,${flicker * (0.4 + s.z * 0.6)})`;
    } else {
      ctx.fillStyle = `hsla(${s.hue}, 90%, 75%, ${flicker * (0.5 + s.z * 0.5)})`;
    }
    ctx.arc(s.x, yy, s.r, 0, Math.PI * 2);
    ctx.fill();

    // glow для крупных
    if (s.z > 0.7) {
      ctx.beginPath();
      ctx.fillStyle = (s.hue === 0)
        ? `rgba(255,255,255,${flicker * 0.06})`
        : `hsla(${s.hue}, 90%, 70%, ${flicker * 0.08})`;
      ctx.arc(s.x, yy, s.r * 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawQuant(q) {
    q.life++;
    q.r = q.maxR * (q.life / q.maxLife);
    const alpha = (1 - q.life / q.maxLife) * 0.5;
    const grd = ctx.createRadialGradient(q.x, q.y, 0, q.x, q.y, q.r);
    grd.addColorStop(0, `hsla(${q.hue}, 100%, 70%, ${alpha})`);
    grd.addColorStop(0.6, `hsla(${q.hue}, 100%, 60%, ${alpha * 0.2})`);
    grd.addColorStop(1, `hsla(${q.hue}, 100%, 60%, 0)`);
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(q.x, q.y, q.r, 0, Math.PI * 2);
    ctx.fill();
  }

  let frame = 0;
  function loop() {
    ctx.clearRect(0, 0, w, h);
    for (const s of stars) drawStar(s);

    if (frame % 60 === 0 && Math.random() < 0.7) spawnQuant();
    quanta = quanta.filter(q => q.life < q.maxLife);
    for (const q of quanta) drawQuant(q);

    frame++;
    requestAnimationFrame(loop);
  }

  resize();
  window.addEventListener('resize', resize, { passive: true });
  if (!REDUCE) requestAnimationFrame(loop);

  /* ════════════════════════════════════════════════════════════
     2. CURSOR AURA
     ════════════════════════════════════════════════════════════ */
  const glow = document.querySelector('.cursor-glow');
  let mx = 0, my = 0, gx = 0, gy = 0;

  if (!REDUCE && glow && !matchMedia('(hover: none)').matches) {
    document.addEventListener('mousemove', (e) => {
      mx = e.clientX; my = e.clientY;
      glow.style.opacity = '1';
    }, { passive: true });

    document.addEventListener('mouseleave', () => {
      glow.style.opacity = '0';
    });

    function follow() {
      gx += (mx - gx) * 0.12;
      gy += (my - gy) * 0.12;
      glow.style.transform = `translate(${gx}px, ${gy}px) translate(-50%, -50%)`;
      requestAnimationFrame(follow);
    }
    follow();
  }

  /* ════════════════════════════════════════════════════════════
     3. SCROLL EFFECTS — parallax + reveal
     ════════════════════════════════════════════════════════════ */
  function onScroll() {
    scrollY = window.scrollY;
  }
  window.addEventListener('scroll', onScroll, { passive: true });

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

  /* ════════════════════════════════════════════════════════════
     4. CHAKRA RAIL — active section tracking
     ════════════════════════════════════════════════════════════ */
  const sections = Array.from(document.querySelectorAll('main section[id]'));
  const railNodes = Array.from(document.querySelectorAll('.chakra-rail__node'));
  const idToNode = {};
  railNodes.forEach(n => {
    const href = n.getAttribute('href').replace('#', '');
    idToNode[href] = n;
  });

  if ('IntersectionObserver' in window) {
    const io2 = new IntersectionObserver((entries) => {
      for (const e of entries) {
        const id = e.target.id;
        const node = idToNode[id];
        if (!node) continue;
        if (e.isIntersecting) {
          railNodes.forEach(n => n.classList.remove('is-active'));
          node.classList.add('is-active');
        }
      }
    }, { threshold: 0.45 });
    sections.forEach(s => io2.observe(s));
  }

  /* ════════════════════════════════════════════════════════════
     5. SUBTLE TILT ON HERO ORBIT (mouse-look)
     ════════════════════════════════════════════════════════════ */
  const orbit = document.querySelector('.hero__orbit');
  if (orbit && !REDUCE && !matchMedia('(hover: none)').matches) {
    const hero = document.getElementById('hero');
    hero.addEventListener('mousemove', (e) => {
      const rect = hero.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top  + rect.height / 2;
      const dx = (e.clientX - cx) / rect.width;
      const dy = (e.clientY - cy) / rect.height;
      orbit.style.transform = `perspective(1200px) rotateY(${dx * 6}deg) rotateX(${-dy * 6}deg)`;
    });
    hero.addEventListener('mouseleave', () => {
      orbit.style.transform = '';
    });
  }

})();
