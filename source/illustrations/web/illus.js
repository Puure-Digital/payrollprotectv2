// Supporting illustrations (figs 06–08). Higgsfield line art, recoloured to the
// illustration palette. Anything that moves is its own layer or an SVG overlay drawn in
// the art's own pixel space, so it stays registered to the drawing at every size.
// Each piece builds in causal order: structure, then content, then the resolution,
// which is the only moment lime appears. Afterwards it keeps a slow, low-amplitude
// idle loop, and only while it is on screen.
import { RM, qs, qsa, DESKTOP } from './util.js';
import { register, live } from './engine.js';
import { decode } from './reveal.js';

const NS = 'http://www.w3.org/2000/svg';
const smooth = (a, b, x) => { const v = Math.min(1, Math.max(0, (x - a) / (b - a))); return v * v * (3 - 2 * v); };

// Entry, reset and idle wiring shared by the three figures.
function mount(fig, { build, reset, idle }) {
  const art = qs('.il__art', fig);
  const cap = qs('.il__cap', fig);
  const capT = qs('.il__cap span:last-child', fig);
  const capText = capT ? capT.textContent : '';
  const tl = gsap.timeline({ paused: true });
  tl.fromTo(art, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.6, ease: 'spring' }, 0);
  build(tl);
  fig._tl = tl; // QA handle: fig._tl.pause(seconds) renders any frame of the entry
  const amb = idle && !RM ? idle() : null;
  fig._amb = amb;
  let ready = false;
  const isLive = live(fig, () => { if (ready && amb) amb.play(); }, () => { if (amb) amb.pause(); }) || (() => false);
  tl.eventCallback('onComplete', () => {
    ready = true;
    fig.classList.add('is-idle');
    if (amb && isLive()) amb.play();
  });
  if (!RM) { gsap.set(cap, { opacity: 0 }); reset(); }
  register(fig, {
    show(delay) {
      gsap.to(cap, { opacity: 1, duration: 0.3, ease: 'springSoft', delay, overwrite: true });
      if (capT) decode(capT, capText, { delay: delay + 0.06 });
      tl.delay(delay + 0.1).restart(true);
    },
    hide() {
      ready = false;
      fig.classList.remove('is-idle');
      if (amb) amb.pause(0);
      tl.pause(0);
      reset();
      gsap.set(cap, { opacity: 0 });
    },
    end() {
      tl.progress(1).pause();
      fig.classList.add('is-idle');
    },
  });
}

// ---------- Fig. 06: fingerprint scanned, template carried into storage, lid sealed ----------
// Lid geometry in the drawing's pixels: hinge A–B, closed free edge along U, upright V.
const A = [1717, 533], B = [1891, 599], U = [-163, 75], V = [0, -195];
const TH0 = Math.acos(97 / 163); // the lid as drawn, about 53° open
function lidMatrix(th) {
  const w = [Math.cos(th) * U[0] + Math.sin(th) * V[0], Math.cos(th) * U[1] + Math.sin(th) * V[1]];
  const a = [B[0] - A[0], B[1] - A[1]];
  const det = a[0] * U[1] - U[0] * a[1];
  const i11 = U[1] / det, i12 = -U[0] / det, i21 = -a[1] / det, i22 = a[0] / det;
  const m11 = a[0] * i11 + w[0] * i21, m12 = a[0] * i12 + w[0] * i22;
  const m21 = a[1] * i11 + w[1] * i21, m22 = a[1] * i12 + w[1] * i22;
  const e = A[0] - (m11 * A[0] + m12 * A[1]), f = A[1] - (m21 * A[0] + m22 * A[1]);
  return `matrix(${m11.toFixed(5)} ${m21.toFixed(5)} ${m12.toFixed(5)} ${m22.toFixed(5)} ${e.toFixed(2)} ${f.toFixed(2)})`;
}

function gov() {
  const fig = qs('#il-gov');
  if (!fig) return;
  const scan = qs('.gv-scan', fig), move = qs('.gv-scan__move', fig);
  const lid = qs('.gv-lid', fig), seal = qs('.gv-seal', fig), group = qs('.gv-pts', fig);

  // The template: a 3 × 5 point matrix that forms beside the reticle and travels into the box.
  const pts = [];
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 5; c++) {
      const el = document.createElementNS(NS, 'circle');
      el.setAttribute('r', 5);
      el.setAttribute('opacity', 0);
      group.appendChild(el);
      pts.push({ el, ox: (c - 2) * 26, oy: (r - 1) * 26, lag: (4 - c) * 0.05, k: r * 5 + c });
    }
  }
  const P = [[650, 655], [980, 430], [1430, 370], [1722, 592]];
  const bez = (t, i) => { const u = 1 - t; return u * u * u * P[0][i] + 3 * u * u * t * P[1][i] + 3 * u * t * t * P[2][i] + t * t * t * P[3][i]; };
  const pk = { f: 0, t: 0 };
  function renderPts() {
    for (const p of pts) {
      const appear = smooth((p.k / 15) * 0.6, (p.k / 15) * 0.6 + 0.4, pk.f);
      const t = Math.min(1, Math.max(0, pk.t * 1.2 - p.lag));
      const squeeze = 1 - 0.75 * smooth(0.55, 1, t);
      const x = bez(t, 0) + p.ox * squeeze, y = bez(t, 1) + p.oy * squeeze;
      const s = (0.4 + 0.6 * appear) * (1 - 0.5 * smooth(0.7, 1, t));
      p.el.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${s.toFixed(3)})`);
      p.el.setAttribute('opacity', (appear * (1 - smooth(0.8, 1, t))).toFixed(3));
    }
  }
  const lidS = { th: 0 };
  const setLid = () => lid.setAttribute('transform', lidMatrix(lidS.th));

  mount(fig, {
    reset() {
      gsap.set(scan, { opacity: 0 });
      gsap.set(move, { y: 0 });
      gsap.set(seal, { opacity: 0 });
      pk.f = 0; pk.t = 0; renderPts();
      lidS.th = TH0; setLid();
    },
    build(tl) {
      tl.fromTo(scan, { opacity: 0 }, { opacity: 1, duration: 0.12, ease: 'springSoft' }, 0.22)
        .fromTo(move, { y: 0 }, { y: 420, duration: 0.55, ease: 'springSoft' }, 0.22)
        .to(scan, { opacity: 0, duration: 0.15, ease: 'springSoft' }, 0.64)
        .fromTo(pk, { f: 0 }, { f: 1, duration: 0.3, ease: 'springSoft', onUpdate: renderPts }, 0.5)
        .fromTo(pk, { t: 0 }, { t: 1, duration: 0.6, ease: 'springSoft', onUpdate: renderPts }, 0.74)
        .fromTo(lidS, { th: TH0 }, { th: 0, duration: 0.45, ease: 'springSoft', onUpdate: setLid }, 1.16)
        .fromTo(seal, { opacity: 0 }, { opacity: 1, duration: 0.3, ease: 'springSoft' }, 1.52);
    },
    idle() {
      return gsap.timeline({ paused: true, repeat: -1 })
        .fromTo(scan, { opacity: 0 }, { opacity: 0.45, duration: 0.35, ease: 'harmonic', immediateRender: false }, 0.4)
        .fromTo(move, { y: 0 }, { y: 420, duration: 1.6, ease: 'harmonic', immediateRender: false }, 0.4)
        .to(scan, { opacity: 0, duration: 0.35, ease: 'harmonic' }, 1.65)
        .fromTo(seal, { opacity: 1 }, { opacity: 0.6, duration: 1.4, ease: 'harmonic', immediateRender: false }, 2.2)
        .to(seal, { opacity: 1, duration: 1.4, ease: 'harmonic' }, 3.6)
        .set({}, {}, 5.6);
    },
  });
}

// ---------- Fig. 07: ninety days on a dial; lime only when the needle reaches day 90 ----------
function pilot() {
  const fig = qs('#il-pilot');
  if (!fig) return;
  const h1 = qs('.pl-h1', fig), h2 = qs('.pl-h2', fig), needle = qs('.pl-needle', fig);
  const tick = qs('.pl-tick', fig), dot = qs('.pl-dot', fig), halo = qs('.pl-halo', fig);
  const st = { a: 0 };
  // The elapsed wedge is two half-discs turning inside half-plane clips: rotation only.
  const setA = () => {
    const w = Math.min(360, Math.max(0, st.a));
    needle.setAttribute('transform', `rotate(${st.a.toFixed(2)} 800 800)`);
    h1.setAttribute('transform', `rotate(${Math.min(w, 180).toFixed(2)} 800 800)`);
    h2.setAttribute('transform', `rotate(${Math.max(w - 180, 0).toFixed(2)} 800 800)`);
  };
  mount(fig, {
    reset() {
      st.a = 0; setA();
      gsap.set([tick, dot, halo], { opacity: 0 });
      gsap.set([dot, halo], { scale: 1, transformOrigin: '50% 50%' });
    },
    build(tl) {
      // A long travel, so the spring gets a longer span: the sweep is effectively done
      // by 1.1 s and only the settle remains when the lime arrives.
      tl.fromTo(st, { a: 0 }, { a: 360, duration: 1.6, ease: 'spring', onUpdate: setA }, 0.32)
        .fromTo([tick, dot], { opacity: 0 }, { opacity: 1, duration: 0.25, ease: 'springSoft' }, 1.2)
        .fromTo(dot, { scale: 0.4 }, { scale: 1, duration: 0.5, ease: 'spring', transformOrigin: '50% 50%' }, 1.2)
        .set(halo, { opacity: 0.6, scale: 1, transformOrigin: '50% 50%' }, 1.26)
        .to(halo, { opacity: 0, scale: 2.6, duration: 0.8, ease: 'springSoft' }, 1.26);
    },
    idle() {
      return gsap.timeline({ paused: true, repeat: -1 })
        .set(halo, { opacity: 0.5, scale: 1, transformOrigin: '50% 50%' }, 1.2)
        .to(halo, { opacity: 0, scale: 2.4, duration: 1.6, ease: 'springSoft' }, 1.2)
        .set({}, {}, 5);
    },
  });
}

// ---------- Fig. 08: the gate terminal assembles, its screen scans, the status light verifies ----------
function faq() {
  const fig = qs('#il-faq');
  if (!fig) return;
  const base = qs('.fq-base', fig);
  const parts = ['bracket', 'housing', 'camera', 'panel'].map((k) => qs(`[data-part="${k}"]`, fig));
  const ins = parts.map((p) => qs('.il-part__in', p));
  const scan = qs('.fq-scan', fig), move = qs('.fq-scan__move', fig);
  const led = qs('.fq-led', fig), halo = qs('.fq-halo', fig);
  const AX = 0.888, AY = -0.46, D = 22; // assembly axis, pointing toward the wall
  mount(fig, {
    reset() {
      gsap.set(base, { opacity: 0 });
      gsap.set(ins, { opacity: 0, x: -AX * D, y: -AY * D });
      gsap.set(scan, { opacity: 0 });
      gsap.set(move, { y: 0 });
      gsap.set([led, halo], { opacity: 0 });
      gsap.set(halo, { scale: 1, transformOrigin: '50% 50%' });
    },
    build(tl) {
      // Structure: the axis, then parts in assembly order, wall bracket first.
      tl.fromTo(base, { opacity: 0 }, { opacity: 1, duration: 0.4, ease: 'springSoft' }, 0.05);
      ins.forEach((el, i) => tl.fromTo(el, { opacity: 0, x: -AX * D, y: -AY * D }, { opacity: 1, x: 0, y: 0, duration: 0.6, ease: 'spring' }, 0.12 + i * 0.1));
      // Content: the screen scans. Resolution: the status light turns lime.
      tl.fromTo(scan, { opacity: 0 }, { opacity: 1, duration: 0.1, ease: 'springSoft' }, 0.95)
        .fromTo(move, { y: 0 }, { y: 170, duration: 0.5, ease: 'springSoft' }, 0.95)
        .to(scan, { opacity: 0, duration: 0.15, ease: 'springSoft' }, 1.32)
        .fromTo(led, { opacity: 0 }, { opacity: 1, duration: 0.25, ease: 'springSoft' }, 1.38)
        .set(halo, { opacity: 0.6, scale: 1, transformOrigin: '50% 50%' }, 1.4)
        .to(halo, { opacity: 0, scale: 2.2, duration: 0.8, ease: 'springSoft' }, 1.4);
    },
    idle() {
      return gsap.timeline({ paused: true, repeat: -1 })
        .fromTo(scan, { opacity: 0 }, { opacity: 0.5, duration: 0.3, ease: 'harmonic', immediateRender: false }, 0.6)
        .fromTo(move, { y: 0 }, { y: 170, duration: 1.5, ease: 'harmonic', immediateRender: false }, 0.6)
        .to(scan, { opacity: 0, duration: 0.3, ease: 'harmonic' }, 1.8)
        .fromTo(led, { opacity: 1 }, { opacity: 0.6, duration: 1.3, ease: 'harmonic', immediateRender: false }, 2.4)
        .to(led, { opacity: 1, duration: 1.3, ease: 'harmonic' }, 3.7)
        .set({}, {}, 5.6);
    },
  });

  // Depth: as the section scrolls past, the exploded parts separate a little further.
  if (RM) return;
  const K = [8, 4, -4, -8];
  gsap.matchMedia().add(DESKTOP, () => {
    const st = ScrollTrigger.create({
      trigger: fig, start: 'top bottom', end: 'bottom top',
      onUpdate: (self) => {
        const p = self.progress - 0.5;
        parts.forEach((el, i) => { el.style.transform = `translate(${(AX * K[i] * p).toFixed(2)}px, ${(AY * K[i] * p).toFixed(2)}px)`; });
      },
    });
    return () => { st.kill(); parts.forEach((el) => { el.style.transform = ''; }); };
  });
}

export function initIllus() {
  gov();
  pilot();
  faq();
}
