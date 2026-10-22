/**
 * Gates: three swing gates at a site's entry, each hung on a post that carries
 * its terminal, and nobody has come through. The gate under the pointer swings
 * in and its neighbours follow less far, staggered outwards from it; its
 * terminal takes the bright edge, but its screen stays blank and the count
 * stays at nought. At rest the gates stand ajar by different amounts and the
 * middle terminal is bright. The slider is how far the chosen gate swings, in
 * degrees.
 *
 * The pattern: discrete items, as in Riffle. Tweens, a stagger by distance,
 * and a pick by the rest pose's screen x, so a gate swinging away cannot flip
 * the choice. Paint order is post, the gate hung on it, then its terminal:
 * a leaf only meets its own post at the hinge, where the leaf is nearer.
 */
const {
  Cam, clamp, facing, fillet, fit, poly, prism, proj, put, rad, rings, rrect, seg,
  tdone, tset, tval, tween, disposer, mk, pointer, register, solid,
} = HL;

const N = 3, PITCH = 40, PW = 6, PH = 46;              // gates, post spacing, post width and height
const L = 32, Z0 = 3, Z1 = 40, T = 0.8;               // a leaf: length, foot, top, half its thickness
const TW = 8, TD = 3, TZ0 = 23, TZ1 = 34;             // a terminal on the front of its post
const PX0 = -12, PX1 = N * PITCH + 12, PY0 = -40, PY1 = 16, PB = 4; // the pad
const REST = [8, 26, 12], NEAR = [1, 0.42, 0.18], STEP = 45, MARK = 1;
const MAX = 88;

const hinge = (i) => i * PITCH + PW / 2 + 1;
const SHAPE = fillet([[0, Z0], [L, Z0], [L, Z1], [0, Z1]], [1.4, 1.4, 1.4, 1.4]);

/** Leaf i swung in by th degrees: u runs along it from the hinge, w is height, +off is the side facing the viewer. */
function leaf(P, i, th) {
  const hx = hinge(i), c = Math.cos(rad(th)), s = Math.sin(rad(th));
  const at = (u, w, off) => P(hx + u * c + off * s, -u * s + off * c, w);
  return {
    back: poly(SHAPE.map(([u, w]) => at(u, w, -T))),
    face: poly(SHAPE.map(([u, w]) => at(u, w, T))),
    bars: [0.2, 0.4, 0.6, 0.8].map((f) => seg(at(L * f, Z0 + 4, T), at(L * f, Z1 - 4, T))).join(""),
  };
}

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let swing = clamp(value, 0, MAX);

  // Fitted to the pad, the posts and every gate swung right in, so no pose leaves the frame.
  const C = Cam(45, 0.5, 1.9);
  const wide = [0, 1, 2].map((i) => [hinge(i) + L * Math.cos(rad(MAX)), -L * Math.sin(rad(MAX)), Z1]);
  fit(C, [[PX0, PY0, -PB], [PX1, PY0, -PB], [PX0, PY1, -PB], [PX1, PY1, -PB], [0, 0, PH], [N * PITCH, 0, PH], ...wide], 200, 166);
  const P = proj(C), front = facing(C);

  const g = mk("g", {}, svg);
  put(solid(g), prism(P, front, ...rings(PX0, PY0, PX1, PY1, 8, 2), -PB, 0));

  const gates = [], terms = [];
  for (let k = 0; k <= N; k++) {
    const x = k * PITCH;
    put(solid(g), prism(P, front, ...rings(x - PW / 2, -PW / 2, x + PW / 2, PW / 2, 1.8, 0.8), 0, PH));
    if (k === N) break;
    const grp = mk("g", {}, g);
    const back = mk("path", { class: "lo" }, grp), face = mk("path", { class: "sil" }, grp), bars = mk("path", { class: "nf lo" }, grp);
    gates.push({ back, face, bars, a: tween(REST[k]), drawn: NaN });
    // the terminal, with its screen blank: nothing has been read
    const t = solid(g), yf = PW / 2 + TD;
    put(t, prism(P, front, ...rings(x - TW / 2, PW / 2, x + TW / 2, yf, 1.2, 0.6), TZ0, TZ1));
    const screen = rrect(x - TW / 2 + 1.5, TZ0 + 3, x + TW / 2 - 1.5, TZ1 - 1.6, 1, 4).map((q) => P(q.u, yf, q.v));
    mk("path", { d: poly(screen), class: "nf lo" }, t.g);
    terms.push(t);
  }

  // The pick: the gate whose REST centre is nearest the pointer's screen x, inside a band around it.
  const mid = REST.map((th, i) => P(hinge(i) + (L / 2) * Math.cos(rad(th)), -(L / 2) * Math.sin(rad(th)), (Z0 + Z1) / 2));
  const half = (mid[1][0] - mid[0][0]) / 2;
  function hit([x, y]) {
    let best = -1, d = Infinity;
    mid.forEach((m, i) => { const dx = Math.abs(x - m[0]); if (dx < d) { d = dx; best = i; } });
    return d <= half && Math.abs(y - mid[best][1]) < 70 ? best : -1;
  }

  const B = register(stage, (_dt, now) => {
    let moving = false;
    gates.forEach((gt, i) => {
      const th = tval(gt.a, now);
      if (th !== gt.drawn) {
        gt.drawn = th;
        const q = leaf(P, i, th);
        gt.back.setAttribute("d", q.back); gt.face.setAttribute("d", q.face); gt.bars.setAttribute("d", q.bars);
      }
      if (!tdone(gt.a, now)) moving = true;
    });
    return moving;
  });
  bag.add(B.unregister);

  let act = -1;
  /** Swings gate a in (-1 lets them all fall back to rest). The stagger spreads out from the gate chosen, or the one let go. */
  function setActive(a, force) {
    if (a === act && !force) return;
    const now = performance.now(), from = a >= 0 ? a : act;
    act = a;
    gates.forEach((gt, i) => {
      const th = a < 0 ? REST[i] : Math.max(REST[i], swing * NEAR[Math.abs(i - a)]);
      tset(gt.a, th, now, from < 0 ? 0 : Math.abs(i - from) * STEP);
    });
    terms.forEach((t, i) => t.sil.classList.toggle("hi", i === (a < 0 ? MARK : a)));
    read.textContent = a < 0 ? "rest" : `gate ${a + 1} · 0`;
    B.wake();
  }
  setActive(-1, true);

  bag.add(pointer(stage, { move: (p) => setActive(hit(p)), leave: () => setActive(-1) }));
  bag.add(() => svg.replaceChildren());

  return {
    set: (v) => { swing = clamp(v, 0, MAX); if (act >= 0) setActive(act, true); },
    destroy: bag.dispose,
  };
}

hairline({
  name: "gates",
  means: "Three gates at site entry, open and unused: the one under the pointer swings in, its neighbours less, and its count stays at nought.",
  rules: [1, 2, 4, 5],
  range: [40, 64, 88],
  tour: [[133, 131], [242, 184], null],
  mount,
});
