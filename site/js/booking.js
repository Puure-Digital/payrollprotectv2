// PayRoll Protect · booking page.
// The pilot request is the client's GoHighLevel form (an iframe sized by GHL's form_embed.js,
// loaded in the page). Beside it, the pilot it books: the home page's estimate (1.7% of labour
// spend, held from go-live on day 14 to day 90) at the spend the home page calculator passes in
// the address (book.html?spend=250000), or £250,000 a week.
import { boot } from './boot.js';
import { initScroll } from './scroll.js';
import { initNav } from './nav.js';
import { initFaq } from './faq.js';
import { initFx } from './fx.js';
import { initFoot } from './foot.js';
import { initPilot } from './pilot.js';
import { initReveals } from './reveal.js';
import { initLive } from './engine.js';
import { qs, gbp } from './util.js';
import { MIN, MAX, nice, heldBy90 } from './calc.js';

function initBooking() {
  const asked = Number(new URLSearchParams(location.search).get('spend'));
  const spend = asked >= MIN && asked <= MAX ? nice(asked) : 250000;
  const spendOut = qs('[data-s="spend"]'), held = qs('[data-s="held"]');
  if (spendOut) spendOut.textContent = gbp(spend);
  if (held) held.textContent = gbp(heldBy90(spend));
}

boot([initFx, initScroll, initBooking, initPilot, initFaq, initFoot, initNav, initReveals, initLive]);
