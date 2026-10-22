// How it works: the product stage follows the step being read (desktop),
// or steps through on its own while in view (phone).
// Step dots are fixed bars placed and sized by transform (--x, --s), never by width.
import { RM, qs, qsa, DESKTOP } from './util.js';

export function initHow() {
  const steps = qsa('#steps .step');
  const views = qsa('#stage .sv');
  const dots = qsa('#stage .stage__dots i');
  if (!steps.length) return;
  let cur = 0;
  function place(i) {
    dots.forEach((d, k) => {
      d.style.setProperty('--x', (k * 21 + (k > i ? 12 : 0)) + 'px');
      d.style.setProperty('--s', k === i ? '1' : '0.5714');
      d.classList.toggle('is-on', k === i);
    });
  }
  function show(i) {
    if (i === cur) return;
    cur = i;
    steps.forEach((s, k) => s.classList.toggle('is-on', k === i));
    views.forEach((v, k) => v.classList.toggle('is-on', k === i));
    place(i);
  }
  place(0);

  const mm = gsap.matchMedia();
  mm.add(DESKTOP, () => {
    const ts = steps.map((s, i) => ScrollTrigger.create({
      trigger: s, start: 'top 60%', end: 'bottom 60%',
      onToggle: (self) => { if (self.isActive) show(i); },
    }));
    if (RM) return () => ts.forEach((t) => t.kill());
    // Focus follows the scroll: the step at the reading line is bright and the rest recede,
    // and each step's top rule fills as the reading line passes through it.
    const sec = qs('#how');
    sec.classList.add('is-focus');
    const focus = () => {
      const line = window.innerHeight * 0.6, reach = window.innerHeight * 0.5;
      const boxes = steps.map((s) => s.getBoundingClientRect());
      boxes.forEach((b, i) => {
        const d = Math.abs((b.top + b.bottom) / 2 - line) / reach;
        steps[i].style.opacity = (1 - Math.min(d, 1) * 0.64).toFixed(3);
        steps[i].style.setProperty('--f', Math.min(1, Math.max(0, (line - b.top) / b.height)).toFixed(4));
      });
    };
    const fst = ScrollTrigger.create({ trigger: qs('#steps'), start: 'top bottom', end: 'bottom top', onUpdate: focus, onRefresh: focus });
    return () => {
      ts.forEach((t) => t.kill());
      fst.kill();
      sec.classList.remove('is-focus');
      steps.forEach((s) => { s.style.opacity = ''; s.style.removeProperty('--f'); });
    };
  });
  // Phones: the stage steps through on its own while in view, and Pause stops it (WCAG 2.2.2:
  // anything that moves by itself for more than five seconds needs a way to stop it).
  mm.add('(max-width: 1023px)', () => {
    if (RM) return;
    const pause = qs('.stage__pause');
    pause.textContent = 'Pause'; // each phone layout starts playing, so its label must say so
    let timer = null, inView = false, paused = false;
    const run = () => {
      clearInterval(timer);
      if (inView && !paused) timer = setInterval(() => show((cur + 1) % views.length), 3400);
    };
    const toggle = () => { paused = !paused; pause.textContent = paused ? 'Play' : 'Pause'; run(); };
    const st = ScrollTrigger.create({
      trigger: qs('#stage'), start: 'top 85%', end: 'bottom 15%',
      onToggle: (self) => { inView = self.isActive; run(); },
    });
    pause.addEventListener('click', toggle);
    return () => { clearInterval(timer); st.kill(); pause.removeEventListener('click', toggle); };
  });
}
