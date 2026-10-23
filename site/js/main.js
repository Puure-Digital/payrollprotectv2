// PayRoll Protect · home page.
// Pinned scenes are created top to bottom so ScrollTrigger measures pin spacing correctly.
import { boot } from './boot.js';
import { initLoader } from './loader.js';
import { initScroll } from './scroll.js';
import { initNav } from './nav.js';
import { initHero } from './hero.js';
import { initGap } from './gap.js';
import { initMatch } from './match.js';
import { initLeaks } from './leaks.js';
import { initHow } from './how.js';
import { mountOdometers } from './odometer.js';
import { initCalc } from './calc.js';
import { initCharts } from './charts.js';
import { initScrubs } from './scrubs.js';
import { initFilms } from './film.js';
import { initGlobe } from './globe.js';
import { initPilot } from './pilot.js';
import { initFaq } from './faq.js';
import { initFx } from './fx.js';
import { initFoot } from './foot.js';
import { initReveals } from './reveal.js';
import { initLive } from './engine.js';

// The preloader starts at once, before set-up, so its light tracks loading from the first frame.
initLoader();
boot([initFx, initScroll, initHero, initGap, initMatch, initLeaks, initHow, mountOdometers, initCalc, initCharts, initScrubs, initFilms, initGlobe, initPilot, initFaq, initFoot, initNav, initReveals, initLive]);
