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
  const root = document.querySelector("[data-carousel]");
  if (!root) return;
  const track = root.querySelector(".carousel-track");
  const baseSet = track.querySelector(".carousel-set");
  const toggle = document.querySelector(".carousel-toggle");
  const speed = parseFloat(root.dataset.speed) || 40; // pixels per second
  const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const GAP = 6; // space between photos inside a group

  // "01-yellow-birds" -> "Yellow birds"
  baseSet.querySelectorAll(".cgroup").forEach((g) => {
    const cap = g.querySelector(".cgroup-label");
    const t = (g.dataset.label || "").replace(/^\d+[-_ ]*/, "").replace(/[-_]+/g, " ").trim();
    if (t) cap.textContent = t.charAt(0).toUpperCase() + t.slice(1);
    else cap.remove();
  });

  const originals = [...baseSet.querySelectorAll(".cgroup")].filter((g) => g.querySelector("img"));
  if (!originals.length) return;

  const blockSize = () =>
    Math.round(Math.min(600, Math.max(280, window.innerHeight * 0.62), window.innerWidth * 0.86));

  const ratio = (img) => (img.naturalWidth && img.naturalHeight ? img.naturalWidth / img.naturalHeight : 1.5);
  const whenLoaded = (img) =>
    img.complete && img.naturalWidth
      ? Promise.resolve()
      : new Promise((r) => {
          img.addEventListener("load", r, { once: true });
          img.addEventListener("error", r, { once: true });
        });

  // Split items (in order) into `count` runs whose summed weights are as even as possible.
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

  // Pack photos into an S x S square, as rows or as columns, whichever needs the least cropping.
  function plan(ratios, S) {
    let best = null;
    for (const mode of ["rows", "cols"]) {
      // For columns, work with height/width and swap axes at the end.
      const w = mode === "rows" ? ratios : ratios.map((r) => 1 / r);
      for (let n = 1; n <= w.length; n++) {
        const runs = split(w, n);
        const lengths = runs.map((run) => (S - GAP * (run.length - 1)) / run.reduce((s, i) => s + w[i], 0));
        const extent = lengths.reduce((s, l) => s + l, 0) + GAP * (runs.length - 1);
        const crop = Math.abs(Math.log(extent / S));
        if (!best || crop < best.crop) best = { mode, w, runs, lengths, crop };
      }
    }
    const { mode, w, runs, lengths } = best;
    const room = S - GAP * (runs.length - 1);
    const total = lengths.reduce((s, l) => s + l, 0);
    const boxes = [];
    let a = 0; // position along the stacking axis
    runs.forEach((run, ri) => {
      const thick = ri === runs.length - 1 ? S - a : Math.round((lengths[ri] * room) / total);
      const sum = run.reduce((s, i) => s + w[i], 0);
      const along = S - GAP * (run.length - 1);
      let b = 0;
      run.forEach((i, k) => {
        const len = k === run.length - 1 ? S - b : Math.round((w[i] / sum) * along);
        boxes[i] = mode === "rows"
          ? { left: b, top: a, width: len, height: thick }
          : { left: a, top: b, width: thick, height: len };
        b += len + GAP;
      });
      a += thick + GAP;
    });
    return boxes;
  }

  function place(group, boxes, S) {
    const box = group.querySelector(".cgroup-box");
    box.style.width = box.style.height = S + "px";
    [...box.children].forEach((a, i) => {
      const p = boxes[i];
      if (!p) return;
      a.style.left = p.left + "px";
      a.style.top = p.top + "px";
      a.style.width = p.width + "px";
      a.style.height = p.height + "px";
    });
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

  let copies = new Map(); // original group -> its copies
  let buildId = 0;
  let lastWidth = 0;

  function build() {
    const S = blockSize();
    const id = ++buildId;
    lastWidth = window.innerWidth;
    root.style.setProperty("--block", S + "px");

    // Clear old copies
    track.querySelectorAll(".is-copy, .carousel-set.copy").forEach((n) => n.remove());
    copies = new Map(originals.map((g) => [g, []]));

    if (!still) {
      // Repeat the groups until one set is wider than the screen, then duplicate the set.
      const groupGap = parseFloat(getComputedStyle(baseSet).columnGap) || 24;
      const setWidth = originals.length * (S + groupGap);
      const repeats = Math.max(0, Math.ceil(window.innerWidth / setWidth) - 1);
      for (let r = 0; r < repeats; r++) {
        originals.forEach((g) => {
          const c = copyOf(g);
          copies.get(g).push(c);
          baseSet.appendChild(c);
        });
      }
      const second = document.createElement("div");
      second.className = "carousel-set copy";
      second.setAttribute("aria-hidden", "true");
      [...baseSet.children].forEach((g, idx) => {
        const orig = originals[idx % originals.length];
        const c = copyOf(orig);
        copies.get(orig).push(c);
        second.appendChild(c);
      });
      track.appendChild(second);
    }

    originals.forEach((g) => {
      const imgs = [...g.querySelectorAll("img")];
      Promise.all(imgs.map(whenLoaded)).then(() => {
        if (id !== buildId) return; // a newer resize took over
        const boxes = plan(imgs.map(ratio), S);
        [g, ...copies.get(g)].forEach((el) => {
          place(el, boxes, S);
          el.classList.add("is-laid");
        });
      });
      // Give copies the right size straight away so the strip width is correct.
      [g, ...copies.get(g)].forEach((el) => {
        const box = el.querySelector(".cgroup-box");
        box.style.width = box.style.height = S + "px";
      });
    });

    if (!still) {
      const width = baseSet.getBoundingClientRect().width;
      track.style.setProperty("--duration", Math.round(width / speed) + "s");
    }
    root.classList.add("is-ready");
  }

  build();
  let t;
  window.addEventListener("resize", () => {
    clearTimeout(t);
    // Only rebuild when the width changes (phones change height while scrolling).
    t = setTimeout(() => { if (window.innerWidth !== lastWidth) build(); }, 250);
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
