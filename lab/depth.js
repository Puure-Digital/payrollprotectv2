// 3D lab: three prototypes to choose from, built on the site's own CSS and markup.
// 1. Invoice in depth: the invoice lies back as the scan runs; held lines lift toward you.
// 2. Starlink globe: a dot-matrix Earth turns to the UK; a gate's check-ins climb to a satellite
//    and come down to UK servers, handing over as satellites pass.
// 3. Hero depth: the film, frame, words and card sit on separate planes that answer the pointer.
// Transform and opacity only (and canvas). Reduced motion (or ?motion=reduce) shows each finished.
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches || /[?&]motion=reduce\b/.test(location.search);
const FINE = matchMedia('(hover: hover) and (pointer: fine)').matches;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const seg = (p, a, b) => clamp((p - a) / (b - a), 0, 1);
const smooth = (t) => t * t * t * (t * (t * 6 - 15) + 10);
const gbp = (n) => '£' + Math.round(n).toLocaleString('en-GB');

// ---------- lab chrome ----------
const bar = document.querySelector('.lbar');
const setBar = () => document.documentElement.style.setProperty('--bar', bar.offsetHeight + 'px');
setBar();
addEventListener('resize', setBar);
document.querySelector(`[data-motion="${RM ? 'reduce' : 'full'}"]`).setAttribute('aria-current', 'true');

// Smooth scroll, as on the site.
let lenis = null;
if (!RM && window.Lenis) {
  lenis = new window.Lenis({ lerp: 0.11 });
  requestAnimationFrame(function raf(t) { lenis.raf(t); requestAnimationFrame(raf); });
}
document.querySelectorAll('.lbar a[href^="#"]').forEach((a) => a.addEventListener('click', (e) => {
  e.preventDefault();
  const el = document.querySelector(a.getAttribute('href'));
  const y = el.getBoundingClientRect().top + scrollY - bar.offsetHeight;
  if (lenis) lenis.scrollTo(y, { duration: 1.1 }); else scrollTo(0, y);
}));

// Scroll progress through each tall section: 0 as its stage pins, 1 as it lets go.
const scenes = [];
const progress = (el) => clamp(-(el.getBoundingClientRect().top - bar.offsetHeight) / (el.offsetHeight - (innerHeight - bar.offsetHeight)), 0, 1);
function onScroll() { scenes.forEach((s) => s.set(RM ? 1 : progress(s.el))); }
if (lenis) lenis.on('scroll', onScroll); else addEventListener('scroll', onScroll, { passive: true });
addEventListener('resize', onScroll);

// Navigation highlight: the prototype in view.
const navLinks = [...document.querySelectorAll('.lbar nav:first-of-type a')];
new IntersectionObserver((es) => es.forEach((e) => {
  if (e.isIntersecting) navLinks.forEach((a) => a.setAttribute('aria-current', String(a.getAttribute('href') === '#' + e.target.id)));
}), { rootMargin: '-45% 0px -50% 0px' }).observe(document.getElementById('p1'));
['p2', 'p3'].forEach((id) => document.getElementById(id) && navLinks.length && new IntersectionObserver((es) => es.forEach((e) => {
  if (e.isIntersecting) navLinks.forEach((a) => a.setAttribute('aria-current', String(a.getAttribute('href') === '#' + id)));
}), { rootMargin: '-45% 0px -50% 0px' }).observe(document.getElementById(id)));

// A critically damped spring follower (stiffness 180, the site's), stepped at a fixed rate.
function follower(k = 180) {
  const c = 2 * Math.sqrt(k);
  return {
    x: 0, v: 0, t: 0,
    step(dt) { for (let s = dt; s > 0; s -= 1 / 240) { const h = Math.min(s, 1 / 240); this.v += (-k * (this.x - this.t) - c * this.v) * h; this.x += this.v * h; } },
    settled() { return Math.abs(this.x - this.t) < 1e-4 && Math.abs(this.v) < 1e-4; },
  };
}

// ============================== 1. Invoice in depth ==============================
function invoice(el) {
  const sheet = el.querySelector('.ink__sheet');
  const rows = [...el.querySelectorAll('.mq__row')];
  const scan = el.querySelector('.ink__scan');
  const verEl = el.querySelector('[data-t="ver"]'), heldEl = el.querySelector('[data-t="held"]'), nEl = el.querySelector('.mq__n');
  const vBar = el.querySelector('.mq__v'), xBar = el.querySelector('.mq__x');
  const out = el.querySelector('[data-readout]');
  const data = rows.map((r) => ({ v: Number(r.dataset.v), h: Number(r.dataset.h) }));
  const claimed = data.reduce((s, d) => s + d.v + d.h, 0);
  const small = () => innerWidth < 1024;
  let done = -1, marks = [];

  // Row positions in the sheet's own (untilted) coordinates: the list sits under the sheet's head.
  const top0 = () => rows[0].parentElement.offsetTop;
  function measure() { marks = rows.map((r) => top0() + r.offsetTop + r.offsetHeight / 2); }
  function resolve(k) {
    if (k === done) return;
    done = k;
    rows.forEach((r, i) => r.classList.toggle('is-done', i < k));
    let v = 0, h = 0;
    for (let i = 0; i < k; i++) { v += data[i].v; h += data[i].h; }
    verEl.textContent = gbp(v);
    heldEl.textContent = gbp(h);
    nEl.textContent = k;
    vBar.style.transform = 'scaleX(' + (v / claimed).toFixed(4) + ')';
    xBar.style.transform = 'scaleX(' + (h / claimed).toFixed(4) + ')';
  }
  // 0–0.12: the sheet lies back. 0.12–0.84: the scan runs down it. 0.86–1: it lifts a little, so
  // the result reads straight on, with the held lines still standing off the page.
  function set(p) {
    if (!marks.length) measure();
    const amt = small() ? 0.55 : 1;
    const lay = (smooth(seg(p, 0, 0.12)) - 0.42 * smooth(seg(p, 0.86, 1))) * amt;
    sheet.style.transform = `rotateX(${(30 * lay).toFixed(2)}deg) rotateY(${(-10 * lay).toFixed(2)}deg) rotateZ(${(2.5 * lay).toFixed(2)}deg)`;
    const s = seg(p, 0.12, 0.84);
    const top = top0() + rows[0].offsetTop, bottom = top0() + rows[rows.length - 1].offsetTop + rows[rows.length - 1].offsetHeight;
    const y = lerp(top - 8, bottom + 4, s);
    scan.style.transform = `translate3d(0, ${y.toFixed(1)}px, 3px)`;
    scan.style.opacity = (seg(p, 0.1, 0.14) * (1 - seg(p, 0.84, 0.88))).toFixed(3);
    resolve(marks.filter((m) => m <= y).length);
    out.textContent = 'scroll ' + Math.round(p * 100) + '%';
  }
  addEventListener('resize', () => { marks = []; });
  return set;
}

// ============================== 2. Starlink globe ==============================
async function globe(el) {
  const box = el.querySelector('.gl__box');
  const cv = el.querySelector('.gl__globe'), ov = el.querySelector('.gl__over'), ctx = ov.getContext('2d');
  const labGate = el.querySelector('[data-l="gate"]'), labSrv = el.querySelector('[data-l="srv"]');
  const rLink = el.querySelector('[data-r="link"]'), rSent = el.querySelector('[data-r="sent"]');
  const stage = el.querySelector('.gl');
  let createGlobe;
  try { ({ default: createGlobe } = await import('/site/assets/vendor/cobe.min.js')); }
  catch { stage.classList.add('is-offline'); return () => {}; }

  // COBE's own conventions: a location [lat, lon] as a unit vector, and the phi/theta that put a
  // location at the centre. The overlay projects with the same rotation the globe's shader uses.
  const D = Math.PI / 180;
  const vec = (lat, lon) => { const a = lat * D, o = lon * D - Math.PI, c = Math.cos(a); return [-c * Math.cos(o), Math.sin(a), c * Math.sin(o)]; };
  const centreOn = (lat, lon) => [Math.PI * 1.5 - lon * D, lat * D];
  const GATE = vec(55.0, -1.6);         // illustrative: a site in the north of England
  const SRV = vec(51.5, -0.4);          // illustrative: UK-based servers
  const ORBIT = 1 + 550 / 6371;         // Starlink's main shells, to scale
  const cross = (u, v) => [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
  const norm = (u) => { const l = Math.hypot(u[0], u[1], u[2]); return u.map((x) => x / l); };
  const EAST = norm(cross([0, 1, 0], GATE));
  // One orbital plane, passing over the gate heading east. Its satellites are spaced so one is
  // always within about 950 km of overhead, high enough for the link.
  const orbitAt = (u) => [0, 1, 2].map((i) => ORBIT * (Math.cos(u) * GATE[i] + Math.sin(u) * EAST[i]));
  const SATS = 31, GAP = (Math.PI * 2) / 31;

  let size = 0, dpr = 1, phi = 0, theta = 0, s = 1, drop = 0, p = RM ? 1 : 0, live = !RM, last = performance.now(), clock = 0;
  // The dive: from the whole Earth over the Atlantic down to a low view across the UK, which then
  // sits just under the horizon, so the satellites' height shows against the sky above it.
  // drop: how far the globe's centre sits below the box's centre, in box widths.
  const V0 = { lat: 18, lon: -48, s: 1, drop: 0 };
  const V1 = { lat: -6, lon: 5, s: 2.3, drop: 0.76 };
  const DEBUG = /[?&]debug\b/.test(location.search);
  const drag = { off: 0, vel: 0, down: false, x: 0, t: 0, idle: 0 };
  const back = follower(60);
  let sent = 0, linkI = -1, acquire = 1, packets = [];
  // The still frame (reduced motion) catches the link part-way across the sky.
  if (RM) clock = 1.6;

  function project(g) {
    const cp = Math.cos(phi), sp = Math.sin(phi), ct = Math.cos(theta), st = Math.sin(theta);
    const x = cp * g[0] + sp * g[2];
    const y = sp * st * g[0] + ct * g[1] - cp * st * g[2];
    const z = -sp * ct * g[0] + st * g[1] + cp * ct * g[2];
    const R = size * 0.4 * s;
    return { x: size / 2 + x * R, y: size / 2 + drop * size - y * R, z, hid: z < 0 && x * x + y * y < 1 };
  }
  // Elevation of a satellite seen from the gate, in degrees: the link wants one above ~25°.
  function elevation(s) {
    const d = [s[0] - GATE[0], s[1] - GATE[1], s[2] - GATE[2]];
    const l = Math.hypot(d[0], d[1], d[2]);
    return Math.asin((d[0] * GATE[0] + d[1] * GATE[1] + d[2] * GATE[2]) / l) / D;
  }

  function layout() {
    size = box.clientWidth;
    dpr = Math.min(devicePixelRatio || 1, 2);
    ov.width = ov.height = Math.round(size * dpr);
  }
  layout();

  const globeObj = createGlobe(cv, {
    devicePixelRatio: dpr, width: size * dpr, height: size * dpr,
    phi: 0, theta: 0, dark: 1, diffuse: 1.15, scale: 1,
    mapSamples: 120000, mapBrightness: 3.2,
    baseColor: [0.26, 0.29, 0.31], markerColor: [0.06, 0.84, 0.42], glowColor: [0.1, 0.26, 0.18],
    markers: [], opacity: 0.95,
    onRender: (state) => {
      frame();
      state.phi = phi; state.theta = theta; state.scale = s;
      // COBE's offset is in drawing-buffer pixels and moves the centre by scale × offset / 2.
      state.offset = [0, (2 * drop * size * dpr) / s];
      state.width = size * dpr; state.height = size * dpr;
    },
  });
  requestAnimationFrame(() => stage.classList.add('is-ready'));

  // Drag to spin, with momentum; after a moment's rest it springs back to the story's view.
  box.addEventListener('pointerdown', (e) => { drag.down = true; drag.x = e.clientX; drag.t = performance.now(); drag.vel = 0; box.setPointerCapture(e.pointerId); });
  box.addEventListener('pointermove', (e) => {
    if (!drag.down) return;
    const now = performance.now(), dx = e.clientX - drag.x;
    drag.off += dx * 0.006;
    drag.vel = (dx * 0.006) / Math.max(1, now - drag.t) * 1000;
    drag.x = e.clientX; drag.t = now; drag.idle = 0;
  });
  const up = () => { drag.down = false; drag.idle = 0; back.x = drag.off; back.v = 0; };
  box.addEventListener('pointerup', up);
  box.addEventListener('pointercancel', up);

  function frame() {
    const now = performance.now(), dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (live) clock += dt;
    // Momentum, then a spring home.
    if (!drag.down) {
      if (Math.abs(drag.vel) > 0.02) { drag.off += drag.vel * dt; drag.vel *= Math.pow(0.04, dt); back.x = drag.off; }
      else {
        drag.idle += dt;
        if (drag.idle > 1.2) { back.t = 0; back.step(dt); drag.off = back.x; }
      }
    }
    const k = smooth(seg(p, 0, 0.34));
    const [ph, th] = centreOn(lerp(V0.lat, V1.lat, k), lerp(V0.lon, V1.lon, k));
    phi = ph + drag.off;
    theta = th;
    s = lerp(V0.s, V1.s, k);
    drop = lerp(V0.drop, V1.drop, k);

    const W = ov.width;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, W);
    if (DEBUG) { ctx.strokeStyle = 'rgba(255, 60, 60, 0.9)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(size / 2, size / 2 + drop * size, size * 0.4 * s, 0, Math.PI * 2); ctx.stroke(); }

    // The orbit: a dotted line where it is in front of the Earth or clear of it.
    ctx.fillStyle = 'rgba(242, 244, 244, 0.28)';
    for (let i = 0; i < 220; i++) {
      const q = project(orbitAt((i / 220) * Math.PI * 2));
      if (!q.hid) ctx.fillRect(q.x - 0.6, q.y - 0.6, 1.2, 1.2);
    }

    // Satellites ride the orbit; the pass is sped up.
    const sats = [];
    for (let i = 0; i < SATS; i++) {
      const u = clock * 0.05 + i * GAP;
      const pos = orbitAt(u), q = project(pos);
      sats.push({ u, q, el: elevation(pos) });
      if (q.hid) continue;
      const tail = project(orbitAt(u - 0.035));
      const g = ctx.createLinearGradient(tail.x, tail.y, q.x, q.y);
      g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(255,255,255,0.55)');
      ctx.strokeStyle = g; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(tail.x, tail.y); ctx.lineTo(q.x, q.y); ctx.stroke();
      // A satellite: a body and two panels, square to its path.
      const ang = Math.atan2(q.y - tail.y, q.x - tail.x) + Math.PI / 2;
      ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(ang);
      ctx.fillStyle = '#fff';
      ctx.fillRect(-1.6, -1.6, 3.2, 3.2);
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.fillRect(-7, -0.8, 4, 1.6); ctx.fillRect(3, -0.8, 4, 1.6);
      ctx.restore();
    }

    // The gate pings once the Earth has turned to it.
    const gq = project(GATE), sq = project(SRV);
    const gOn = seg(p, 0.3, 0.38), sOn = seg(p, 0.6, 0.66);
    if (gOn > 0 && !gq.hid) {
      for (let r = 0; r < 2; r++) {
        const ph = ((clock * 0.6 + r * 0.5) % 1);
        ctx.strokeStyle = `rgba(15, 215, 106, ${(0.55 * (1 - ph) * gOn).toFixed(3)})`;
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(gq.x, gq.y, 4 + ph * 16, 0, Math.PI * 2); ctx.stroke();
      }
      dot(gq, 3.2, `rgba(15, 215, 106, ${gOn})`);
    }
    if (sOn > 0 && !sq.hid) { ring(sq, 4, `rgba(15, 215, 106, ${sOn})`); dot(sq, 1.6, `rgba(15, 215, 106, ${sOn})`); }
    place(labGate, gq, gOn, -12, 4);
    place(labSrv, sq, sOn, 12, 6);

    // The link: up to a satellite, then down to the servers. It stays with its satellite until
    // that one sinks below 30°, then hands over to the highest one and draws again.
    const upOn = seg(p, 0.42, 0.56), downOn = seg(p, 0.6, 0.72);
    if (linkI < 0 || sats[linkI].el < 30) {
      let b = -1;
      sats.forEach((x, i) => { if (x.el > 30 && (b < 0 || x.el > sats[b].el)) b = i; });
      if (b !== linkI) { if (linkI >= 0) acquire = 0; linkI = b; }
    }
    const best = linkI >= 0 ? sats[linkI] : null;
    acquire = Math.min(1, acquire + dt * 3.5);
    const online = best && upOn >= 1;
    rLink.textContent = p < 0.3 ? 'Gate 2' : online ? 'Online' : 'Searching';
    rLink.classList.toggle('is-ok', !!online);
    if (best && upOn > 0 && !gq.hid) {
      const bq = best.q;
      beam(gq, bq, upOn * (online ? acquire : 1));
      if (downOn > 0 && !sq.hid) beam(bq, sq, downOn * (online ? acquire : 1));
      // Check-ins travel the link once it is up; each arrival counts as sent.
      if (online && downOn >= 1 && live) {
        if (!packets.length || packets[packets.length - 1].t > 0.45) packets.push({ t: 0 });
        packets.forEach((k2) => { k2.t += dt * 0.9; });
        packets = packets.filter((k2) => { if (k2.t >= 1) { sent++; return false; } return true; });
        packets.forEach((k2) => {
          const a = k2.t < 0.5 ? gq : bq, b = k2.t < 0.5 ? bq : sq, f = k2.t < 0.5 ? k2.t * 2 : k2.t * 2 - 1;
          dot({ x: lerp(a.x, b.x, f), y: lerp(a.y, b.y, f) }, 2.2, '#fff');
        });
      }
    }
    rSent.textContent = RM ? '5' : String(sent);
  }
  function dot(q, r, c) { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(q.x, q.y, r, 0, Math.PI * 2); ctx.fill(); }
  function ring(q, r, c) { ctx.strokeStyle = c; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(q.x, q.y, r, 0, Math.PI * 2); ctx.stroke(); }
  function beam(a, b, f) {
    if (f <= 0) return;
    const x = lerp(a.x, b.x, f), y = lerp(a.y, b.y, f);
    const g = ctx.createLinearGradient(a.x, a.y, x, y);
    g.addColorStop(0, 'rgba(15, 215, 106, 0.95)'); g.addColorStop(1, 'rgba(15, 215, 106, 0.55)');
    ctx.save();
    ctx.shadowColor = 'rgba(15, 215, 106, 0.8)'; ctx.shadowBlur = 8;
    ctx.strokeStyle = g; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(x, y); ctx.stroke();
    ctx.restore();
  }
  function place(lab, q, on, dx, dy) {
    lab.style.transform = `translate(${(q.x + dx).toFixed(1)}px, ${(q.y + dy).toFixed(1)}px)`;
    lab.classList.toggle('is-on', on > 0.5 && !q.hid);
  }

  // Pause the globe off screen.
  new IntersectionObserver(([e]) => { live = e.isIntersecting && !RM; if (globeObj.toggle) globeObj.toggle(e.isIntersecting); }).observe(el);
  addEventListener('resize', () => { layout(); });
  return (v) => { p = v; };
}

// ============================== 3. Hero depth ==============================
function heroDepth(el) {
  const film = el.querySelector('.dh__film'), frameL = el.querySelector('.dh__frame'), text = el.querySelector('.dh__text');
  const holder = el.querySelector('.dh__card'), card = holder.querySelector('.vcard'), body = card.querySelector('.vcard__body');
  const line = el.querySelector('.dh__leader line'), circles = el.querySelectorAll('.dh__leader circle');
  const img = film.querySelector('img');
  el.querySelectorAll('.hero__rail li').forEach((li, i) => { li.style.setProperty('--f', '1'); li.classList.toggle('is-on', i === 2); });
  const time = el.querySelector('.hero__time');
  if (time) time.textContent = '07:41:12';
  const glare = document.createElement('i');
  glare.className = 'dh__glare';
  body.appendChild(glare);
  const note = el.querySelector('.dh__note');
  note.hidden = FINE && !RM;
  if (RM) note.textContent = 'Reduced motion: the still composition, no depth.';

  const portrait = () => matchMedia('(max-width: 1023px) and (max-aspect-ratio: 4/5)').matches;
  const SCALE = 1.03;
  let base = null, on = true;
  const nx = follower(), ny = follower();

  // Where the card and the terminal sit, as on the site (js/hero.js placeCard).
  function measure() {
    const W = el.clientWidth, H = el.clientHeight;
    const ir = portrait() ? 0.6 : 16 / 9, fx = portrait() ? 0.5 : 0.72;
    const anchor = portrait() ? [0.648, 0.371] : [0.8195, 0.371];
    let dw, dh;
    if (W / H > ir) { dw = W; dh = W / ir; } else { dh = H; dw = H * ir; }
    const dx = (W - dw) * fx, dy = (H - dh) * 0.5;
    const ax = dx + anchor[0] * dw, ay = dy + anchor[1] * dh;
    const root = getComputedStyle(document.documentElement);
    const gutter = parseFloat(root.getPropertyValue('--gutter')) || 20;
    const w = card.offsetWidth || 272, h = card.offsetHeight || 134;
    const x = clamp(ax - 30, gutter, W - gutter - w);
    const y = clamp(ay - h - (portrait() ? 84 : 88), 24, H - h - 12);
    base = { W, H, ax, ay, x, y, w, h, x1: clamp(ax - x, 18, w - 18) };
    holder.style.left = x + 'px';
    holder.style.top = y + 'px';
  }

  function apply() {
    if (!base) measure();
    const a = nx.x, b = ny.x;
    // Far to near: film (moves against the pointer), frame, words, card (moves with it).
    const f = [-12 * a, -8 * b], fr = [-5 * a, -3 * b], t = [4 * a, 3 * b], c = [12 * a, 8 * b];
    film.style.transform = `translate3d(${f[0].toFixed(2)}px, ${f[1].toFixed(2)}px, 0) scale(${SCALE})`;
    frameL.style.transform = `translate3d(${fr[0].toFixed(2)}px, ${fr[1].toFixed(2)}px, 0)`;
    text.style.transform = `translate3d(${t[0].toFixed(2)}px, ${t[1].toFixed(2)}px, 0)`;
    holder.style.transform = `perspective(900px) translate3d(${c[0].toFixed(2)}px, ${c[1].toFixed(2)}px, 0) rotateX(${(-5 * b).toFixed(2)}deg) rotateY(${(6 * a).toFixed(2)}deg)`;
    glare.style.transform = `translate3d(${(base.w * (0.5 + a * 0.45)).toFixed(1)}px, ${(base.h * (0.5 + b * 0.6)).toFixed(1)}px, 0)`;
    // The leader stays tied to the terminal, which moves with the (scaled) film.
    const tx = base.W / 2 + (base.ax - base.W / 2) * SCALE + f[0], ty = base.H / 2 + (base.ay - base.H / 2) * SCALE + f[1];
    const sx = base.x + base.x1 + c[0], sy = base.y + base.h + c[1];
    line.setAttribute('x1', sx.toFixed(1)); line.setAttribute('y1', sy.toFixed(1));
    line.setAttribute('x2', tx.toFixed(1)); line.setAttribute('y2', (ty - 4).toFixed(1));
    circles.forEach((ci) => { ci.setAttribute('cx', tx.toFixed(1)); ci.setAttribute('cy', ty.toFixed(1)); });
  }

  let running = false, last = 0;
  function tick(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    nx.step(dt); ny.step(dt);
    apply();
    if (nx.settled() && ny.settled()) { running = false; return; }
    requestAnimationFrame(tick);
  }
  const wake = () => { if (!running) { running = true; last = performance.now(); requestAnimationFrame(tick); } };

  if (FINE && !RM) {
    el.addEventListener('pointermove', (e) => {
      if (!on) return;
      const r = el.getBoundingClientRect();
      nx.t = clamp((e.clientX - r.left) / r.width * 2 - 1, -1, 1);
      ny.t = clamp((e.clientY - r.top) / r.height * 2 - 1, -1, 1);
      el.classList.add('is-hover');
      wake();
    });
    el.addEventListener('pointerleave', () => { nx.t = 0; ny.t = 0; el.classList.remove('is-hover'); wake(); });
  }
  document.querySelectorAll('[data-depth]').forEach((b) => b.addEventListener('click', () => {
    on = b.dataset.depth === 'on';
    document.querySelectorAll('[data-depth]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    if (!on) { nx.t = 0; ny.t = 0; el.classList.remove('is-hover'); wake(); }
  }));
  const relayout = () => { base = null; apply(); };
  if (img.complete) relayout(); else img.addEventListener('load', relayout);
  addEventListener('resize', relayout);
  if (document.fonts) document.fonts.ready.then(relayout);
  apply();
}

// ---------- start ----------
const inv = document.querySelector('[data-proto="invoice"]');
scenes.push({ el: inv, set: invoice(inv) });
heroDepth(document.querySelector('[data-proto="hero"]'));
const glEl = document.querySelector('[data-proto="globe"]');
globe(glEl).then((set) => { scenes.push({ el: glEl, set }); onScroll(); });
onScroll();
