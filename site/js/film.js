// Mid-page film: a frame sequence scrubbed by scroll in a pinned section, like the hero. Here the
// camera rises from the gate terminal's green tick to the dusk sky; captions arrive and leave on
// the spring; a heads-up gauge climbs from the gate to orbit; and as the sky opens, a train of
// satellites drifts across and one of them takes a link of light from the gate.
// Frames load only as the section approaches (never with the page), the first and last first so
// the film can show its ends at once. Reduced motion: the last frame, the last caption and the
// finished gauge, with nothing moving.
import { RM, qs, qsa, clamp } from './util.js';
import { springSoft } from './motion.js';
import { frameSeq } from './frames.js';

const ORBIT_KM = 550;   // roughly the height of Starlink's main shells

function film(sec) {
  const canvas = qs('.film__canvas', sec);
  const poster = qs('.film__poster', sec);
  const lines = qsa('.film__line', sec);
  const sky = qs('.film__sky', sec), sats = qsa('.film__sat', sec), beam = qs('.film__beam', sec);
  const marker = qs('.film__marker', sec), alt = qs('[data-alt]', sec), link = qs('[data-link]', sec);
  const ds = sec.dataset;
  const total = parseInt(ds.frames, 10);
  const portrait = window.matchMedia('(max-width: 1023px) and (max-aspect-ratio: 4/5)').matches;
  const dir = portrait && ds.dirMobile ? ds.dirMobile : ds.dir;
  const focalX = parseFloat(portrait && ds.focalXMobile ? ds.focalXMobile : ds.focalX || '0.5');
  // Where things sit in the last frame, as shares of the frame: the gate, and the satellite train.
  const GATE = [0.86, 0.72];
  const TRAIN = { from: [0.16, 0.13], to: [0.56, 0.31], drift: 0.09 };

  function hud(p) {
    // The gauge: the first stretch is the climb up the post (metres); then the readout races to orbit.
    const k = clamp((p - 0.66) / 0.3, 0, 1);
    const m = p < 0.66 ? 2 + (p / 0.66) * 28 : 30 + (ORBIT_KM * 1000 - 30) * Math.pow(k, 3);
    alt.textContent = m < 1000 ? Math.round(m) + ' m' : (m < 100000 ? (m / 1000).toFixed(1) : Math.round(m / 1000)) + ' km';
    gsap.set(marker, { yPercent: -100 * (p < 0.66 ? 0.32 * (p / 0.66) : 0.32 + 0.68 * springSoft(k)) });
    const on = p >= 0.82;
    if (link.dataset.on !== String(on)) {
      link.dataset.on = String(on);
      link.textContent = on ? 'Online' : p >= 0.6 ? 'Searching' : 'Gate 2';
      link.classList.toggle('is-ok', on);
    } else if (!on) link.textContent = p >= 0.6 ? 'Searching' : 'Gate 2';
  }

  if (RM || !canvas.getContext) {
    sec.classList.add('is-static');
    gsap.set(lines[lines.length - 1], { autoAlpha: 1, y: 0 });
    alt.textContent = '≈ ' + ORBIT_KM + ' km';
    link.textContent = 'Online';
    link.classList.add('is-ok');
    gsap.set(marker, { yPercent: -100 });
    return;
  }

  const ctx = canvas.getContext('2d', { alpha: false });
  const seq = frameSeq((i) => dir + '/frame_' + String(i + 1).padStart(4, '0') + '.' + ds.ext, onDecode);
  let started = false, drawn = -1, progress = 0, cur = 0, sized = false;
  let dpr = 1, dw = 0, dh = 0, dx = 0, dy = 0;

  function layout() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.round(canvas.clientWidth * dpr), h = Math.round(canvas.clientHeight * dpr);
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; drawn = -1; }
    const ir = seq.ratio() || (poster.naturalWidth ? poster.naturalWidth / poster.naturalHeight : 16 / 9);
    if (w / h > ir) { dw = w; dh = w / ir; } else { dh = h; dw = h * ir; }
    dx = (w - dw) * focalX;
    dy = (h - dh) * 0.5;
  }
  // A point in the frame, in CSS pixels on screen.
  const at = (fx, fy) => [(dx + fx * dw) / dpr, (dy + fy * dh) / dpr];

  // A frame decoded near the playhead replaces whatever stood in for it.
  function onDecode(k) {
    if (!sized) { sized = true; layout(); }
    if (drawn < 0 || Math.abs(k - cur) < 2) render(progress, true);
  }

  function render(p, force) {
    progress = p;
    // The film position in frames, in 32 steps between neighbours (finer steps are not visible).
    const f = Math.round(clamp(p / 0.86, 0, 1) * (total - 1) * 32) / 32;
    cur = f;
    if (force || f !== drawn) {
      // Until a frame near f is decoded, the canvas keeps what it shows (the poster, at first).
      if (seq.draw(ctx, f, dx, dy, dw, dh)) drawn = f;
      else if (drawn < 0 && poster.complete && poster.naturalWidth) ctx.drawImage(poster, dx, dy, dw, dh);
    }
    hud(p);
    // The sky: the satellite train fades in as the sky opens and drifts along its line.
    const s = clamp((p - 0.62) / 0.14, 0, 1), d = clamp((p - 0.62) / 0.38, 0, 1);
    sky.style.opacity = springSoft(s).toFixed(3);
    const n = sats.length;
    let lead = null;
    sats.forEach((el, i) => {
      const t = i / (n - 1);
      const fx = TRAIN.from[0] + (TRAIN.to[0] - TRAIN.from[0]) * t + TRAIN.drift * d;
      const fy = TRAIN.from[1] + (TRAIN.to[1] - TRAIN.from[1]) * t + TRAIN.drift * 0.45 * d;
      const [x, y] = at(fx, fy);
      el.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px)';
      if (i === Math.floor(n / 2)) lead = [x, y];
    });
    // The link: a line of light from the gate to the lead satellite once the link is up.
    const b = clamp((p - 0.8) / 0.08, 0, 1);
    if (lead) {
      const [gx, gy] = at(GATE[0], GATE[1]);
      const len = Math.hypot(lead[0] - gx, lead[1] - gy);
      const ang = Math.atan2(lead[1] - gy, lead[0] - gx);
      beam.style.width = len.toFixed(1) + 'px';
      beam.style.transform = 'translate(' + gx.toFixed(1) + 'px,' + gy.toFixed(1) + 'px) rotate(' + ang.toFixed(4) + 'rad) scaleX(' + springSoft(b).toFixed(3) + ')';
      beam.style.opacity = b.toFixed(3);
    }
  }

  const load = (i) => seq.load(i);
  function start() {
    if (started) return;
    started = true;
    // Both ends first, then everything in between, eight at a time.
    Promise.all([load(0), load(total - 1)]).then(() => {
      layout();
      render(progress, true);
      let i = 1;
      (function next() {
        if (i >= total - 1) return;
        const chunk = [];
        for (let j = i; j < Math.min(i + 8, total - 1); j++) chunk.push(load(j));
        i += 8;
        Promise.all(chunk).then(() => { render(progress, true); next(); });
      })();
    });
  }
  const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { start(); io.disconnect(); } }, { rootMargin: '150% 0px' });
  io.observe(sec);

  // Captions: arrivals ride the spring, exits accelerate away (its mirror), as in the hero.
  gsap.set(lines, { autoAlpha: 0, y: 28 });
  const tl = gsap.timeline({ defaults: { ease: 'spring' } })
    .to(lines[0], { autoAlpha: 1, y: 0, duration: 0.07 }, 0.06)
    .to(lines[0], { autoAlpha: 0, y: -28, duration: 0.05, ease: 'springIn' }, 0.4)
    .to(lines[1], { autoAlpha: 1, y: 0, duration: 0.07 }, 0.5)
    .set({}, {}, 1);

  ScrollTrigger.create({
    trigger: sec, start: 'top top', end: () => '+=' + Math.round(window.innerHeight * 2.4),
    pin: true, scrub: true, animation: tl,
    onUpdate: (self) => render(self.progress),
    onLeave: () => seq.release(), onLeaveBack: () => seq.release(),
    onRefresh: (self) => { layout(); render(self.progress, true); },
  });
  layout();
  render(0, true);
  window.addEventListener('resize', () => { layout(); render(progress, true); });
}

export function initFilms() {
  qsa('.film').forEach(film);
}
