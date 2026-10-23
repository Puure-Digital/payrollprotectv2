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
  // The terminal check (step 01) plays from its first frame whenever its view comes on, and
  // waits, held on that frame, until the stage is a quarter on screen.
  const scan = qs('#stage .sv--scan');
  const replay = () => {
    if (RM || !scan) return;
    scan.classList.remove('is-run');
    void scan.offsetWidth;
    scan.classList.add('is-run');
  };
  if (!RM && scan) {
    scan.classList.add('is-run', 'is-wait');
    const io = new IntersectionObserver((es) => {
      if (!es[0].isIntersecting) return;
      scan.classList.remove('is-wait');
      io.disconnect();
    }, { threshold: 0.25 });
    io.observe(qs('#stage'));
    // Fine pointers: the terminal leans toward the pointer, and back when it leaves.
    const term = qs('.term', scan);
    if (term && matchMedia('(hover: hover) and (pointer: fine)').matches) {
      const stage = qs('#stage');
      stage.addEventListener('pointermove', (e) => {
        const r = stage.getBoundingClientRect();
        term.style.setProperty('--tx', ((e.clientX - r.left) / r.width * 2 - 1).toFixed(3));
        term.style.setProperty('--ty', ((e.clientY - r.top) / r.height * 2 - 1).toFixed(3));
      });
      stage.addEventListener('pointerleave', () => { term.style.setProperty('--tx', 0); term.style.setProperty('--ty', 0); });
    }
  }
  function show(i) {
    if (i === cur) return;
    cur = i;
    steps.forEach((s, k) => s.classList.toggle('is-on', k === i));
    views.forEach((v, k) => v.classList.toggle('is-on', k === i));
    place(i);
    if (i === 0) replay();
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
