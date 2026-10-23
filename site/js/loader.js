// Preloader: the first visit in a session (the page head sets .is-loading). It shows real loading:
// the hero film's opening frames and the fonts. The light rises through the shield as they arrive,
// never faster than MIN so it does not flash, and the page never waits more than CAP for them.
// Then, in causal order: Verified, the panel lifts like a gate arm while the shield flies onto the
// shield in the nav logo, and the hero intro starts as the headline is uncovered.
import { stopScroll } from './scroll.js';

const root = document.documentElement;
// Times are from navigation start, the clock the visitor experiences (and the page-head failsafe
// at 7 s), not from when this script happens to arrive.
const MIN = 1100;  // ms: the light never fills sooner, so a fast load does not flash
const CAP = 4000;  // ms: the loader finishes then, loaded or not
const LATE = 5000; // ms: a script arriving later than this just fades the loader away
// Where the shield sits inside the nav logo image (assets/brand/logo-light.png), as fractions.
const LOGO_SHIELD = { left: 0.7487, right: 0.9884, top: 0.0362, bottom: 0.9565 };

let active = root.classList.contains('is-loading');
let hero = 0, heroReady = false, fontsReady = !document.fonts;
const waiting = [];

// The hero reports its opening frames (0–1), then that it is ready to play.
export function loaderProgress(f) { hero = Math.max(hero, f); }
export function loaderReady() { hero = 1; heroReady = true; }
// Runs fn once the loader has uncovered the page (at once when there is no loader).
export function afterLoader(fn) { if (active) waiting.push(fn); else fn(); }

function startPage() {
  active = false;
  waiting.splice(0).forEach((fn) => fn());
}

export function initLoader() {
  const el = document.querySelector('.loader');
  if (!active || !el) { if (el) el.remove(); root.classList.remove('is-loading'); startPage(); return; }
  const seal = el.querySelector('.loader__seal');
  const n = el.querySelector('.loader__n');
  const release = () => {
    root.classList.remove('is-loading');
    stopScroll(false);
    el.remove();
    try { sessionStorage.setItem('pp:intro', '1'); } catch (_) { /* private mode: it shows again next time */ }
  };
  if (performance.now() > LATE) {
    el.classList.add('is-quick');
    startPage();
    setTimeout(release, 320);
    return;
  }
  if (document.fonts) document.fonts.ready.then(() => { fontsReady = true; });

  // Until now CSS alone has been raising the light a little (base.css, loader-pre): carry on from
  // exactly where it is.
  let shown = parseFloat(getComputedStyle(seal).getPropertyValue('--p')) || 0, last = -1;
  seal.style.setProperty('--p', shown.toFixed(4));
  el.classList.add('is-live');
  function frame(now) {
    if (now > CAP) { heroReady = true; fontsReady = true; hero = 1; }
    const target = 0.85 * hero + 0.15 * (fontsReady ? 1 : 0);
    const goal = Math.max(shown, Math.min(target, now / MIN));
    // Eases toward the goal (critically damped feel); it never runs backwards.
    shown += (goal - shown) * 0.14;
    if (goal - shown < 0.002) shown = goal;
    seal.style.setProperty('--p', shown.toFixed(4));
    const pct = Math.round(shown * 100);
    if (pct !== last) { last = pct; n.textContent = String(pct).padStart(3, '0'); }
    if (shown >= 1 && heroReady && fontsReady) { finish(); return; }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  function finish() {
    el.classList.add('is-done');
    setTimeout(out, 420);
  }
  function out() {
    // The shield's flight: from where it is to the shield in the nav logo, measured now.
    const logo = document.querySelector('.nav .logo__light');
    const L = logo && logo.getBoundingClientRect();
    if (L && L.width) {
      const S = seal.getBoundingClientRect();
      const l = L.left + L.width * LOGO_SHIELD.left, r = L.left + L.width * LOGO_SHIELD.right;
      const top = L.top + L.height * LOGO_SHIELD.top, bottom = L.top + L.height * LOGO_SHIELD.bottom;
      seal.style.setProperty('--fx', ((l + r) / 2 - (S.left + S.width / 2)).toFixed(1) + 'px');
      seal.style.setProperty('--fy', ((top + bottom) / 2 - (S.top + S.height / 2)).toFixed(1) + 'px');
      seal.style.setProperty('--fs', ((bottom - top) / S.height).toFixed(4));
    }
    el.classList.add('is-out');
    // The hero intro starts as the panel uncovers the headline; the shield hands over to the logo.
    setTimeout(startPage, 380);
    setTimeout(() => el.classList.add('is-landed'), 950);
    setTimeout(release, 1300);
  }
}
