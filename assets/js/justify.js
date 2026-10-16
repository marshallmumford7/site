// Justified photo rows for trip pages: photos keep their natural shape and
// fill each row edge to edge. Photos marked featured get a full-width row.
(() => {
  const grid = document.querySelector("[data-justify]");
  if (!grid) return;
  const items = [...grid.children];
  if (!items.length) return;
  const GAP = 6;

  const ratio = (li) => {
    const img = li.querySelector("img");
    return img.naturalWidth && img.naturalHeight ? img.naturalWidth / img.naturalHeight : 1.5;
  };

  function layout() {
    const W = grid.clientWidth;
    if (!W) return;
    const H = W < 640 ? 170 : W < 1000 ? 250 : 320; // target row height
    let row = [];

    const size = (li, w, h) => { li.style.width = w + "px"; li.style.height = Math.round(h) + "px"; };

    function flush(isLast, stretch = 1.25) {
      if (!row.length) return;
      const sum = row.reduce((s, li) => s + ratio(li), 0);
      const avail = W - GAP * (row.length - 1);
      let h = avail / sum;
      // A short final row keeps the normal height instead of blowing up.
      const short = isLast && h > H * stretch;
      if (short) h = H;
      let used = 0;
      row.forEach((li, i) => {
        const lastInRow = i === row.length - 1;
        const w = lastInRow && !short ? avail - used : Math.floor(ratio(li) * h);
        size(li, w, h);
        used += w;
      });
      row = [];
    }

    items.forEach((li, i) => {
      if (li.classList.contains("is-featured")) {
        flush(true, 1.6); // a row cut short by a featured photo may stretch a bit more
        const h = Math.min(W / ratio(li), window.innerHeight * 0.85);
        size(li, W, h);
        return;
      }
      row.push(li);
      const sum = row.reduce((s, x) => s + ratio(x), 0);
      if (sum * H + GAP * (row.length - 1) >= W) flush(false);
      if (i === items.length - 1) flush(true);
    });
    grid.classList.add("is-laid");
  }

  // Lay out as photos arrive; reveal once the first few are in (or after 2.5 s).
  const imgs = items.map((li) => li.querySelector("img"));
  let queued = false;
  const relayout = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; layout(); });
  };
  let loaded = 0;
  const firstBatch = Math.min(6, imgs.length);
  const reveal = () => grid.classList.add("is-ready");
  imgs.forEach((img) => {
    const done = () => { loaded++; relayout(); if (loaded >= firstBatch) reveal(); };
    if (img.complete && img.naturalWidth) done();
    else { img.addEventListener("load", done, { once: true }); img.addEventListener("error", done, { once: true }); }
  });
  setTimeout(() => { layout(); reveal(); }, 2500);
  layout();

  let lastW = grid.clientWidth;
  window.addEventListener("resize", () => {
    if (grid.clientWidth !== lastW) { lastW = grid.clientWidth; relayout(); }
  });
})();
