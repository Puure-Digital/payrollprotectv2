// Reveals:
// - headlines light up word by word with scroll (scrubbed); the hero headline rises line by
//   line as an intro (SplitText);
// - mono labels fade in, then their text decodes left to right behind a caret;
// - supporting elements (.rv) fade and rise.
// Within a block the order is causal: label, headline, then the copy under it.
import { RM, qsa, clamp } from './util.js';
import { register, isRegistered } from './engine.js';
import { STEP } from './motion.js';

const RISE = 16;
let heroSplit = null;

// ---------- character decode (opacity and transform only) ----------
function build(el, str) {
  if (el._dc && el._dc.text === str) return el._dc;
  el.textContent = '';
  const sr = document.createElement('span');
  sr.className = 'sr';
  sr.textContent = str;
  const wrap = document.createElement('span');
  wrap.className = 'dc';
  wrap.setAttribute('aria-hidden', 'true');
  const chars = Array.from(str, (c) => {
    const s = document.createElement('span');
    s.className = 'ch';
    s.textContent = c;
    wrap.appendChild(s);
    return s;
  });
  const caret = document.createElement('i');
  caret.className = 'dc__caret';
  wrap.appendChild(caret);
  el.append(sr, wrap);
  el._dc = { text: str, chars, caret, wrap, tw: null };
  return el._dc;
}

// Decode text into place. Safe to call repeatedly; with reduced motion it just sets the text.
export function decode(el, text, { delay = 0, dur } = {}) {
  if (!el) return;
  const str = text != null ? text : el._dc ? el._dc.text : el.textContent;
  if (RM) { el.textContent = str; el._dc = null; return; }
  const d = build(el, str);
  const n = d.chars.length;
  if (d.tw) d.tw.kill();
  d.chars.forEach((c) => c.classList.remove('on'));
  const D = dur || Math.min(0.6, Math.max(0.3, n * 0.032));
  const p = { v: 0 };
  let cw = 0, k = 0;
  gsap.set(d.caret, { x: 0, opacity: 0 });
  d.tw = gsap.timeline({ delay })
    .call(() => { cw = d.wrap.getBoundingClientRect().width / Math.max(1, n); })
    .set(d.caret, { opacity: 0.28 })
    .to(p, {
      v: 1, duration: D, ease: 'springSoft',
      onUpdate() {
        const to = Math.min(n, Math.ceil(p.v * n));
        for (; k < to; k++) d.chars[k].classList.add('on');
        gsap.set(d.caret, { x: Math.min(p.v * n, n - 1) * cw });
      },
    })
    .to(d.caret, { opacity: 0, duration: 0.18, ease: 'springSoft' });
}

// Return decoded text to its hidden state (used when a label resets off screen).
function undecode(el) {
  if (!el || !el._dc) return;
  if (el._dc.tw) el._dc.tw.kill();
  el._dc.chars.forEach((c) => c.classList.remove('on'));
  gsap.set(el._dc.caret, { opacity: 0 });
}

// Wrap a label's own text so decoding never touches its index or status dot.
export function labelText(label) {
  let t = label.querySelector('.label__t');
  if (t) return t;
  for (const n of Array.from(label.childNodes)) {
    if (n.nodeType === 3 && n.textContent.trim()) {
      t = document.createElement('span');
      t.className = 'label__t';
      t.textContent = n.textContent;
      label.replaceChild(t, n);
      break;
    }
  }
  return t;
}

// ---------- fade-rise ----------
export function rise(el, delay = 0) {
  gsap.to(el, { opacity: 1, y: 0, duration: 0.8, ease: 'spring', delay, overwrite: true });
}
export function sink(el) {
  gsap.killTweensOf(el);
  gsap.set(el, { opacity: 0, y: RISE });
}

// ---------- hero headline (played by the hero once its film is ready) ----------
let heroWant = null;
export function playHeroIntro(delay = 0) {
  const lines = heroSplit && heroSplit.lines;
  if (!lines || !lines.length) { heroWant = delay; return; }
  heroSplit.played = true;
  gsap.fromTo(lines, { yPercent: 112 }, { yPercent: 0, duration: 0.9, ease: 'spring', stagger: STEP, delay, overwrite: true });
}
export const heroLineCount = () => (heroSplit && heroSplit.lines ? heroSplit.lines.length : 1);

function splitLines(el, rec) {
  SplitText.create(el, {
    type: 'lines',
    mask: 'lines',
    linesClass: 'ln',
    autoSplit: true,
    onSplit(self) {
      el.classList.add('is-split');
      rec.lines = self.lines;
      gsap.set(self.lines, { yPercent: rec.shown || rec.played ? 0 : 112 });
    },
  });
}

// ---------- headlines that light up with scroll ----------
// Each word starts dim and brightens in turn as the headline scrolls into reading position.
// It is scrubbed, so the light follows the scroll in both directions. Non-breaking spaces
// stay inside their word.
export function lightUp(el, { start = 'top 88%', end = 'top 45%' } = {}) {
  const parts = el.textContent.trim().split(/[ \t\r\n]+/);
  el.textContent = '';
  const words = parts.map((part, i) => {
    const w = document.createElement('span');
    w.className = 'w';
    w.textContent = part;
    el.appendChild(w);
    if (i < parts.length - 1) el.appendChild(document.createTextNode(' '));
    return w;
  });
  el.classList.add('is-split');
  if (RM) return words;
  const set = (p) => {
    const k = p * words.length;
    words.forEach((w, i) => { w.style.opacity = (0.16 + 0.84 * clamp(k - i, 0, 1)).toFixed(3); });
  };
  set(0);
  ScrollTrigger.create({ trigger: el, start, end, scrub: true, onUpdate: (s) => set(s.progress), onRefresh: (s) => set(s.progress) });
  return words;
}

export function initReveals() {
  // Headlines: the hero's plays as an intro; every other one lights up with scroll.
  qsa('[data-split]').forEach((el) => {
    if (el.dataset.split === 'hero') {
      if (RM || !window.SplitText) { el.classList.add('is-split'); return; }
      const rec = { lines: [], shown: false, played: false };
      heroSplit = rec;
      splitLines(el, rec);
      if (heroWant !== null) playHeroIntro(heroWant);
      return;
    }
    lightUp(el);
  });

  // Section labels: the index first, then the words decode.
  qsa('.label').filter((l) => !l.closest('.hero')).forEach((label) => {
    const t = labelText(label);
    const text = t ? t.textContent : '';
    register(label, {
      show(delay) {
        gsap.to(label, { opacity: 1, duration: 0.3, ease: 'springSoft', delay, overwrite: true });
        if (t) decode(t, text, { delay: delay + 0.06 });
      },
      hide() {
        gsap.killTweensOf(label);
        gsap.set(label, { opacity: 0 });
        undecode(t);
      },
      end() { gsap.set(label, { opacity: 1 }); },
    });
  });

  // Supporting elements.
  qsa('.rv').filter((el) => !el.closest('.hero') && !isRegistered(el)).forEach((el) => {
    register(el, {
      show: (delay) => rise(el, delay),
      hide: () => sink(el),
      end: () => gsap.set(el, { opacity: 1, y: 0 }),
    });
  });
}
