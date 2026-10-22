// Shared helpers.
// ?motion=reduce forces the reduced-motion path for QA.
export const RM = window.matchMedia('(prefers-reduced-motion: reduce)').matches || /[?&]motion=reduce\b/.test(window.location.search);
export const FINE = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
export const DESKTOP = '(min-width: 1024px)';
export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const qs = (s, el = document) => el.querySelector(s);
export const qsa = (s, el = document) => Array.from(el.querySelectorAll(s));
export const gbp = (n) => '£' + Math.round(n).toLocaleString('en-GB');
