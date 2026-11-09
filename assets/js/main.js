(() => {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Animated node network ---------- */
  const canvas = document.getElementById('network');
  const ctx = canvas.getContext('2d');
  const TEAL = '46, 230, 197';
  const BLUE = '77, 163, 255';
  let w = 0, h = 0, dpr = 1, nodes = [], packets = [], linkDist = 150, rafId = 0, lastSpawn = 0;
  const pointer = { x: -9999, y: -9999 };

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    linkDist = w < 640 ? 110 : 150;
    const count = Math.round(Math.min(120, Math.max(36, (w * h) / 13000)));
    nodes = Array.from({ length: count }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.28,
      vy: (Math.random() - 0.5) * 0.28,
      r: Math.random() * 1.4 + 0.8,
      hub: Math.random() < 0.08,
    }));
    packets = [];
  }

  function spawnPacket() {
    const a = nodes[(Math.random() * nodes.length) | 0];
    let best = null, bestD = linkDist;
    for (const b of nodes) {
      if (b === a) continue;
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (d < bestD && d > 40) { best = b; bestD = d; }
    }
    if (best) packets.push({ a, b: best, t: 0, speed: 0.008 + Math.random() * 0.01, blue: Math.random() < 0.35 });
  }

  function draw(time) {
    ctx.clearRect(0, 0, w, h);

    for (const n of nodes) {
      n.x += n.vx; n.y += n.vy;
      if (n.x < -20) n.x = w + 20; else if (n.x > w + 20) n.x = -20;
      if (n.y < -20) n.y = h + 20; else if (n.y > h + 20) n.y = -20;
    }

    // Links between nearby nodes
    for (let i = 0; i < nodes.length; i++) {
      const a = nodes[i];
      for (let j = i + 1; j < nodes.length; j++) {
        const b = nodes[j];
        const dx = a.x - b.x, dy = a.y - b.y;
        if (Math.abs(dx) > linkDist || Math.abs(dy) > linkDist) continue;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < linkDist) {
          ctx.strokeStyle = `rgba(${TEAL}, ${(1 - d / linkDist) * 0.3})`;
          ctx.lineWidth = 0.7;
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        }
      }
      // Links to the pointer
      const pd = Math.hypot(a.x - pointer.x, a.y - pointer.y);
      if (pd < 190) {
        ctx.strokeStyle = `rgba(${BLUE}, ${(1 - pd / 190) * 0.45})`;
        ctx.lineWidth = 0.8;
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(pointer.x, pointer.y); ctx.stroke();
      }
    }

    // Nodes
    for (const n of nodes) {
      if (n.hub) {
        ctx.fillStyle = `rgba(${TEAL}, 0.12)`;
        ctx.beginPath(); ctx.arc(n.x, n.y, n.r * 4.5, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = n.hub ? `rgba(${TEAL}, 0.95)` : 'rgba(170, 200, 225, 0.55)';
      ctx.beginPath(); ctx.arc(n.x, n.y, n.hub ? n.r + 0.9 : n.r, 0, Math.PI * 2); ctx.fill();
    }

    // Packets travelling along links
    if (time - lastSpawn > 260 && packets.length < 18) { spawnPacket(); lastSpawn = time; }
    packets = packets.filter((p) => {
      p.t += p.speed;
      if (p.t >= 1 || Math.hypot(p.a.x - p.b.x, p.a.y - p.b.y) > linkDist) return false;
      const x = p.a.x + (p.b.x - p.a.x) * p.t;
      const y = p.a.y + (p.b.y - p.a.y) * p.t;
      const c = p.blue ? BLUE : TEAL;
      const g = ctx.createRadialGradient(x, y, 0, x, y, 7);
      g.addColorStop(0, `rgba(${c}, 0.9)`);
      g.addColorStop(1, `rgba(${c}, 0)`);
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(x, y, 7, 0, Math.PI * 2); ctx.fill();
      return true;
    });

    rafId = requestAnimationFrame(draw);
  }

  function start() {
    cancelAnimationFrame(rafId);
    if (reduceMotion) {
      // Single static frame: network without motion.
      for (const n of nodes) { n.vx = 0; n.vy = 0; }
      draw(0);
      cancelAnimationFrame(rafId);
      return;
    }
    rafId = requestAnimationFrame(draw);
  }

  let resizeTimer = 0;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { resize(); start(); }, 150);
  });
  window.addEventListener('pointermove', (e) => { pointer.x = e.clientX; pointer.y = e.clientY; }, { passive: true });
  document.addEventListener('pointerleave', () => { pointer.x = pointer.y = -9999; });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) cancelAnimationFrame(rafId); else start();
  });

  resize();
  start();

  /* ---------- Reveal on scroll ---------- */
  const revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && !reduceMotion) {
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      }
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    revealEls.forEach((el) => io.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add('in'));
  }

  /* ---------- Active nav link ---------- */
  const links = new Map([...document.querySelectorAll('.nav-links a[href^="#"]')].map((a) => [a.getAttribute('href').slice(1), a]));
  if ('IntersectionObserver' in window) {
    const so = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          links.forEach((a) => a.classList.remove('active'));
          const a = links.get(e.target.id);
          if (a) a.classList.add('active');
        }
      }
    }, { rootMargin: '-45% 0px -50% 0px' });
    links.forEach((_, id) => { const s = document.getElementById(id); if (s) so.observe(s); });
  }

  /* ---------- Mobile nav ---------- */
  const toggle = document.querySelector('.nav-toggle');
  const menu = document.getElementById('nav-links');
  toggle.addEventListener('click', () => {
    const open = toggle.getAttribute('aria-expanded') === 'true';
    toggle.setAttribute('aria-expanded', String(!open));
    menu.classList.toggle('open', !open);
  });
  menu.addEventListener('click', (e) => {
    if (e.target.closest('a')) { toggle.setAttribute('aria-expanded', 'false'); menu.classList.remove('open'); }
  });

  /* ---------- Email (assembled at runtime to deter address harvesters) ---------- */
  const mail = document.getElementById('email-link');
  if (mail) {
    mail.href = 'mailto:' + mail.dataset.u + '@' + mail.dataset.d;
    mail.removeAttribute('target');
    mail.removeAttribute('rel');
  }
})();
