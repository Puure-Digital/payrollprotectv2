// Scroll films: a frame sequence played by scroll (the hero and the orbit film).
// Frames are fetched compressed and decoded off the main thread (createImageBitmap), a few either
// side of the playhead. A plain <img> drawn to a canvas is decoded on the main thread as it is drawn,
// 50–80 ms for a 1600 × 900 frame on a laptop, which stalled the scroll each time the film moved on.
const AHEAD = 10, BEHIND = 4, DECODES = 3;   // about 15 frames held, ~86 MB at 1600 × 900

export function frameSeq(src, onDecode) {
  const data = [], bmp = [], busy = new Set();
  let at = 0, dir = 1, ratio = 0;
  const keep = (k) => k >= at - (dir > 0 ? BEHIND : AHEAD) && k <= at + (dir > 0 ? AHEAD : BEHIND);

  // Frees frames that fell out of range, then decodes the nearest missing ones, ahead first.
  function pump() {
    bmp.forEach((b, k) => { if (b && !keep(k)) { b.close(); bmp[k] = null; } });
    for (let d = 0; d <= AHEAD && busy.size < DECODES; d++) {
      for (const k of [at + d * dir, at - d * dir]) {
        if (busy.size >= DECODES || !data[k] || bmp[k] || busy.has(k) || !keep(k)) continue;
        busy.add(k);
        createImageBitmap(data[k]).then((b) => {
          busy.delete(k);
          if (!keep(k)) b.close();
          else { bmp[k] = b; ratio = ratio || b.width / b.height; onDecode(k); }
          pump();
        }, () => busy.delete(k));
      }
    }
  }

  // The closest decoded frame, for while the playhead outruns loading or decoding.
  function near(i) {
    for (let d = 1; d <= AHEAD + BEHIND; d++) { const b = bmp[i - d * dir] || bmp[i + d * dir]; if (b) return b; }
    return null;
  }

  return {
    // Fetches frame i; resolves true once it has arrived.
    load: (i) => fetch(src(i)).then((r) => (r.ok ? r.blob() : null)).then((b) => { if (b) { data[i] = b; pump(); } return !!b; }, () => false),
    ratio: () => ratio,
    // Draws film position f (in frames), blending the two frames either side of it, so the picture
    // moves continuously however slowly the page scrolls. False while nothing near f is decoded.
    draw(ctx, f, x, y, w, h) {
      const i = Math.floor(f), t = f - i;
      if (i !== at) { dir = i > at ? 1 : -1; at = i; pump(); } else if (!bmp[i]) pump();
      const a = bmp[i] || near(i);
      if (!a) return false;
      ctx.drawImage(a, x, y, w, h);
      const b = a === bmp[i] && t > 0 && bmp[i + 1];
      if (b) { ctx.globalAlpha = t; ctx.drawImage(b, x, y, w, h); ctx.globalAlpha = 1; }
      return true;
    },
    // Frees every decoded frame once the film is scrolled past; they decode again on the way back.
    release() { bmp.forEach((b, k) => { if (b) { b.close(); bmp[k] = null; } }); },
  };
}
