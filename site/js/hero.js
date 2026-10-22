// Hero: the site film, scrubbed by scroll, with product UI appearing in the frame
// at the moment the terminal verifies the worker. Around the film: a viewfinder frame and a status
// band whose three steps fill as the film plays, with the gate's clock running to 07:41:08 at the
// moment of verification.
import { RM, clamp } from './util.js';
import { playHeroIntro, heroLineCount, decode, labelText } from './reveal.js';
import { STEP } from './motion.js';
import { frameSeq } from './frames.js';

export function initHero() {
  const hero = document.querySelector('.hero');
  if (!hero) return;
  const canvas = hero.querySelector('.hero__canvas');
  const poster = hero.querySelector('.hero__poster');
  const intro = hero.querySelector('.hero__intro');
  const label = hero.querySelector('.hero__label');
  const heroRv = hero.querySelectorAll('.rv');
  const lines = Array.from(hero.querySelectorAll('.hero__line'));
  const card = hero.querySelector('.vcard');
  const leaderLines = card.querySelectorAll('.vcard__leader line');
  const leaderDots = card.querySelectorAll('.vcard__leader circle');
  const okLine = card.querySelector('.vcard__leader .lo');
  const ping = card.querySelector('.vcard__leader .lr');
  const packet = card.querySelector('.vcard__leader .lk');
  const hint = hero.querySelector('.hero__hint');
  const loaderBar = hero.querySelector('.hero__loader-bar');
  const loaderN = hero.querySelector('.hero__loader-n');
  const frame = hero.querySelector('.hero__frame');
  const hud = hero.querySelector('.hero__hud');
  const rail = Array.from(hero.querySelectorAll('.hero__rail li'));
  const clock = hero.querySelector('.hero__time');

  const labelT = labelText(label);
  // The green copy of the heading's last word, for the proof scan. Added before the heading is split
  // (js/reveal.js), so it is part of the markup SplitText restores on a re-split.
  const proofWord = hero.querySelector('.hero__proof');
  // The copy is drawn by CSS from data-t, so the heading's text stays one sentence.
  if (proofWord && !RM) {
    proofWord.insertAdjacentHTML('beforeend', '<span class="hero__proof-fill" aria-hidden="true"><span class="hero__proof-ink"></span><i></i></span>');
    proofWord.querySelector('.hero__proof-ink').dataset.t = proofWord.textContent;
  }
  const cardId = card.querySelector('.vcard__id strong');
  const cardClock = card.querySelector('.vcard__clock');
  let cardDecoded = false, shownSec = -1;
  // The leader, from the card's foot (x1, y1) down to the terminal (x2, y2), in card pixels.
  const link = { x1: 0, y1: 0, x2: 0, y2: 0 };
  let verified = false, linkTl = null;

  // Verification, in causal order: the terminal turns green and pings; a point of light runs up
  // the leader as it turns solid; on its arrival the card locks on. Scrolling back undoes it at
  // once, and crossing again replays it. Without animate (a load or resize past the moment) the
  // card is simply verified.
  function setVerified(ok, animate) {
    verified = ok;
    if (linkTl) { linkTl.kill(); linkTl = null; }
    gsap.set([okLine, ping, packet], { clearProps: 'transform' });
    if (!ok) {
      hero.classList.remove('is-verified');
      card.classList.remove('is-link', 'is-ok', 'on');
      gsap.set([okLine, ping, packet], { opacity: 0 });
      return;
    }
    card.classList.add('is-link');
    if (!animate) {
      gsap.set(okLine, { opacity: 1 });
      card.classList.add('is-ok', 'on');
      hero.classList.add('is-verified');
      return;
    }
    // Both ends of each scale share the origin (the terminal), so nothing drifts as it grows.
    const at = { svgOrigin: link.x2 + ' ' + link.y2, smoothOrigin: false };
    linkTl = gsap.timeline()
      .fromTo(ping, { opacity: 0.9, scale: 1, ...at }, { opacity: 0, scale: 2.6, duration: 0.8, ease: 'springSoft', ...at }, 0)
      .fromTo(okLine, { opacity: 1, scale: 0, ...at }, { scale: 1, duration: 0.36, ease: 'springIn', ...at }, 0.06)
      .fromTo(packet, { opacity: 1, x: 0, y: 0 }, { x: link.x1 - link.x2, y: link.y1 - link.y2, duration: 0.36, ease: 'springIn' }, 0.06)
      .set(packet, { opacity: 0 })
      .call(() => { card.classList.add('is-ok', 'on'); hero.classList.add('is-verified'); }, null, 0.4);
  }

  // The last word of the heading is proven: a scan crosses "prove." and leaves it green. The window
  // and the green copy move by the same distance in opposite directions, so the letters stay put.
  function prove(delay) {
    const title = hero.querySelector('.hero__title');
    const win = hero.querySelector('.hero__proof-fill');
    if (!title || !win) return;
    const ink = win.firstElementChild, scan = win.querySelector('i');
    const w = win.offsetWidth + 2;
    gsap.timeline({ delay })
      .set(win, { visibility: 'visible', x: -w })
      .set(ink, { x: w })
      .set(scan, { opacity: 1 })
      .to(win, { x: 0, duration: 0.75, ease: 'springSoft' }, 0)
      .to(ink, { x: 0, duration: 0.75, ease: 'springSoft' }, 0)
      .to(scan, { opacity: 0, duration: 0.35, ease: 'springSoft' }, 0.55)
      .call(() => { title.classList.add('is-proven'); gsap.set([win, ink, scan], { clearProps: 'all' }); });
  }

  // Label (structure) first, then the headline line by line, then the copy and actions.
  // About 1.3 s end to end.
  function revealIntro() {
    gsap.fromTo(frame, { opacity: 0, scale: 1.015 }, { opacity: 1, scale: 1, duration: 0.9, ease: 'springSoft', clearProps: 'transform' });
    gsap.to(label, { opacity: 1, duration: 0.3, ease: 'springSoft' });
    if (labelT) decode(labelT, labelT.textContent, { delay: 0.05 });
    playHeroIntro(0.12);
    prove(0.12 + heroLineCount() * STEP + 0.75);
    const words = 0.12 + heroLineCount() * STEP;
    gsap.to(heroRv, { opacity: 1, y: 0, duration: 0.8, ease: 'spring', stagger: STEP, delay: words });
    gsap.fromTo(hud, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.7, ease: 'spring', delay: words + heroRv.length * STEP + 0.1 });
  }

  if (RM || !canvas.getContext) {
    hero.classList.add('is-static');
    gsap.set(heroRv, { opacity: 1, y: 0 });
    gsap.set(label, { opacity: 1 });
    playHeroIntro();
    return;
  }
  gsap.set(label, { opacity: 0 });

  const ctx = canvas.getContext('2d', { alpha: false });
  const ds = hero.dataset;
  const total = parseInt(ds.frames, 10);
  const portrait = window.matchMedia('(max-width: 1023px) and (max-aspect-ratio: 4/5)').matches;
  const pick = (k) => (portrait && ds[k + 'Mobile'] !== undefined ? ds[k + 'Mobile'] : ds[k]);
  const dir = pick('dir');
  const focalX = parseFloat(pick('focalX'));
  const focalY = parseFloat(pick('focalY'));
  const anchor = pick('anchor').split(',').map(Number);
  const playEnd = 1 - parseFloat(ds.hold || '0');
  const green = parseInt(ds.green || String(total), 10);
  const pGreen = playEnd * ((green - 0.5) / (total - 1));   // the frame where the terminal turns green
  const pCard = pGreen - 0.16;                              // the worker reaches the terminal

  const seq = frameSeq((i) => dir + '/frame_' + String(i + 1).padStart(4, '0') + '.' + ds.ext, onDecode);
  const need = Math.ceil(total * 0.2); // frames loaded before the film can start
  let loaded = 0, ready = false, drawn = -1, progress = 0, cur = 0, sized = false;
  let dpr = 1, dw = 0, dh = 0, dx = 0, dy = 0;

  // ---------- drawing ----------
  function layout() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.round(canvas.clientWidth * dpr);
    const h = Math.round(canvas.clientHeight * dpr);
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; drawn = -1; }
    const ir = seq.ratio() || (portrait ? 0.6 : 16 / 9);
    if (w / h > ir) { dw = w; dh = w / ir; } else { dh = h; dw = h * ir; }
    dx = (w - dw) * focalX;
    dy = (h - dh) * focalY;
    placeCard();
  }

  // A frame decoded near the playhead replaces whatever stood in for it.
  function onDecode(k) {
    if (!sized) { sized = true; layout(); }
    if (drawn < 0 || Math.abs(k - cur) < 2) render(progress, true);
  }

  function render(p, force) {
    progress = p;
    // The film position in frames, in 32 steps between neighbours (finer steps are not visible).
    const f = Math.round(Math.min(p / playEnd, 1) * (total - 1) * 32) / 32;
    cur = f;
    if (force || f !== drawn) {
      // Until a frame near f is decoded, the canvas keeps what it shows (the poster, at first).
      if (seq.draw(ctx, f, dx, dy, dw, dh)) drawn = f;
      else if (drawn < 0 && !portrait && poster.complete && poster.naturalWidth) ctx.drawImage(poster, dx, dy, dw, dh);
    }
    // Decode the worker ID and timestamp each time the card arrives.
    if (!cardDecoded && p >= pCard) { cardDecoded = true; decode(cardId, 'W-0412', { dur: 0.4 }); decode(cardClock, '07:41:08', { delay: 0.08, dur: 0.45 }); }
    else if (cardDecoded && p < pCard - 0.02) cardDecoded = false;
    // The band: each step fills while its part of the film plays, and the clock runs to 07:41:08 at
    // the frame where the terminal verifies, then a few seconds on.
    const steps = [[0.1, 0.4], [0.4, pCard], [pCard, pGreen]];
    rail.forEach((li, i) => {
      const [a, b] = steps[i];
      li.style.setProperty('--f', clamp((p - a) / (b - a), 0, 1).toFixed(3));
      li.classList.toggle('is-on', p >= a && (i === 2 || p < b));
    });
    const sec = Math.floor(p <= pGreen ? (p / pGreen) * 16 : 16 + ((p - pGreen) / (1 - pGreen)) * 4);
    if (sec !== shownSec) {
      shownSec = sec;
      const t = 40 * 60 + 52 + sec; // seconds after 07:00:00
      clock.textContent = '07:' + String(Math.floor(t / 60)).padStart(2, '0') + ':' + String(t % 60).padStart(2, '0');
    }
    const scan = p >= pCard - 0.02;
    if (scan !== card.classList.contains('is-scan')) card.classList.toggle('is-scan', scan);
    const ok = p >= pGreen;
    if (ok !== verified) setVerified(ok, !force);
  }

  // The card sits above the terminal with a leader line down to it.
  function placeCard() {
    const root = getComputedStyle(document.documentElement);
    const gutter = parseFloat(root.getPropertyValue('--gutter')) || 20;
    const top = (parseFloat(root.getPropertyValue('--nav-h')) || 64) + 12;
    const vw = canvas.clientWidth, vh = canvas.clientHeight;
    const ax = (dx + anchor[0] * dw) / dpr;
    const ay = (dy + anchor[1] * dh) / dpr;
    const w = card.offsetWidth || 272, h = card.offsetHeight || 134;
    const x = clamp(ax - 30, gutter, vw - gutter - w);
    const y = clamp(ay - h - (portrait ? 84 : 88), top, vh - h - 12);
    card.style.left = x + 'px';
    card.style.top = y + 'px';
    const lx = ax - x, ly = ay - y;
    link.x1 = clamp(lx, 18, w - 18); link.y1 = h; link.x2 = lx; link.y2 = ly;
    leaderLines.forEach((l) => { l.setAttribute('x1', link.x1); l.setAttribute('y1', link.y1); l.setAttribute('x2', lx); l.setAttribute('y2', ly - 4); });
    leaderDots.forEach((c) => { c.setAttribute('cx', lx); c.setAttribute('cy', ly); });
  }

  // ---------- loading ----------
  function markReady() {
    if (ready) return;
    ready = true;
    hero.classList.add('is-ready');
    layout();
    render(progress, true);
    revealIntro();
  }
  function onProgress() {
    const f = Math.min(1, loaded / need);
    loaderBar.style.transform = 'scaleX(' + f.toFixed(3) + ')';
    if (loaderN && !ready) loaderN.textContent = String(Math.round(f * 100)).padStart(2, '0');
    if (!ready && loaded >= need) markReady();
  }
  const load = (i) => seq.load(i).then((ok) => { if (ok) { loaded++; onProgress(); } });
  setTimeout(markReady, 1500); // never hold the headline hostage to a slow connection; missing frames draw as the nearest one

  const first = need;
  load(0)
    .then(() => { layout(); render(progress, true); return Promise.all(Array.from({ length: first - 1 }, (_, k) => load(k + 1))); })
    .then(() => {
      let i = first;
      function next() {
        if (i >= total) return;
        const chunk = [];
        for (let j = i; j < Math.min(i + 8, total); j++) chunk.push(load(j));
        i += 8;
        Promise.all(chunk).then(() => { render(progress); next(); });
      }
      // The rest of the film loads once the visitor scrolls, so a visit that never scrolls
      // costs only the opening frames.
      if (window.scrollY > 0) next(); else window.addEventListener('scroll', next, { once: true, passive: true });
    });

  // ---------- scroll choreography ----------
  const centred = () => window.matchMedia('(min-width: 768px)').matches;
  gsap.set(lines, { autoAlpha: 0, y: 28, yPercent: centred() ? -50 : 0 });

  // Scroll-linked: arrivals ride the spring, exits accelerate away (its mirror).
  const tl = gsap.timeline({ defaults: { ease: 'spring' } });
  tl.to(hint, { autoAlpha: 0, duration: 0.04, ease: 'springSoft' }, 0.01)
    .to(intro, { autoAlpha: 0, y: -48, duration: 0.08, ease: 'springIn' }, 0.09)
    .to(lines[0], { autoAlpha: 1, y: 0, duration: 0.07 }, 0.18)
    .to(lines[0], { autoAlpha: 0, y: -28, duration: 0.05, ease: 'springIn' }, 0.4)
    .to(lines[1], { autoAlpha: 1, y: 0, duration: 0.07 }, 0.46)
    .to(lines[1], { autoAlpha: 0, y: -28, duration: 0.05, ease: 'springIn' }, pCard - 0.05)
    .fromTo(card, { autoAlpha: 0, y: 14, scale: 0.96 }, { autoAlpha: 1, y: 0, scale: 1, duration: 0.05 }, pCard)
    .to(lines[2], { autoAlpha: 1, y: 0, duration: 0.06 }, pGreen)
    .set({}, {}, 1);

  ScrollTrigger.create({
    trigger: hero,
    start: 'top top',
    end: () => '+=' + Math.round(window.innerHeight * 2.6),
    pin: true,
    anticipatePin: 1,
    scrub: true,
    animation: tl,
    onUpdate: (self) => render(self.progress),
    onLeave: () => seq.release(),
    onRefresh: (self) => {
      gsap.set(lines, { yPercent: centred() ? -50 : 0 });
      layout();
      render(self.progress, true);
    },
  });

  layout();
  window.addEventListener('resize', () => { layout(); render(progress, true); });
}
