// PayRoll Protect · page not found (404.html).
import { boot } from './boot.js';
import { initScroll } from './scroll.js';
import { initNav } from './nav.js';
import { initFx } from './fx.js';
import { initFoot } from './foot.js';
import { initReveals } from './reveal.js';
import { initLive } from './engine.js';

boot([initFx, initScroll, initNav, initFoot, initReveals, initLive]);
