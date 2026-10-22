// PayRoll Protect · installation page.
import { boot } from './boot.js';
import { initScroll } from './scroll.js';
import { initNav } from './nav.js';
import { initSat } from './sat.js';
import { initFaq } from './faq.js';
import { initFx } from './fx.js';
import { initFoot } from './foot.js';
import { initReveals } from './reveal.js';
import { initLive } from './engine.js';

boot([initFx, initScroll, initSat, initFaq, initFoot, initNav, initReveals, initLive]);
