// Leaks, driven by scroll. Each card holds a short evidence check, built in causal order:
// the record, the check, then the finding.
// - Desktop: the section pins and the three leaks take turns, one card at a time. Within its
//   turn a card's check is scrubbed by scroll, so the reader drives it; a stepper tracks
//   progress. Cards enter from below and leave upwards, and reverse the same way.
// - Smaller screens: each card's check plays as the card scrolls up the screen.
// Reduced motion: the markup already shows every finished check.
import { RM, qs, qsa, clamp, DESKTOP } from './util.js';
import { springSoftAt } from './motion.js';

// Ghost worker: the week's gate checks are laid out, a scan passes, and each day comes back
// empty as the scan reaches it.
function ghost(card) {
  const top = qs('.lv__top', card);
  const base = qs('.gw__base', card);
  const rings = qsa('.gw__ring', card);
  const misses = qsa('.gw__miss', card);
  const days = qsa('.gw__days span', card);
  const beam = qs('.gw__beam', card);
  const out = qs('.lv__out', card);
  const SWEEP = 0.75, T0 = 0.5;
  return {
    reset() {
      gsap.set([top, ...days, out], { opacity: 0 });
      gsap.set(base, { scaleX: 0 });
      gsap.set(rings, { opacity: 0, scale: 0.5 });
      gsap.set(misses, { opacity: 0, scale: 0.6 });
      gsap.set(beam, { opacity: 0, x: 0 });
      gsap.set(out, { y: 8 });
    },
    build() {
      // The scan runs from just before Monday to just after Friday; each day is timed to the
      // moment the scan reaches its centre.
      const a = base.offsetLeft - 20, b = base.offsetLeft + base.offsetWidth + 20;
      const at = qsa('.gw__days li', card).map((li) => (li.offsetLeft + li.offsetWidth / 2 - a) / (b - a));
      gsap.set(beam, { x: a });
      const tl = gsap.timeline({ paused: true })
        .to(top, { opacity: 1, duration: 0.3, ease: 'springSoft' }, 0)
        .to(base, { scaleX: 1, duration: 0.5, ease: 'springSoft' }, 0.08)
        .to(rings, { opacity: 1, scale: 1, duration: 0.4, ease: 'spring', stagger: 0.05 }, 0.16)
        .to(days, { opacity: 1, duration: 0.3, ease: 'springSoft', stagger: 0.05 }, 0.2)
        .to(beam, { opacity: 1, duration: 0.12, ease: 'springSoft' }, T0)
        .to(beam, { x: b, duration: SWEEP, ease: 'springSoft' }, T0);
      misses.forEach((m, j) => tl.to(m, { opacity: 1, scale: 1, duration: 0.3, ease: 'spring' }, T0 + SWEEP * springSoftAt(at[j])));
      tl.to(beam, { opacity: 0, duration: 0.15, ease: 'springSoft' }, T0 + SWEEP)
        .to(out, { opacity: 1, y: 0, duration: 0.5, ease: 'spring' }, T0 + SWEEP + 0.05);
      return tl;
    },
  };
}

// Inflated hours: the claimed shift is drawn, then the gate record; guides carry the gate times
// up to the claim, and the overrun lights outside them at both ends.
function hours(card) {
  const top = qs('.lv__top', card);
  const keys = qsa('.sh__k', card);
  const claim = qs('.sh__claim', card), gate = qs('.sh__gate', card);
  const overs = qsa('.sh__over', card);
  const guides = qsa('.sh__guide', card);
  const claimT = qsa('.sh__claim ~ .sh__t', card), gateT = qsa('.sh__gate ~ .sh__t', card);
  const out = qs('.lv__out', card);
  return {
    reset() {
      gsap.set([top, ...keys, ...claimT, ...gateT, out], { opacity: 0 });
      gsap.set([claim, gate], { scaleX: 0 });
      gsap.set(overs, { opacity: 0, scaleX: 0.4 });
      gsap.set(guides, { scaleY: 0 });
      gsap.set(out, { y: 8 });
    },
    build() {
      return gsap.timeline({ paused: true })
        .to(top, { opacity: 1, duration: 0.3, ease: 'springSoft' }, 0)
        .to(keys, { opacity: 1, duration: 0.3, ease: 'springSoft', stagger: 0.06 }, 0.06)
        .to(claim, { scaleX: 1, duration: 0.6, ease: 'springSoft' }, 0.18)
        .to(claimT, { opacity: 1, duration: 0.3, ease: 'springSoft', stagger: 0.08 }, 0.42)
        .to(gate, { scaleX: 1, duration: 0.6, ease: 'springSoft' }, 0.5)
        .to(gateT, { opacity: 1, duration: 0.3, ease: 'springSoft', stagger: 0.08 }, 0.74)
        .to(guides, { scaleY: 1, duration: 0.35, ease: 'springSoft', stagger: 0.06 }, 0.84)
        .to(overs, { opacity: 1, scaleX: 1, duration: 0.4, ease: 'spring', stagger: 0.1 }, 1.0)
        .to(out, { opacity: 1, y: 0, duration: 0.5, ease: 'spring' }, 1.2);
    },
  };
}

// Proxy clocking: two gates, the same identity scanned at each, then the impossible gap. A
// signal carries the identity from one gate to the other in the second between the scans.
function proxy(card) {
  const top = qs('.lv__top', card);
  const line = qs('.px__line', card);
  const dot = qs('.px__dot', card);
  const gates = qsa('.px__gate', card);
  const rings = gates.map((g) => qs('.px__ring', g));
  const pings = gates.map((g) => qs('.px__ping', g));
  const names = gates.map((g) => qs('.px__k', g));
  const times = gates.map((g) => qs('.px__t', g));
  const gap = qs('.px__gap i', card), gapT = qs('.px__gap span', card);
  const out = qs('.lv__out', card);
  return {
    reset() {
      gsap.set([top, ...names, ...times, gapT, out], { opacity: 0 });
      gsap.set(line, { scaleX: 0 });
      gsap.set(rings, { opacity: 0, scale: 0.5 });
      gsap.set(pings, { opacity: 0, scale: 1 });
      gsap.set(gap, { scaleX: 0 });
      gsap.set(dot, { opacity: 0, x: 0 });
      gsap.set(out, { y: 8 });
    },
    build() {
      const dist = gates[1].offsetLeft - gates[0].offsetLeft;
      const tl = gsap.timeline({ paused: true })
        .to(top, { opacity: 1, duration: 0.3, ease: 'springSoft' }, 0)
        .to(line, { scaleX: 1, duration: 0.5, ease: 'springSoft' }, 0.06)
        .to(rings, { opacity: 1, scale: 1, duration: 0.4, ease: 'spring', stagger: 0.08 }, 0.16)
        .to(names, { opacity: 1, duration: 0.3, ease: 'springSoft', stagger: 0.08 }, 0.22);
      // Each scan: a ping from the gate, then its time.
      [0.5, 0.8].forEach((t, i) => {
        tl.set(pings[i], { opacity: 0.8, scale: 1 }, t)
          .to(pings[i], { opacity: 0, scale: 2.8, duration: 0.6, ease: 'springSoft' }, t)
          .to(times[i], { opacity: 1, duration: 0.3, ease: 'springSoft' }, t + 0.06);
      });
      tl.to(dot, { opacity: 1, duration: 0.08, ease: 'springSoft' }, 0.53)
        .to(dot, { x: dist, duration: 0.27, ease: 'springSoft' }, 0.53)
        .to(dot, { opacity: 0, duration: 0.1, ease: 'springSoft' }, 0.78)
        .to(gap, { scaleX: 1, duration: 0.45, ease: 'springSoft' }, 1.05)
        .to(gapT, { opacity: 1, duration: 0.3, ease: 'springSoft' }, 1.2)
        .to(out, { opacity: 1, y: 0, duration: 0.5, ease: 'spring' }, 1.3);
      return tl;
    },
  };
}

const KINDS = { ghost, hours, proxy };

export function initLeaks() {
  const sec = qs('#leaks');
  if (!sec) return;
  const cards = qsa('.leak', sec);
  const steps = qsa('.leaks__steps li', sec);
  const bars = steps.map((s) => qs('i', s));
  const sims = cards.map((c) => (KINDS[c.dataset.leak] ? KINDS[c.dataset.leak](c) : null));
  if (RM) {
    cards.forEach((c) => c.classList.add('is-done'));
    return;
  }

  let tls = [];
  // Timelines are built from the hidden state so scrubbing works in both directions.
  function build() {
    tls.forEach((t) => t && t.kill());
    tls = sims.map((s) => {
      if (!s) return null;
      s.reset();
      return s.build();
    });
  }
  const setDone = (k, p) => cards[k].classList.toggle('is-done', p >= 0.999);

  const mm = gsap.matchMedia();
  mm.add(DESKTOP, () => {
    sec.classList.add('is-scene');
    build();
    let active = -1;
    function paint(p) {
      const x = clamp(p, 0, 0.9999) * cards.length;
      const i = Math.floor(x), q = clamp((x - i) / 0.7, 0, 1);
      if (i !== active) {
        active = i;
        cards.forEach((c, k) => { c.classList.toggle('is-active', k === i); c.classList.toggle('is-past', k < i); });
        steps.forEach((s, k) => s.classList.toggle('is-on', k === i));
      }
      tls.forEach((t, k) => {
        const v = k < i ? 1 : k > i ? 0 : q;
        if (t) t.progress(v);
        setDone(k, v);
        bars[k].style.transform = 'scaleX(' + v.toFixed(4) + ')';
      });
    }
    const st = ScrollTrigger.create({
      trigger: sec, start: 'top top', end: () => '+=' + Math.round(window.innerHeight * 2.4),
      pin: true,
      onUpdate: (self) => paint(self.progress),
      onRefresh: (self) => { build(); active = -1; paint(self.progress); },
    });
    paint(st.progress);
    return () => {
      sec.classList.remove('is-scene');
      cards.forEach((c) => c.classList.remove('is-active', 'is-past'));
    };
  });
  mm.add('(max-width: 1023px)', () => {
    build();
    const sts = cards.map((c, k) => tls[k] && ScrollTrigger.create({
      trigger: c, start: 'top 85%', end: 'top 30%', scrub: 0.5, animation: tls[k],
      onUpdate: (self) => setDone(k, self.progress),
    }));
    return () => sts.forEach((s) => s && s.kill());
  });
}
