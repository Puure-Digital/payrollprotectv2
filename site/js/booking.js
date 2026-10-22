// PayRoll Protect · booking page.
// The pilot request in three short steps, beside a live summary of the pilot it describes.
// - Steps move along one axis: forward enters from the right and leaves to the left, and Back
//   returns the same way. Transitions run on the critically damped spring from wherever the
//   steps are, so a quick Back or Continue mid-motion simply redirects them.
// - A field checks itself when it is left and clears the moment it is fixed; Continue checks
//   the step. The steps above can be revisited from the step bar at any time.
// - The summary follows every keystroke and every movement of the spend slider. Its estimate is
//   the home page's: 1.7% of labour spend, held from go-live on day 14 to day 90.
// - With a form endpoint set, the request posts in place. Until then, sending opens the visitor's
//   email app with the request filled in, and the confirmation offers to copy it in case it did not.
// - A spend can arrive in the address (book.html?spend=250000), from the home page calculator.
// Without script the form is one page. Reduced motion: steps swap without sliding.
import { boot } from './boot.js';
import { initScroll, lenis } from './scroll.js';
import { springSoft } from './motion.js';
import { initNav } from './nav.js';
import { initFaq } from './faq.js';
import { initFx } from './fx.js';
import { initFoot } from './foot.js';
import { initPilot } from './pilot.js';
import { initReveals } from './reveal.js';
import { initLive } from './engine.js';
import { RM, qs, qsa, gbp } from './util.js';
import { MIN, MAX, toSpend, toV, nice, heldBy90 } from './calc.js';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NEED = [['name', 'email'], ['company'], []];
const SAY = { name: 'your name', email: 'a work email we can reply to', company: 'your company' };

function initBooking() {
  const form = qs('#book-form');
  if (!form) return;
  const el = form.elements;
  const steps = qsa('.bkf__step', form);
  const tabs = qsa('.bkf__steps button', form);
  const bar = qs('.bkf__bar i', form);
  const back = qs('.bkf__back', form), next = qs('.bkf__next', form), send = qs('.bkf__send', form);
  const err = qs('#bkf-error', form), done = qs('.bkf__done', form);
  const range = qs('#b-spend', form), spendOut = qs('.bkf__spend-v', form);
  const sum = (k) => qs('[data-s="' + k + '"]');
  const rev = (k) => qs('[data-r="' + k + '"]', form);
  let at = 0, reached = 0, spend = 250000;
  const held = { v: heldBy90(spend) };

  // ---------- the live summary ----------
  function paintHeld(animate) {
    const target = heldBy90(spend);
    if (!animate || RM) { held.v = target; sum('held').textContent = gbp(target); return; }
    gsap.to(held, { v: target, duration: 0.45, ease: 'springSoft', overwrite: true, onUpdate: () => { sum('held').textContent = gbp(held.v); } });
  }
  function setSpend(s, animate) {
    spend = s;
    const label = gbp(s);
    range.style.setProperty('--p', (Number(range.value) / 10).toFixed(1) + '%');
    spendOut.textContent = label;
    el.weekly_spend.value = label;
    range.setAttribute('aria-valuetext', label + ' a week');
    sum('spend').textContent = label;
    paintHeld(animate);
  }
  const sitesLabel = () => {
    const r = qs('input[name="sites"]:checked', form);
    if (!r) return 'Not set';
    const t = r.nextElementSibling.textContent;
    return t + (t === '1' ? ' site' : ' sites');
  };
  range.addEventListener('input', () => setSpend(nice(toSpend(Number(range.value))), true));
  el.company.addEventListener('input', () => { sum('company').textContent = el.company.value.trim() || 'Your company'; });
  qsa('input[name="sites"]', form).forEach((r) => r.addEventListener('change', () => { sum('sites').textContent = sitesLabel(); }));
  const asked = Number(new URLSearchParams(location.search).get('spend'));
  if (asked >= MIN && asked <= MAX) range.value = toV(nice(asked));
  setSpend(nice(toSpend(Number(range.value))), false);

  // ---------- checking ----------
  const valid = (f) => (f.name === 'email' ? EMAIL.test(f.value.trim()) : !!f.value.trim());
  function flag(f, bad) { f.closest('.field').classList.toggle('is-bad', bad); f.setAttribute('aria-invalid', String(bad)); }
  // Inline: a field that has been typed in checks itself when left, and clears as soon as it is right.
  form.addEventListener('focusout', (e) => {
    const f = e.target;
    if (f.required && f.value.trim()) flag(f, !valid(f));
  });
  form.addEventListener('input', (e) => {
    const f = e.target;
    if (f.required && f.closest('.field').classList.contains('is-bad') && valid(f)) flag(f, false);
  });
  function check(i, focus = true) {
    const bad = NEED[i].map((n) => el[n]).filter((f) => !valid(f));
    bad.forEach((f) => flag(f, true));
    if (!bad.length) { err.hidden = true; return true; }
    const words = bad.map((f) => SAY[f.name]);
    err.textContent = 'Please add ' + (words.length > 1 ? words.slice(0, -1).join(', ') + ' and ' + words.slice(-1) : words[0]) + '.';
    err.hidden = false;
    if (focus) bad[0].focus();
    return false;
  }

  // ---------- steps ----------
  // On a phone the card is taller than the screen: when its top has scrolled away, bring it back
  // so the new step, or the confirmation, starts in view.
  function toTop() {
    const clear = parseFloat(getComputedStyle(form).scrollMarginTop) || 0, top = form.getBoundingClientRect().top;
    if (top >= clear - 1) return;
    const y = top + scrollY - clear;
    if (lenis) lenis.scrollTo(y, { duration: 0.7, easing: springSoft });
    else scrollTo({ top: y, behavior: RM ? 'auto' : 'smooth' });
  }
  function fillReview() {
    rev('name').textContent = el.name.value.trim();
    rev('email').textContent = el.email.value.trim();
    rev('company').textContent = el.company.value.trim();
    rev('sites').textContent = sitesLabel();
    rev('spend').textContent = gbp(spend) + ' a week';
  }
  function chrome() {
    tabs.forEach((t, i) => {
      t.disabled = i > reached;
      if (i === at) t.setAttribute('aria-current', 'step'); else t.removeAttribute('aria-current');
    });
    back.hidden = at === 0;
    next.hidden = at === steps.length - 1;
    send.hidden = at !== steps.length - 1;
    gsap.to(bar, { scaleX: (at + 1) / steps.length, duration: 0.5, ease: 'springSoft', overwrite: true });
  }
  function show(to, focus) {
    const from = at, dir = to > from ? 1 : -1;
    if (to === from) return;
    at = to;
    reached = Math.max(reached, to);
    if (to === steps.length - 1) fillReview();
    const a = steps[from], b = steps[to];
    a.inert = true;
    a.setAttribute('aria-hidden', 'true');
    b.inert = false;
    b.removeAttribute('aria-hidden');
    b.classList.remove('is-off', 'is-leaving');
    if (RM) {
      a.classList.add('is-off');
      gsap.set(b, { opacity: 1, x: 0 });
    } else {
      // The leaving step accelerates away; the arriving one settles in from the side it came from.
      // On a phone the leaving step is lifted out of flow (CSS), so the card takes the new height.
      a.classList.add('is-leaving');
      gsap.to(a, { x: -24 * dir, opacity: 0, duration: 0.22, ease: 'springIn', overwrite: true, onComplete: () => { a.classList.remove('is-leaving'); a.classList.add('is-off'); } });
      if (gsap.getProperty(b, 'opacity') < 0.02) gsap.set(b, { x: 24 * dir });
      gsap.to(b, { x: 0, opacity: 1, duration: 0.55, ease: 'springSoft', delay: 0.1, overwrite: true });
    }
    chrome();
    err.hidden = true;
    toTop();
    // Focus lands on the step's first required field; a step with none (the review) takes focus
    // itself, so a screen reader hears its name without a keyboard opening on a phone.
    if (focus) {
      const first = qs('input[required], textarea[required]', b);
      if (first) first.focus({ preventScroll: true });
      else { b.tabIndex = -1; b.focus({ preventScroll: true }); }
    }
  }
  function go(to) {
    for (let i = at; i < to; i++) {
      if (!check(i)) { if (i !== at) show(i, false); return; }
    }
    show(to, true);
  }

  form.classList.add('is-steps');
  steps.forEach((s, i) => {
    if (i === 0) return;
    s.inert = true;
    s.setAttribute('aria-hidden', 'true');
    s.classList.add('is-off');
    gsap.set(s, { opacity: 0 });
  });
  chrome();
  next.addEventListener('click', () => go(at + 1));
  back.addEventListener('click', () => show(at - 1, true));
  tabs.forEach((t, i) => t.addEventListener('click', () => (i > at ? go(i) : show(i, true))));
  // Enter moves on rather than sending half a request.
  form.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.tagName === 'INPUT' && at < steps.length - 1) { e.preventDefault(); go(at + 1); }
  });

  // ---------- sending ----------
  const title = qs('[data-done="title"]', done), mark = qs('.bkf__mark', done), alt = qs('[data-done="alt"]', done);
  const copy = qs('.bkf__copy', done), copyLabel = qs('.bkf__copy-l', done), said = qs('[data-done="status"]', done);
  const sendLabel = qs('.bkf__send-l', form);
  let request = '', copied;
  const written = () => [
    'Name: ' + el.name.value.trim(),
    'Work email: ' + el.email.value.trim(),
    'Role: ' + el.role.value.trim(),
    'Phone: ' + el.phone.value.trim(),
    'Company: ' + el.company.value.trim(),
    'Sites: ' + sitesLabel(),
    'Weekly subcontract labour spend: ' + el.weekly_spend.value,
    'Where: ' + el.location.value.trim(),
    '',
    el.message.value.trim(),
  ].join('\n');

  // Completion: the request gives way to the confirmation. Beside the summary the card keeps its
  // size; stacked on a phone it closes up and the confirmation is brought into view.
  function finish(sent) {
    if (sent) {
      title.textContent = 'Request sent.';
      qs('[data-done="text"]', done).textContent = 'Thank you. We’ll be in touch to plan your pilot.';
      alt.hidden = true;
    }
    const rest = qsa('.bkf__top, .bkf__view, .bkf__nav', form);
    const swap = () => {
      form.style.setProperty('--done-h', form.offsetHeight + 'px'); // used only side by side (CSS)
      rest.forEach((x) => { x.hidden = true; });
      form.classList.add('is-done');
      done.hidden = false;
      title.focus({ preventScroll: true });
      toTop();
    };
    if (RM) { swap(); return; }
    gsap.to(rest, {
      opacity: 0, y: -12, duration: 0.25, ease: 'springIn',
      onComplete: () => {
        swap();
        // The mark lands, its ring rings once, then the words follow.
        gsap.timeline()
          .fromTo(mark, { opacity: 0, scale: 0.5 }, { opacity: 1, scale: 1, duration: 0.6, ease: 'spring' })
          .fromTo(qs('i', mark), { opacity: 0.8, scale: 1 }, { opacity: 0, scale: 1.9, duration: 0.9, ease: 'springSoft' }, 0.2)
          .fromTo(qsa(':scope > :not(.bkf__mark)', done), { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.6, ease: 'spring', stagger: 0.08 }, 0.12);
      },
    });
  }

  // With an endpoint set, the request posts in place and the page stays put.
  async function post() {
    send.setAttribute('aria-busy', 'true');
    sendLabel.textContent = 'Sending';
    try {
      const r = await fetch(form.action, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } });
      if (!r.ok) throw new Error(String(r.status));
      finish(true);
    } catch (_) {
      err.textContent = 'That didn’t send. Please try again, or email hello@payrollprotect.co.uk.';
      err.hidden = false;
    } finally {
      send.removeAttribute('aria-busy');
      sendLabel.textContent = 'Book my 90-day pilot';
    }
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (send.hasAttribute('aria-busy')) return; // already sending: a second press must not send twice
    for (let i = 0; i < steps.length - 1; i++) {
      if (!check(i, false)) {
        if (form.classList.contains('is-steps') && i !== at) show(i, true);
        else NEED[i].map((n) => el[n]).find((f) => !valid(f)).focus();
        return;
      }
    }
    err.hidden = true;
    request = written();
    if (!form.action.startsWith('mailto:')) { post(); return; }
    // Until an endpoint is set, the visitor's email app sends it.
    send.setAttribute('aria-busy', 'true');
    window.location.href = 'mailto:hello@payrollprotect.co.uk?subject=' + encodeURIComponent('Pilot booking from payrollprotect.co.uk') + '&body=' + encodeURIComponent(request);
    finish(false);
  });

  // If the email app did not open, the request copies in one press.
  copy.addEventListener('click', () => {
    const ok = () => {
      copy.classList.add('is-copied');
      copyLabel.textContent = 'Copied';
      said.textContent = 'Request copied';
      clearTimeout(copied);
      copied = setTimeout(() => { copy.classList.remove('is-copied'); copyLabel.textContent = 'Copy request'; said.textContent = ''; }, 2400);
    };
    const fallback = () => {
      const t = document.createElement('textarea');
      t.value = request;
      t.setAttribute('readonly', '');
      t.style.cssText = 'position:fixed;top:0;left:0;opacity:0;pointer-events:none';
      document.body.appendChild(t);
      t.select();
      try { if (document.execCommand('copy')) ok(); } catch (_) { /* nothing to copy with */ }
      t.remove();
      copy.focus();
    };
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(request).then(ok, fallback);
    else fallback();
  });
}

boot([initFx, initScroll, initBooking, initPilot, initFaq, initFoot, initNav, initReveals, initLive]);
