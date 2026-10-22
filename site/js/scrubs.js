// Sequences that follow the scroll. Items wait, dimmed, and light one after another as the
// group scrolls through the viewport; scrolling back dims them again.
// - The numbers: £82bn × 1.7% = £1.4bn, each figure counting up as it lights.
// Reduced motion: everything is shown and nothing moves.
import { RM, qs, qsa } from './util.js';
import { setOd, odZero } from './odometer.js';

function sequence(group, items, { start, end, on, off }) {
  if (!group || !items.length) return;
  const lit = items.map(() => null);
  const paint = (p) => items.forEach((el, i) => {
    const now = p >= (i + 0.4) / (items.length + 0.4);
    if (now === lit[i]) return;
    lit[i] = now;
    el.classList.toggle('is-lit', now);
    if (now && on) on(el, i);
    if (!now && off) off(el, i);
  });
  ScrollTrigger.create({
    trigger: group, start, end,
    onUpdate: (self) => paint(self.progress),
    onRefresh: (self) => paint(self.progress),
  });
}

export function initScrubs() {
  const stats = qsa('.stats .stat');
  if (RM) {
    stats.forEach((el) => el.classList.add('is-lit'));
    return;
  }
  stats.forEach((s) => odZero(qs('.od', s)));
  sequence(qs('.stats'), stats, {
    start: 'top 85%', end: 'top 40%',
    on: (el) => { const od = qs('.od', el); setOd(od, parseFloat(od.dataset.od), { dur: 0.8, step: 0.06 }); },
    off: (el) => odZero(qs('.od', el), false),
  });
}
