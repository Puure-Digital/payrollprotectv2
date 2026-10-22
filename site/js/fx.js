// Pointer micro-interactions: magnetic primary buttons and a soft spotlight on cards.
// Both move by transform only. Fine pointers only, and never with reduced motion.
import { RM, FINE, qsa } from './util.js';

export function initFx() {
  if (RM || !FINE) return;

  // Buttons lean toward the pointer and settle back on the critically damped spring.
  qsa('[data-magnetic]').forEach((el) => {
    const wrap = document.createElement('span');
    wrap.className = 'mag';
    el.parentNode.insertBefore(wrap, el);
    wrap.appendChild(el);
    const xTo = gsap.quickTo(wrap, 'x', { duration: 0.5, ease: 'springSoft' });
    const yTo = gsap.quickTo(wrap, 'y', { duration: 0.5, ease: 'springSoft' });
    wrap.addEventListener('pointermove', (e) => {
      const r = wrap.getBoundingClientRect();
      xTo((e.clientX - (r.left + r.width / 2)) * 0.2);
      yTo((e.clientY - (r.top + r.height / 2)) * 0.28);
    });
    wrap.addEventListener('pointerleave', () => { xTo(0); yTo(0); });
  });

  // Spotlight: a fixed-size soft light inside a clipping layer, moved to the pointer.
  qsa('.spot').forEach((el) => {
    const layer = document.createElement('span');
    layer.className = 'spot__l';
    layer.setAttribute('aria-hidden', 'true');
    const light = document.createElement('i');
    layer.appendChild(light);
    el.appendChild(layer);
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      light.style.transform = 'translate(' + (e.clientX - r.left).toFixed(0) + 'px, ' + (e.clientY - r.top).toFixed(0) + 'px)';
    });
  });
}
