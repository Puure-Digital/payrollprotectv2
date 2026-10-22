/* Payroll Protect — main.js (v2)
   Scroll-driven hero, nav, spring reveals, odometer figures, live attendance feed,
   scroll-driven invoice reconciliation, calculator, FAQ, form fallback.
   All animation is transform/opacity only and respects prefers-reduced-motion. */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var nav = document.getElementById('nav');
  var hero = document.querySelector('.hero');
  var scrollJobs = [];

  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }

  /* ------------------------------------------------------------------ */
  /* Scroll loop: one rAF for everything that tracks scroll              */
  /* ------------------------------------------------------------------ */
  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      ticking = false;
      for (var i = 0; i < scrollJobs.length; i++) scrollJobs[i]();
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);

  /* ------------------------------------------------------------------ */
  /* Nav: menu + stuck state                                              */
  /* ------------------------------------------------------------------ */
  (function initNav() {
    var btn = nav.querySelector('.nav__menu');
    var links = document.getElementById('nav-links');
    function setMenu(open) {
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      btn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      nav.classList.toggle('menu-open', open);
      document.body.classList.toggle('no-scroll', open);
    }
    btn.addEventListener('click', function () { setMenu(btn.getAttribute('aria-expanded') !== 'true'); });
    links.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setMenu(false); });
    window.matchMedia('(min-width: 1024px)').addEventListener('change', function (e) { if (e.matches) setMenu(false); });

    scrollJobs.push(function () {
      var release = hero ? hero.offsetTop + hero.offsetHeight - window.innerHeight : 0;
      nav.classList.toggle('is-stuck', window.scrollY > Math.max(release - 24, 80));
    });
  })();

  /* ------------------------------------------------------------------ */
  /* Hero: canvas frame scrub                                             */
  /* ------------------------------------------------------------------ */
  (function initHero() {
    if (!hero) return;
    var canvas = hero.querySelector('.hero__canvas');
    if (!canvas || reduceMotion || !canvas.getContext) { hero.classList.add('is-static'); return; }

    var ctx = canvas.getContext('2d', { alpha: false });
    var total = parseInt(hero.getAttribute('data-frames'), 10) || 96;
    // Portrait-cropped frames for portrait screens (phones, tablets upright); full frames otherwise.
    var isMobile = window.matchMedia('(max-width: 1023px) and (max-aspect-ratio: 4/5)').matches;
    var dir = hero.getAttribute(isMobile ? 'data-frames-mobile' : 'data-frames-desktop');
    var ext = hero.getAttribute('data-frames-ext') || 'jpg';
    function attr(name, fallback) {
      var v = isMobile ? hero.getAttribute(name + '-mobile') : null;
      return parseFloat(v !== null ? v : (hero.getAttribute(name) || fallback));
    }
    var focalX = attr('data-focal-x', '0.5');
    var focalY = attr('data-focal-y', '0.5');
    var bar = hero.querySelector('.hero__loader-bar');
    // Final share of the scroll that holds the last frame (the verified moment).
    var playEnd = 1 - clamp(parseFloat(hero.getAttribute('data-hold') || '0'), 0, 0.5);
    var stops = (hero.getAttribute('data-stages') || '0.18,0.5,0.8').split(',').map(parseFloat);
    var frames = new Array(total), loaded = 0, ready = false, drawn = -1, stage = -1;

    function pad(n) { n = String(n); while (n.length < 4) n = '0' + n; return n; }
    function load(i) {
      return new Promise(function (resolve) {
        var img = new Image();
        img.decoding = 'async';
        img.onload = function () { frames[i] = img; loaded++; progressed(); resolve(img); };
        img.onerror = function () { resolve(null); };
        img.src = dir + '/frame_' + pad(i + 1) + '.' + ext;
      });
    }
    function progressed() {
      if (bar) bar.style.transform = 'scaleX(' + (loaded / total) + ')';
      if (!ready && loaded / total >= 0.2) { ready = true; hero.classList.add('is-ready'); render(true); }
      if (loaded >= total) hero.classList.add('is-loaded');
    }
    function nearest(i) {
      if (frames[i]) return frames[i];
      for (var d = 1; d < total; d++) {
        if (i - d >= 0 && frames[i - d]) return frames[i - d];
        if (i + d < total && frames[i + d]) return frames[i + d];
      }
      return null;
    }
    function size() {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      var w = Math.round(canvas.clientWidth * dpr), h = Math.round(canvas.clientHeight * dpr);
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; return true; }
      return false;
    }
    function drawCover(img) {
      var cw = canvas.width, ch = canvas.height, ir = img.naturalWidth / img.naturalHeight, dw, dh;
      if (cw / ch > ir) { dw = cw; dh = cw / ir; } else { dh = ch; dw = ch * ir; }
      ctx.drawImage(img, (cw - dw) * focalX, (ch - dh) * focalY, dw, dh);
    }
    function progress() {
      var span = hero.offsetHeight - window.innerHeight;
      return span <= 0 ? 0 : clamp(-hero.getBoundingClientRect().top / span, 0, 1);
    }
    function render(force) {
      var resized = size(), p = progress(), idx = Math.round(Math.min(p / playEnd, 1) * (total - 1));
      if (force || resized || idx !== drawn) { var img = nearest(idx); if (img) { drawCover(img); drawn = idx; } }
      var s = p < stops[0] ? 0 : p < stops[1] ? 1 : p < stops[2] ? 2 : 3;
      if (s !== stage) { stage = s; hero.setAttribute('data-stage', String(s)); }
    }
    scrollJobs.push(function () { render(false); });
    window.addEventListener('resize', function () { render(true); });

    var first = Math.max(2, Math.ceil(total * 0.2));
    load(0).then(function () {
      render(true);
      var batch = [];
      for (var i = 1; i < first; i++) batch.push(load(i));
      return Promise.all(batch);
    }).then(function () {
      var i = first;
      (function next() {
        if (i >= total) return;
        var chunk = [];
        for (var j = i; j < Math.min(i + 8, total); j++) chunk.push(load(j));
        i += 8;
        Promise.all(chunk).then(function () { render(false); next(); });
      })();
    });
    render(true);
  })();

  /* ------------------------------------------------------------------ */
  /* Odometer: digits roll into place, rightmost settling last           */
  /* ------------------------------------------------------------------ */
  var Odometer = (function () {
    function fmt(el, value) {
      var decimals = parseInt(el.getAttribute('data-decimals') || '0', 10);
      var prefix = el.getAttribute('data-prefix') || '';
      var suffix = el.getAttribute('data-suffix') || '';
      var parts = Math.abs(value).toFixed(decimals).split('.');
      parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
      return prefix + parts.join('.') + suffix;
    }
    function build(el, str) {
      el.textContent = '';
      var digits = 0;
      var digitCount = (str.match(/\d/g) || []).length;
      for (var i = 0; i < str.length; i++) {
        var ch = str[i];
        if (/\d/.test(ch)) {
          var d = document.createElement('span'); d.className = 'od__d';
          var s = document.createElement('span'); s.className = 'od__s';
          for (var n = 0; n <= 9; n++) { var sp = document.createElement('span'); sp.textContent = String(n); s.appendChild(sp); }
          // Later digits roll longer, like a real odometer.
          var fromRight = digitCount - 1 - digits;
          s.style.setProperty('--od-dur', (0.9 + (digitCount - 1 - fromRight) * 0.18).toFixed(2) + 's');
          s.style.setProperty('--d', '0');
          d.appendChild(s); el.appendChild(d);
          digits++;
        } else {
          var c = document.createElement('span'); c.className = 'od__c'; c.textContent = ch; el.appendChild(c);
        }
      }
      el._odShape = str.replace(/\d/g, '0');
    }
    function set(el, value, instant) {
      var str = fmt(el, value);
      var shape = str.replace(/\d/g, '0');
      if (el._odShape !== shape) {
        build(el, str);
        if (!instant && !reduceMotion) {
          // Force a frame at zero, then roll.
          void el.offsetWidth;
        }
      }
      var strips = el.querySelectorAll('.od__s');
      var k = 0;
      for (var i = 0; i < str.length; i++) {
        if (/\d/.test(str[i])) { strips[k].style.setProperty('--d', str[i]); k++; }
      }
      el.setAttribute('aria-label', str);
      el._odValue = value;
    }
    function mount(el) {
      var target = parseFloat(el.getAttribute('data-od') || '0');
      var empty = el.getAttribute('data-empty');
      el._odTarget = target;
      if (empty !== null && target === 0) { el.textContent = empty; el._odShape = null; return; }
      if (reduceMotion) { set(el, target, true); return; }
      build(el, fmt(el, target));           // all zeros, correct width
      if (el.hasAttribute('data-static')) { set(el, target, true); return; }
      if (!('IntersectionObserver' in window)) { set(el, target, true); return; }
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) { set(el, el._odTarget); io.unobserve(el); }
        });
      }, { threshold: 0.6 });
      io.observe(el);
    }
    return { mount: mount, set: set, fmt: fmt };
  })();

  document.querySelectorAll('.od').forEach(Odometer.mount);
  // Static odometers in the reconciliation panel start at their given value.
  document.querySelectorAll('.od[data-static]').forEach(function (el) {
    if (el.getAttribute('data-empty') === null) Odometer.set(el, parseFloat(el.getAttribute('data-od') || '0'), true);
  });

  /* ------------------------------------------------------------------ */
  /* Reveals: staggered, spring eased                                     */
  /* ------------------------------------------------------------------ */
  (function initReveals() {
    document.querySelectorAll('[data-stagger]').forEach(function (group) {
      Array.prototype.forEach.call(group.children, function (child, i) { child.style.setProperty('--i', String(i)); });
    });
    var items = document.querySelectorAll('.r');
    if (reduceMotion || !('IntersectionObserver' in window)) { items.forEach(function (el) { el.classList.add('in'); }); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
    }, { threshold: 0.04, rootMargin: '0px 0px -6% 0px' });
    var vh = window.innerHeight;
    items.forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (r.top < vh * 0.94 && r.bottom > 0) el.classList.add('in'); else io.observe(el);
    });
  })();

  /* ------------------------------------------------------------------ */
  /* Live attendance feed                                                 */
  /* ------------------------------------------------------------------ */
  (function initFeed() {
    var list = document.getElementById('feed-list');
    var counter = document.getElementById('feed-count');
    if (!list || reduceMotion) return;

    var TRADES = ['Groundworks', 'Brickwork', 'M&E', 'Roofing', 'Scaffolding', 'Carpentry', 'Plastering', 'Dry lining', 'Steel fixing', 'Glazing'];
    var IDS = ['W-0903', 'W-0348', 'W-1120', 'W-0587', 'W-0761', 'W-1203', 'W-0492', 'W-0938', 'W-1077', 'W-0266', 'W-0815', 'W-1159'];
    var t = 7 * 3600 + 45 * 60;   // 07:45
    var n = 0, count = parseFloat(counter.getAttribute('data-od') || '148');
    var running = false, timer = null;

    function hhmm(s) { var h = Math.floor(s / 3600) % 24, m = Math.floor((s % 3600) / 60); return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m; }
    function row(id, trade, time) {
      var li = document.createElement('li');
      li.className = 'frow is-new';
      li.innerHTML = '<span class="frow__mark"><span class="spin"></span><svg class="tick" aria-hidden="true"><use href="#i-tick"/></svg></span>' +
        '<span class="frow__who"><strong>' + id + '</strong><span>' + trade + '</span></span>' +
        '<span class="frow__time">' + time + '</span><span class="frow__status">Verifying</span>';
      return li;
    }
    function step() {
      if (!running) return;
      t += 25 + Math.floor(Math.random() * 50);
      var li = row(IDS[n % IDS.length], TRADES[(n * 7) % TRADES.length], hhmm(t));
      var flag = n % 9 === 8;
      n++;
      list.insertBefore(li, list.firstChild);
      requestAnimationFrame(function () { requestAnimationFrame(function () { li.classList.remove('is-new'); }); });
      setTimeout(function () {
        li.classList.add(flag ? 'is-flag' : 'is-ok');
        li.querySelector('.frow__status').textContent = flag ? 'Not recognised' : 'Verified';
        if (!flag) { count++; Odometer.set(counter, count); }
      }, 700 + Math.random() * 300);
      while (list.children.length > 6) {
        var last = list.children[list.children.length - 1];
        if (!last.classList.contains('is-out')) {
          last.classList.add('is-out');
          (function (el) { setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 500); })(last);
        }
        break;
      }
      timer = setTimeout(step, 1700 + Math.random() * 900);
    }
    function start() { if (running) return; running = true; timer = setTimeout(step, 600); }
    function stop() { running = false; clearTimeout(timer); }

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        entries.forEach(function (en) { if (en.isIntersecting && !document.hidden) start(); else stop(); });
      }, { threshold: 0.2 }).observe(list);
    } else { start(); }
    document.addEventListener('visibilitychange', function () { if (document.hidden) stop(); else onScroll(); });
  })();

  /* ------------------------------------------------------------------ */
  /* Reconciliation: lines check in as you scroll                         */
  /* ------------------------------------------------------------------ */
  (function initRecon() {
    var section = document.querySelector('[data-recon]');
    if (!section) return;
    var lines = Array.prototype.slice.call(section.querySelectorAll('.line'));
    var doc = document.getElementById('recon-doc');
    var listEl = document.getElementById('recon-lines');
    var verifiedEl = document.getElementById('recon-verified');
    var flaggedEl = document.getElementById('recon-flagged');
    var countEl = document.getElementById('recon-count');
    var n = lines.length, checked = -1;

    var data = lines.map(function (li) {
      var c = parseFloat(li.getAttribute('data-claimed')), v = parseFloat(li.getAttribute('data-verified')), r = parseFloat(li.getAttribute('data-rate'));
      return { claimed: Math.round(c * r), verified: Math.round(v * r) };
    });

    function apply(k) {
      if (k === checked) return;
      checked = k;
      var ver = 0, flg = 0;
      for (var i = 0; i < n; i++) {
        var on = i < k;
        lines[i].classList.toggle('is-checked', on);
        if (on) { ver += data[i].verified; flg += data[i].claimed - data[i].verified; }
      }
      Odometer.set(verifiedEl, ver);
      Odometer.set(flaggedEl, flg);
      countEl.textContent = String(k);
    }

    if (reduceMotion) { apply(n); return; }

    var pinned = window.matchMedia('(min-width: 1024px)');
    function update() {
      var vh = window.innerHeight, p;
      if (pinned.matches) {
        var span = section.offsetHeight - vh;
        p = span > 0 ? clamp(-section.getBoundingClientRect().top / span, 0, 1) : 1;
        // Leave the first 12% as a settle-in, finish checking by 85%.
        p = clamp((p - 0.12) / 0.73, 0, 1);
      } else {
        var r = doc.getBoundingClientRect();
        p = clamp((vh * 0.9 - r.top) / (r.height + vh * 0.15), 0, 1);
      }
      var k = Math.min(n, Math.floor(p * (n + 1)));
      apply(k);
      // Scan line tracks the next line to be checked.
      var lr = listEl.getBoundingClientRect(), dr = doc.getBoundingClientRect();
      var y = (lr.top - dr.top) + lr.height * clamp(p, 0, 1);
      doc.style.setProperty('--scan-top', y.toFixed(1) + 'px');
      section.classList.toggle('is-scanning', p > 0.02 && p < 0.995);
    }
    scrollJobs.push(update);
    update();
  })();

  /* ------------------------------------------------------------------ */
  /* Exposure calculator                                                  */
  /* ------------------------------------------------------------------ */
  (function initCalculator() {
    var input = document.getElementById('spend');
    var outMonth = document.getElementById('out-month');
    var outYear = document.getElementById('out-year');
    if (!input) return;
    var RATE = 0.017;
    var group = new Intl.NumberFormat('en-GB');
    function update() {
      var digits = input.value.replace(/[^0-9]/g, '');
      if (!digits) {
        outMonth.textContent = '—'; outMonth._odShape = null;
        outYear.textContent = '—'; outYear._odShape = null;
        return;
      }
      var weekly = parseInt(digits.slice(0, 10), 10);
      var annual = weekly * 52 * RATE;
      Odometer.set(outMonth, Math.round(annual / 12));
      Odometer.set(outYear, Math.round(annual));
      var caret = input.selectionStart, before = input.value.length;
      input.value = group.format(weekly);
      var after = input.value.length;
      if (caret !== null) { var pos = Math.max(0, caret + (after - before)); try { input.setSelectionRange(pos, pos); } catch (e) {} }
    }
    input.addEventListener('input', update);
    input.closest('form').addEventListener('submit', function (e) { e.preventDefault(); update(); });
  })();

  /* ------------------------------------------------------------------ */
  /* FAQ: one open at a time                                              */
  /* ------------------------------------------------------------------ */
  (function initFaq() {
    var items = document.querySelectorAll('.qa');
    items.forEach(function (d) {
      d.addEventListener('toggle', function () {
        if (!d.open) return;
        items.forEach(function (o) { if (o !== d && o.open) o.open = false; });
      });
    });
  })();

  /* ------------------------------------------------------------------ */
  /* Pilot form: validate; mailto fallback until an endpoint is set       */
  /* ------------------------------------------------------------------ */
  (function initForm() {
    var form = document.getElementById('pilot-form');
    if (!form) return;
    var error = document.getElementById('form-error');
    form.addEventListener('submit', function (e) {
      var name = form.elements.name.value.trim();
      var company = form.elements.company.value.trim();
      var email = form.elements.email.value.trim();
      var valid = name && company && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      if (!valid) {
        e.preventDefault();
        error.hidden = false;
        var first = [form.elements.name, form.elements.company, form.elements.email].filter(function (f) { return !f.value.trim(); })[0] || form.elements.email;
        first.focus();
        return;
      }
      error.hidden = true;
      if (form.action.indexOf('REPLACE_ME') !== -1) {
        e.preventDefault();
        var lines = [
          'Name: ' + name,
          'Company: ' + company,
          'Role: ' + form.elements.role.value.trim(),
          'Email: ' + email,
          'Phone: ' + form.elements.phone.value.trim(),
          'Weekly subcontract labour spend: ' + form.elements.weekly_spend.value.trim(),
          '',
          form.elements.message.value.trim()
        ];
        window.location.href = 'mailto:hello@payrollprotect.co.uk?subject=' +
          encodeURIComponent('Pilot enquiry from payrollprotect.co.uk') +
          '&body=' + encodeURIComponent(lines.join('\n'));
      }
    });
  })();

  onScroll();
})();
