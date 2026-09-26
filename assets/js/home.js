// Homepage: featured carousel + random "Recent trips".
(() => {
  /* ---------- Recent trips: show 3 random galleries tagged recent: true ---------- */
  const recent = document.querySelector("[data-shuffle]");
  if (recent) {
    const items = [...recent.children];
    for (let i = items.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [items[i], items[j]] = [items[j], items[i]];
    }
    items.forEach((li) => recent.appendChild(li)); // CSS shows the first 3
  }

  /* ---------- Featured carousel ---------- */
  // One continuous wall of ROWS rows with straight top and bottom edges.
  // Each folder (group) fills a stretch of every row; where one group hands
  // over to the next, each row switches at a slightly different point, so the
  // seam steps like the layers of a lasagna.
  const root = document.querySelector("[data-carousel]");
  if (!root) return;
  const track = root.querySelector(".carousel-track");
  const baseSet = track.querySelector(".carousel-set");
  const toggle = document.querySelector(".carousel-toggle");
  const speed = parseFloat(root.dataset.speed) || 40; // pixels per second
  const ROWS = parseInt(root.dataset.rows, 10) || 3;
  const STAGGER = 0.35; // how far seams may shift, as a fraction of row height
  const GAP = 6;        // space between photos
  const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const originals = [...baseSet.querySelectorAll(".cgroup")].filter((g) => g.querySelector("img"));
  if (!originals.length) return;
  const allImgs = originals.flatMap((g) => [...g.querySelectorAll("img")]);

  const wallHeight = () =>
    Math.round(Math.min(600, Math.max(300, window.innerHeight * 0.62), window.innerWidth * 1.1));
  const ratio = (img) => (img.naturalWidth && img.naturalHeight ? img.naturalWidth / img.naturalHeight : 1.5);
  const whenLoaded = (img) =>
    img.complete && img.naturalWidth
      ? Promise.resolve()
      : new Promise((r) => {
          img.addEventListener("load", r, { once: true });
          img.addEventListener("error", r, { once: true });
        });
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  // Split a group's photos (in order) into ROWS runs of roughly equal width.
  function split(weights, count) {
    const total = weights.reduce((s, w) => s + w, 0);
    const runs = [];
    let run = [], sum = 0;
    weights.forEach((w, i) => {
      const left = weights.length - i;
      const runsStillNeeded = count - runs.length - 1;
      const target = ((runs.length + 1) * total) / count;
      if (run.length && runsStillNeeded > 0 &&
          (left <= runsStillNeeded || Math.abs(sum + w - target) > Math.abs(sum - target))) {
        runs.push(run);
        run = [];
      }
      run.push(i);
      sum += w;
    });
    runs.push(run);
    return runs;
  }

  // For each original group: which photo goes in which row, and its natural widths.
  function measure(h) {
    return originals.map((g) => {
      let links = [...g.querySelectorAll("a")];
      let ratios = links.map((a) => ratio(a.querySelector("img")));
      // A group needs at least one photo per row; reuse photos if it's short.
      const idx = ratios.map((_, i) => i);
      while (idx.length < ROWS) idx.push(idx[idx.length % ratios.length]);
      const rows = split(idx.map((i) => ratios[i]), ROWS).map((run) => run.map((k) => idx[k]));
      const natural = rows.map((row) => row.reduce((s, i) => s + ratios[i] * h, 0) + GAP * (row.length - 1));
      const width = natural.reduce((s, n) => s + n, 0) / ROWS;
      return { ratios, rows, natural, width };
    });
  }

  // Position every photo in a set. `seq` lists the group elements in order,
  // `info` their measurements. Returns the set width.
  function layout(seq, info, H) {
    const h = (H - GAP * (ROWS - 1)) / ROWS;
    const maxShift = h * STAGGER;
    // Consensus end of each group, and each row's own end, nudged within ±maxShift.
    let consensus = 0;
    const natural = new Array(ROWS).fill(0);
    const ends = info.map((m, g) => {
      consensus += (g ? GAP : 0) + m.width;
      return m.natural.map((n, r) => {
        natural[r] += (g ? GAP : 0) + n;
        const nudge = [-0.5, 0.5, 0][(g + r) % 3] * maxShift;
        return consensus + clamp(natural[r] - consensus + nudge, -maxShift, maxShift);
      });
    });
    const setWidth = consensus + GAP;
    const last = ends[ends.length - 1];
    seq.forEach((groupEl, g) => {
      const m = info[g];
      const links = [...groupEl.querySelectorAll("a")];
      const used = new Set();
      m.rows.forEach((row, r) => {
        const start = g ? ends[g - 1][r] + GAP : last[r] - setWidth + GAP;
        const end = ends[g][r];
        const room = end - start - GAP * (row.length - 1);
        const sum = row.reduce((s, i) => s + m.ratios[i], 0);
        let x = start;
        const y = r * (h + GAP);
        row.forEach((i, k) => {
          const w = k === row.length - 1 ? end - x : Math.round((m.ratios[i] / sum) * room);
          // A photo reused to fill a short group gets a duplicate link.
          let a = links[i];
          if (used.has(i)) {
            a = links[i].cloneNode(true);
            a.classList.add("is-extra");
            a.addEventListener("click", (e) => { e.preventDefault(); links[i].click(); });
            groupEl.querySelector(".cgroup-box").appendChild(a);
          }
          used.add(i);
          Object.assign(a.style, { left: x + "px", top: y + "px", width: w + "px", height: Math.round(h) + "px" });
          x += w + GAP;
        });
      });
    });
    // Line up so the latest-starting row begins at the left edge.
    const firstStarts = last.map((e) => e - setWidth + GAP);
    return { setWidth, lead: Math.max(...firstStarts) };
  }

  // Copies of groups for the seamless loop; clicks go to the original photo.
  function copyOf(group) {
    const c = group.cloneNode(true);
    c.classList.add("is-copy");
    c.setAttribute("aria-hidden", "true");
    const src = group.querySelectorAll("a");
    c.querySelectorAll("a").forEach((a, i) => {
      a.tabIndex = -1;
      a.addEventListener("click", (e) => {
        e.preventDefault();
        src[i].click();
      });
    });
    return c;
  }

  let lastWidth = 0;

  function build() {
    lastWidth = window.innerWidth;
    const H = wallHeight();
    const h = (H - GAP * (ROWS - 1)) / ROWS;
    root.style.setProperty("--wall", H + "px");

    // Reset copies from any earlier build
    track.querySelectorAll(".is-copy, .is-extra, .carousel-set.copy").forEach((n) => n.remove());

    const base = measure(h);
    const seq = [...originals];
    const info = [...base];
    if (!still) {
      // Repeat groups until one set is comfortably wider than the screen.
      const setWidth = () => info.reduce((s, m) => s + m.width + GAP, 0);
      // Whole cycles only, so the same group never meets itself at the loop point.
      while (setWidth() < window.innerWidth + h * 2) {
        originals.forEach((g, i) => {
          const c = copyOf(g);
          baseSet.appendChild(c);
          seq.push(c);
          info.push(base[i]);
        });
      }
    }

    const { setWidth, lead } = layout(seq, info, H);
    baseSet.style.width = setWidth + "px";
    track.style.marginLeft = -Math.round(lead) + "px";

    if (!still) {
      const second = document.createElement("div");
      second.className = "carousel-set copy";
      second.setAttribute("aria-hidden", "true");
      second.style.width = setWidth + "px";
      seq.forEach((g, i) => {
        const c = copyOf(originals[i % originals.length]);
        second.appendChild(c);
      });
      track.appendChild(second);
      layout([...second.children], info, H);
      track.style.setProperty("--duration", Math.round(setWidth / speed) + "s");
    }
    root.classList.add("is-ready");
  }

  // Wait for the photos (their shapes decide the layout), but don't wait forever.
  let built = false;
  const ready = () => allImgs.every((img) => img.complete);
  const all = Promise.all(allImgs.map(whenLoaded));
  Promise.race([all, new Promise((r) => setTimeout(r, 5000))]).then(() => {
    const complete = ready();
    build();
    built = true;
    if (!complete) all.then(build); // re-flow once the slow photos arrive
  });

  let t;
  window.addEventListener("resize", () => {
    clearTimeout(t);
    // Only rebuild when the width changes (phones change height while scrolling).
    t = setTimeout(() => { if (built && window.innerWidth !== lastWidth) build(); }, 250);
  });

  if (toggle && !still) {
    toggle.hidden = false;
    toggle.addEventListener("click", () => {
      const paused = root.classList.toggle("is-paused");
      toggle.textContent = paused ? "Play" : "Pause";
      toggle.setAttribute("aria-pressed", String(paused));
    });
  }
})();
