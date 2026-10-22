// One spring for everything that moves: stiffness 180, damping 22, mass 1.
// ζ ≈ 0.82, peak overshoot ≈ 1%, settles (±0.1%) in about 0.65 s. These are the
// same curves as --spring and --spring-soft in base.css, so CSS and GSAP agree.
// - spring:     the main curve, for anything that travels (transforms).
// - springSoft: its critically damped twin (no overshoot), for opacity, digits,
//               pointer follow and anything that must not pass its target.
// - springIn:   springSoft mirrored, for exits that accelerate away.
// - harmonic:   undamped oscillation (sine in-out), for ambient loops only.
const K = 180, C = 22;
const W0 = Math.sqrt(K);
const Z = C / (2 * W0);
const WD = W0 * Math.sqrt(1 - Z * Z);
const T_MAIN = 0.645, T_SOFT = 0.69;

const main = (t) => 1 - Math.exp(-Z * W0 * t) * (Math.cos(WD * t) + ((Z * W0) / WD) * Math.sin(WD * t));
const soft = (t) => 1 - Math.exp(-W0 * t) * (1 + W0 * t);
const M_END = main(T_MAIN), S_END = soft(T_SOFT);

export const spring = (p) => (p <= 0 ? 0 : p >= 1 ? 1 : main(p * T_MAIN) / M_END);
export const springSoft = (p) => (p <= 0 ? 0 : p >= 1 ? 1 : soft(p * T_SOFT) / S_END);
export const springIn = (p) => 1 - springSoft(1 - p);
export const harmonic = (p) => (1 - Math.cos(Math.PI * p)) / 2;

// Time at which springSoft reaches a given fraction (for syncing events to a sweep).
export function springSoftAt(f) {
  let lo = 0, hi = 1;
  for (let i = 0; i < 24; i++) { const mid = (lo + hi) / 2; if (springSoft(mid) < f) lo = mid; else hi = mid; }
  return (lo + hi) / 2;
}

export function registerEases() {
  gsap.registerEase('spring', spring);
  gsap.registerEase('springSoft', springSoft);
  gsap.registerEase('springIn', springIn);
  gsap.registerEase('harmonic', harmonic);
  gsap.defaults({ ease: 'spring' });
}

// Shared timings (seconds).
export const STEP = 0.08;   // stagger between related items
