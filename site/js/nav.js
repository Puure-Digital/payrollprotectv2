// Navigation: solid after the film, scroll progress hairline, sliding active-section
// indicator (a fixed bar, positioned and sized by transform), and the mobile menu.
import { RM, qs, qsa } from './util.js';
import { stopScroll } from './scroll.js';

export function initNav() {
  const nav = qs('#nav');
  const burger = qs('.nav__burger', nav);
  const links = qs('#nav-links');
  const ind = qs('.nav__ind', nav);
  const bar = qs('.nav__progress', nav);
  const items = qsa('a[data-nav]', nav);
  const menuItems = qsa('li, .nav__menu-cta', links);

  function setMenu(open) {
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    document.body.classList.toggle('no-scroll', open);
    stopScroll(open);
    // The page behind the open menu can't take focus, so the keyboard stays in the menu.
    document.querySelectorAll('main, footer').forEach((el) => { el.inert = open; });
    gsap.killTweensOf([links, ...menuItems]);
    if (open) {
      // Reopened while it is still fading out: carry on from where it is, not from the start.
      const reopen = nav.classList.contains('menu-open');
      nav.classList.add('menu-open');
      if (RM) return;
      if (reopen) {
        gsap.to(links, { opacity: 1, duration: 0.3, ease: 'springSoft' });
        gsap.to(menuItems, { opacity: 1, y: 0, duration: 0.5, ease: 'spring' });
        return;
      }
      gsap.fromTo(links, { opacity: 0 }, { opacity: 1, duration: 0.3, ease: 'springSoft' });
      gsap.fromTo(menuItems, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.5, ease: 'spring', stagger: 0.06, delay: 0.04 });
    } else if (nav.classList.contains('menu-open')) {
      const done = () => { nav.classList.remove('menu-open'); gsap.set([links, ...menuItems], { clearProps: 'opacity,transform' }); };
      if (RM) done();
      else gsap.to(links, { opacity: 0, duration: 0.18, ease: 'springSoft', onComplete: done });
    }
  }
  burger.addEventListener('click', () => setMenu(burger.getAttribute('aria-expanded') !== 'true'));
  links.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && nav.classList.contains('menu-open')) { setMenu(false); burger.focus(); } });
  window.matchMedia('(min-width: 1080px)').addEventListener('change', (e) => { if (e.matches) setMenu(false); });

  // Solid once the film has finished. A page that opens on a dark stage (data-clear) starts clear
  // and turns solid as soon as it scrolls. Other pages start solid.
  if (qs('#gap')) {
    ScrollTrigger.create({
      trigger: '#gap', start: 'top 1px',
      onEnter: () => nav.classList.add('is-solid'),
      onLeaveBack: () => nav.classList.remove('is-solid'),
    });
  } else if (nav.hasAttribute('data-clear')) {
    ScrollTrigger.create({
      start: 1, end: 'max',
      onEnter: () => nav.classList.add('is-solid'),
      onLeaveBack: () => nav.classList.remove('is-solid'),
    });
    nav.classList.toggle('is-solid', window.scrollY >= 1);
  } else nav.classList.add('is-solid');

  // Whole-page progress.
  ScrollTrigger.create({ start: 0, end: 'max', onUpdate: (self) => { bar.style.transform = 'scaleX(' + self.progress.toFixed(4) + ')'; } });

  // Active section indicator. On a fine pointer it also follows the pointer across the links,
  // gliding from link to link, and returns to the current section when the pointer leaves.
  let current = null, shown = false;
  function place(a) {
    if (!a) { ind.style.opacity = '0'; shown = false; return; }
    const t = 'translateX(' + (a.offsetLeft + 11) + 'px) scaleX(' + ((a.offsetWidth - 22) / 100).toFixed(3) + ')';
    if (!shown) {
      // Appearing: start under the link rather than sliding in from wherever it last was.
      ind.style.transition = 'none';
      ind.style.transform = t;
      void ind.offsetWidth;
      ind.style.transition = '';
    } else ind.style.transform = t;
    ind.style.opacity = '1';
    shown = true;
  }
  function setActive(a) {
    current = a;
    items.forEach((x) => x.classList.toggle('is-active', x === a));
    if (!hovering) place(a);
  }
  let hovering = false;
  if (!RM && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    const list = qs('ul', links) || links;
    items.forEach((a) => a.addEventListener('pointerenter', () => { hovering = true; place(a); }));
    list.addEventListener('pointerleave', () => { hovering = false; place(current); });
  }
  // On another page the current page's link holds the indicator.
  const here = items.find((a) => a.getAttribute('aria-current') === 'page');
  if (here) {
    setActive(here);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => setActive(here));
    window.addEventListener('resize', () => setActive(here));
  }
  items.forEach((a) => {
    const href = a.getAttribute('href');
    const sec = href.startsWith('#') ? qs(href) : null;
    if (!sec) return;
    ScrollTrigger.create({
      trigger: sec, start: 'top 45%', end: 'bottom 45%',
      onToggle: (self) => { if (self.isActive) setActive(a); else if (!items.some((x) => x !== a && x.classList.contains('is-active'))) setActive(null); },
    });
  });
}
