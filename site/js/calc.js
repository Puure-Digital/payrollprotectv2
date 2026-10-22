// Exposure calculator: log-scale slider, presets, rolling figures.
// The chosen spend is shared (spendNow, and a pp:spend event) so the pilot chart can follow it.
import { qs, qsa, gbp } from './util.js';
import { setOd } from './odometer.js';

export const MIN = 10000, MAX = 5000000;
export const RATE = 0.017;
// The pilot: 90 days, live on site from day 14. Held for query by day 90 at a weekly spend.
export const DAYS = 90, LIVE = 14;
export const heldBy90 = (spend) => (spend * RATE * (DAYS - LIVE)) / 7;
export let spendNow = 250000;
export const toSpend = (v) => MIN * Math.pow(MAX / MIN, v / 1000);
export const toV = (s) => Math.round((1000 * Math.log(s / MIN)) / Math.log(MAX / MIN));
export const nice = (s) => (s < 100000 ? Math.round(s / 1000) * 1000 : s < 1000000 ? Math.round(s / 5000) * 5000 : Math.round(s / 50000) * 50000);

export function initCalc() {
  const range = qs('#c-range');
  if (!range) return;
  const weekly = qs('#c-weekly'), month = qs('#c-month'), year = qs('#c-year'), day = qs('#c-day');
  const group = qs('.calc__presets');
  const presets = qsa('.calc__presets button');
  let last = -1, first = true, dragging = false;

  function update(spend) {
    range.style.setProperty('--p', (Number(range.value) / 10).toFixed(1) + '%');
    if (spend === last) return;
    last = spend;
    spendNow = spend;
    const annual = spend * 52 * RATE;
    // While the thumb is held the figures keep up with it; a preset or a key press rolls them.
    const o = { instant: first, dur: dragging ? 0.1 : 0.35, step: dragging ? 0 : 0.02 };
    first = false;
    setOd(weekly, spend, o);
    setOd(month, Math.round(annual / 12), o);
    setOd(year, Math.round(annual), o);
    day.textContent = 'That is ' + gbp(annual / 260) + ' every working day.';
    range.setAttribute('aria-valuetext', gbp(spend) + ' a week');
    presets.forEach((b) => b.setAttribute('aria-pressed', String(Number(b.dataset.v) === spend)));
    // The pill slides to the chosen value; between values it fades where it is.
    const i = presets.findIndex((b) => Number(b.dataset.v) === spend);
    if (i >= 0) group.style.setProperty('--i', i);
    group.classList.toggle('is-free', i < 0);
    document.dispatchEvent(new CustomEvent('pp:spend', { detail: spend }));
    // The pilot call carries the chosen spend to the booking page.
    const cta = document.querySelector('.numbers__cta a');
    if (cta) cta.href = 'book.html?spend=' + spend;
  }

  range.addEventListener('input', () => update(nice(toSpend(Number(range.value)))));
  range.addEventListener('pointerdown', () => { dragging = true; });
  ['pointerup', 'pointercancel'].forEach((t) => window.addEventListener(t, () => { dragging = false; }));
  presets.forEach((b) => b.addEventListener('click', () => {
    const s = Number(b.dataset.v);
    range.value = toV(s);
    update(s);
  }));
  update(nice(toSpend(Number(range.value))));

  // Arriving from "Change the spend": the jump lands by focusing the calculator (js/scroll.js),
  // and its viewfinder locks on. The link arms it, because once focusable the calculator also
  // takes focus from any click inside it.
  const calc = qs('#calc'), ui = qs('.calc__ui');
  const cue = () => {
    ui.classList.remove('is-cue');
    void ui.offsetWidth;
    ui.classList.add('is-cue');
  };
  if (calc && ui) qsa('a[href="#calc"]').forEach((a) => a.addEventListener('click', () => calc.addEventListener('focus', cue, { once: true })));
  if (ui) ui.addEventListener('animationend', () => ui.classList.remove('is-cue'));
}
