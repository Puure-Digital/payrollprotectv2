// Footer: the last instrument.
// - A field of points behind everything (the grid itself is a CSS background; this canvas draws
//   only the lit points). Points near the pointer brighten and turn green, following it on a
//   damped ease; a slow scan crosses the field every few seconds. Drawn only while the footer is
//   on screen, and with a fine pointer only for the pointer part.
// - The company's name across the full width, sized to fit, outlined, then filled behind a scan of
//   light as the page reaches its end (scrubbed, so it reverses), and marked Verified.
// - A live London clock, and a back-to-top control whose ring shows how far down the page you are.
// Reduced motion: no lit points or scan; the name is shown filled and verified.
import { RM, FINE, qs, qsa, clamp } from './util.js';
import { live } from './engine.js';

const GAP = 24;          // must match the CSS dot grid (.foot background-size)
const REACH = 150;       // pointer radius, px
const SWEEP = 7;         // seconds for the scan to cross the field

function field(foot) {
  const cv = qs('.foot__field', foot);
  if (!cv || RM) return;
  const ctx = cv.getContext('2d');
  let W = 0, H = 0, dpr = 1, running = false, t0 = 0;
  const ptr = { x: -1e4, y: -1e4, tx: -1e4, ty: -1e4, on: 0, ton: 0 };

  function size() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = foot.clientWidth;
    H = foot.clientHeight;
    cv.width = Math.round(W * dpr);
    cv.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  // One lit point: brighter, larger and greener the stronger it is lit.
  function dot(x, y, g) {
    const s = 1.6 + g * 1.6;
    ctx.globalAlpha = Math.min(1, 0.1 + g * 0.9);
    ctx.fillRect(x - s / 2, y - s / 2, s, s);
  }
  function frame() {
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#0FD76A';
    // The pointer, eased toward where it is.
    ptr.x += (ptr.tx - ptr.x) * 0.18;
    ptr.y += (ptr.ty - ptr.y) * 0.18;
    ptr.on += (ptr.ton - ptr.on) * 0.12;
    const lit = new Map();
    if (ptr.on > 0.01) {
      const c0 = Math.max(0, Math.floor((ptr.x - REACH) / GAP)), c1 = Math.floor((ptr.x + REACH) / GAP);
      const r0 = Math.max(0, Math.floor((ptr.y - REACH) / GAP)), r1 = Math.floor((ptr.y + REACH) / GAP);
      for (let r = r0; r <= r1; r++) {
        for (let c = c0; c <= c1; c++) {
          const x = c * GAP + GAP / 2, y = r * GAP + GAP / 2;
          const d = Math.hypot(x - ptr.x, y - ptr.y);
          if (d < REACH) { const k = 1 - d / REACH; lit.set(r * 10000 + c, [x, y, k * k * ptr.on]); }
        }
      }
    }
    // The scan: a soft band of light crossing the field, left to right.
    const ph = (((performance.now() - t0) / 1000) % SWEEP) / SWEEP;
    const sx = -160 + ph * (W + 320), band = 120;
    const s0 = Math.max(0, Math.floor((sx - band) / GAP)), s1 = Math.floor((sx + band) / GAP);
    const rows = Math.ceil(H / GAP);
    for (let c = s0; c <= s1; c++) {
      const x = c * GAP + GAP / 2;
      const k = 1 - Math.abs(x - sx) / band;
      if (k <= 0 || x > W) continue;
      for (let r = 0; r < rows; r++) {
        const key = r * 10000 + c, prev = lit.get(key), g = k * k * 0.42;
        if (!prev || prev[2] < g) lit.set(key, [x, r * GAP + GAP / 2, g]);
      }
    }
    lit.forEach(([x, y, g]) => dot(x, y, g));
    ctx.globalAlpha = 1;
  }
  const tick = () => frame();
  function start() {
    if (running) return;
    running = true;
    size();
    if (!t0) t0 = performance.now();
    gsap.ticker.add(tick);
  }
  function stop() {
    if (!running) return;
    running = false;
    gsap.ticker.remove(tick);
    ctx.clearRect(0, 0, W, H);
  }
  live(foot, start, stop);
  window.addEventListener('resize', () => { if (running) size(); });
  if (FINE) {
    foot.addEventListener('pointermove', (e) => {
      const b = foot.getBoundingClientRect();
      ptr.tx = e.clientX - b.left;
      ptr.ty = e.clientY - b.top;
      if (ptr.on < 0.01) { ptr.x = ptr.tx; ptr.y = ptr.ty; }
      ptr.ton = 1;
    });
    foot.addEventListener('pointerleave', () => { ptr.ton = 0; });
  }
}

function mark(foot) {
  const m = qs('.foot__mark', foot);
  if (!m) return;
  const words = qsa('.foot__word', m);
  const clip = qs('.foot__clip', m), fill = qs('.foot__word--fill', m);
  const scan = qs('.foot__scan', m), tag = qs('.foot__tag', m);

  // The name fills the width between the gutters, whatever the screen and font.
  function fit() {
    words.forEach((w) => { w.style.fontSize = ''; });
    const pad = parseFloat(getComputedStyle(m).paddingLeft) || 0;
    const room = m.clientWidth - pad * 2;
    const probe = words[0];
    probe.style.display = 'inline-block';
    const width = probe.getBoundingClientRect().width;
    probe.style.display = '';
    if (!width) return;
    const size = parseFloat(getComputedStyle(probe).fontSize) * (room / width);
    words.forEach((w) => { w.style.fontSize = size.toFixed(2) + 'px'; });
  }
  fit();
  // boot.js re-measures the page once late fonts are in, after this fit.
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
  window.addEventListener('resize', fit);

  // The window slides in from the left and the fill slides back by the same distance, so the
  // letters stay put under their outlines while the window reveals them.
  let span = m.clientWidth, at = 0;
  window.addEventListener('resize', () => { span = m.clientWidth; set(at); });
  function set(p) {
    at = p;
    const dx = (p - 1) * span;
    gsap.set(clip, { x: dx });
    gsap.set(fill, { x: -dx });
    gsap.set(scan, { xPercent: p * 100, opacity: clamp(p / 0.04, 0, 1) * clamp((1 - p) / 0.04, 0, 1) });
  }
  if (RM) {
    set(1);
    gsap.set(tag, { opacity: 1, y: 0 });
    return;
  }
  set(0);
  // The page cannot scroll past its end, so the scan plays in time once the name is in view
  // (and runs back if the reader scrolls up past it): the scan crosses, then Verified lands.
  const st = { p: 0 };
  const tl = gsap.timeline({ paused: true })
    .to(st, { p: 1, duration: 1.4, ease: 'springSoft', onUpdate: () => set(st.p) }, 0)
    .to(tag, { opacity: 1, y: 0, duration: 0.45, ease: 'spring' }, 1.05);
  ScrollTrigger.create({
    trigger: m, start: 'top 96%',
    onEnter: () => tl.timeScale(1).play(),
    onLeaveBack: () => tl.timeScale(1.6).reverse(),
  });
}

function clock(foot) {
  const el = qs('[data-clock]', foot);
  if (!el) return;
  const fmt = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  const tick = () => { el.textContent = fmt.format(new Date()); };
  tick();
  let timer = 0;
  const run = () => { tick(); clearInterval(timer); timer = setInterval(tick, 1000); };
  if (RM) { setInterval(tick, 1000); return; }
  live(foot, run, () => clearInterval(timer));
}

function ring(foot) {
  const fg = qs('.foot__ring-fg', foot);
  if (!fg) return;
  ScrollTrigger.create({
    start: 0, end: 'max',
    onUpdate: (self) => { fg.style.strokeDashoffset = (1 - self.progress).toFixed(4); },
    onRefresh: (self) => { fg.style.strokeDashoffset = (1 - self.progress).toFixed(4); },
  });
}

export function initFoot() {
  const foot = qs('.foot');
  if (!foot) return;
  field(foot);
  mark(foot);
  clock(foot);
  ring(foot);
}
