// Homepage: random "Recent trips" + featured carousel.
(() => {
  /* ---------- Recent trips: show 3 random galleries ---------- */
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
  // One continuous wall of ROWS rows. Each folder (group) fills a stretch of
  // every row; where groups meet, each row switches at a slightly different
  // point, like the layers of a lasagna.
  // Each visit starts at a random group and keeps the folder order from there.
  // Photos load a few at a time, in that order; the wall appears once the
  // first screenful is ready and grows as more groups arrive.
  const root = document.querySelector("[data-carousel]");
  if (!root) return;
  const track = root.querySelector(".carousel-track");
  const baseSet = track.querySelector(".carousel-set");
  const toggle = document.querySelector(".carousel-toggle");
  const speed = parseFloat(root.dataset.speed) || 40; // pixels per second
  const ROWS = parseInt(root.dataset.rows, 10) || 3;
  const STAGGER = 0.35;     // how far seams may shift, as a fraction of row height
  const GAP = 6;            // space between photos
  const PARALLEL = 4;       // photos downloading at once
  const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  let groups = [...baseSet.querySelectorAll(".cgroup")].filter((g) => g.querySelector("img"));
  if (!groups.length) return;

  // Random starting group, same order after it (wrapping around).
  const start = Math.floor(Math.random() * groups.length);
  groups = groups.slice(start).concat(groups.slice(0, start));
  groups.forEach((g) => { g.hidden = true; baseSet.appendChild(g); });

  const wallHeight = () =>
    Math.round(Math.min(600, Math.max(300, window.innerHeight * 0.62), window.innerWidth * 1.1));
  const rowHeight = (H) => (H - GAP * (ROWS - 1)) / ROWS;
  const ratio = (img) => (img.naturalWidth && img.naturalHeight ? img.naturalWidth / img.naturalHeight : 1.5);
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  root.style.setProperty("--wall", wallHeight() + "px"); // reserve the space straight away

  /* --- Loading, a few photos at a time, group by group --- */
  const imgsOf = groups.map((g) => [...g.querySelectorAll("img")]);
  const queue = imgsOf.flat();
  let active = 0, nextImg = 0;
  const settled = new Set();
  function pump() {
    while (active < PARALLEL && nextImg < queue.length) {
      const img = queue[nextImg++];
      active++;
      const done = () => {
        active--;
        settled.add(img);
        img.closest("a").classList.add("is-loaded");
        pump();
        onProgress();
      };
      img.addEventListener("load", done, { once: true });
      img.addEventListener("error", done, { once: true });
      img.src = img.dataset.src;
    }
  }
  // How many groups, counted from the start, are fully loaded.
  function readyCount() {
    let n = 0;
    while (n < groups.length && imgsOf[n].every((img) => settled.has(img))) n++;
    return n;
  }

  /* --- Layout --- */
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

  function measure(list, h) {
    return list.map((g) => {
      const ratios = [...g.querySelectorAll("a")].map((a) => ratio(a.querySelector("img")));
      const idx = ratios.map((_, i) => i);
      while (idx.length < ROWS) idx.push(idx[idx.length % ratios.length]);
      const rows = split(idx.map((i) => ratios[i]), ROWS).map((run) => run.map((k) => idx[k]));
      const natural = rows.map((row) => row.reduce((s, i) => s + ratios[i] * h, 0) + GAP * (row.length - 1));
      const width = natural.reduce((s, n) => s + n, 0) / ROWS;
      return { ratios, rows, natural, width };
    });
  }

  function layout(seq, info, H) {
    const h = rowHeight(H);
    const maxShift = h * STAGGER;
    // Where each row of the first group starts. This depends only on the row,
    // so the start of the wall never moves when more groups are added; the
    // last group in the loop is fitted to meet it.
    const firstStart = Array.from({ length: ROWS }, (_, r) => [0.5, -0.5, 0][r % 3] * maxShift);
    let consensus = 0;
    const natural = new Array(ROWS).fill(0);
    const ends = info.map((m, g) => {
      consensus += (g ? GAP : 0) + m.width;
      const isLast = g === info.length - 1;
      return m.natural.map((n, r) => {
        natural[r] += (g ? GAP : 0) + n;
        if (isLast) return consensus + firstStart[r];
        const nudge = [-0.5, 0.5, 0][(g + r) % 3] * maxShift;
        return consensus + clamp(natural[r] - consensus + nudge, -maxShift, maxShift);
      });
    });
    const setWidth = consensus + GAP;
    seq.forEach((groupEl, g) => {
      const m = info[g];
      const links = [...groupEl.querySelectorAll("a:not(.is-extra)")];
      const used = new Set();
      m.rows.forEach((row, r) => {
        const start = g ? ends[g - 1][r] + GAP : firstStart[r];
        const end = ends[g][r];
        const room = end - start - GAP * (row.length - 1);
        const sum = row.reduce((s, i) => s + m.ratios[i], 0);
        let x = start;
        const y = r * (h + GAP);
        row.forEach((i, k) => {
          const w = k === row.length - 1 ? end - x : Math.round((m.ratios[i] / sum) * room);
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
    return { setWidth, lead: Math.max(...firstStart) };
  }

  function copyOf(group) {
    const c = group.cloneNode(true);
    c.hidden = false;
    c.classList.add("is-copy");
    c.setAttribute("aria-hidden", "true");
    c.querySelectorAll(".is-extra").forEach((n) => n.remove());
    const src = group.querySelectorAll("a:not(.is-extra)");
    c.querySelectorAll("a").forEach((a, i) => {
      a.tabIndex = -1;
      a.addEventListener("click", (e) => { e.preventDefault(); src[i].click(); });
    });
    return c;
  }

  /* --- Building and moving the wall --- */
  let shown = 0;          // groups currently in the wall
  let setWidth = 0;       // width of one full loop
  let firstCycle = 0;     // where the first pass through the shown groups ends
  let safeEdge = 0;       // the screen's right edge must stay left of this to grow
  let lead = 0;
  let offset = 0;         // how far the wall has scrolled, in pixels
  let lastWidth = window.innerWidth;

  function build(n) {
    const H = wallHeight();
    const h = rowHeight(H);
    root.style.setProperty("--wall", H + "px");
    track.querySelectorAll(".is-copy, .is-extra, .carousel-set.copy").forEach((el) => el.remove());
    groups.forEach((g, i) => { g.hidden = i >= n; });

    const list = groups.slice(0, n);
    const base = measure(list, h);
    const seq = [...list];
    const info = [...base];
    firstCycle = base.reduce((s, m) => s + m.width + GAP, 0);
    let repeated = false;
    if (!still) {
      // Repeat whole passes until one loop is comfortably wider than the screen.
      while (info.reduce((s, m) => s + m.width + GAP, 0) < window.innerWidth + h * 2) {
        list.forEach((g, i) => {
          const c = copyOf(g);
          baseSet.appendChild(c);
          seq.push(c);
          info.push(base[i]);
        });
        repeated = true;
      }
    }
    // Groups that will change when more arrive: the repeats (if any), or else
    // the last group, which is fitted to close the loop.
    safeEdge = (repeated ? firstCycle : firstCycle - base[base.length - 1].width - GAP) - lead - 40;
    const before = lead;
    const result = layout(seq, info, H);
    setWidth = result.setWidth;
    lead = result.lead;
    baseSet.style.width = setWidth + "px";
    track.style.marginLeft = -Math.round(lead) + "px";
    if (shown) offset += before - lead; // keep what's on screen in place
    if (offset < 0) offset = 0;
    if (setWidth) offset %= setWidth;

    if (!still) {
      const second = document.createElement("div");
      second.className = "carousel-set copy";
      second.setAttribute("aria-hidden", "true");
      second.style.width = setWidth + "px";
      seq.forEach((g, i) => second.appendChild(copyOf(list[i % list.length])));
      track.appendChild(second);
      layout([...second.children], info, H);
    }
    shown = n;
    lastWidth = window.innerWidth;
    root.classList.add("is-ready");
  }

  // Start once a screenful is loaded (or everything, or after a wait).
  let waited = false;
  setTimeout(() => { waited = true; onProgress(); }, 6000);
  function onProgress() {
    const n = readyCount();
    if (!shown) {
      if (!n) return;
      const h = rowHeight(wallHeight());
      const width = measure(groups.slice(0, n), h).reduce((s, m) => s + m.width + GAP, 0);
      if (n === groups.length || width >= window.innerWidth + h || waited) build(n);
    } else if (n > shown) {
      growPending = true; // added in the animation loop, when it won't cause a jump
    }
  }

  // Add newly loaded groups only while the screen shows the first pass of the
  // wall, so nothing on screen changes.
  // On a very slow connection the wall may start with less than a screenful,
  // so adding groups can't be hidden off-screen; then it fades over instead.
  let growPending = false;
  let pendingSince = 0;
  let swapping = false;
  function tryGrow(now) {
    if (!growPending || swapping) return;
    if (!pendingSince) pendingSince = now;
    if (still || offset + window.innerWidth <= safeEdge) {
      growPending = false;
      pendingSince = 0;
      build(readyCount());
    } else if (now - pendingSince > 2500) {
      swapping = true;
      root.classList.add("is-swapping");
      setTimeout(() => {
        growPending = false;
        pendingSince = 0;
        build(readyCount());
        root.classList.remove("is-swapping");
        setTimeout(() => { swapping = false; }, 2500);
      }, 400);
    }
  }

  const paused = () =>
    document.hidden || root.classList.contains("is-paused") ||
    root.matches(":hover") || root.contains(document.activeElement);

  let last = performance.now();
  function tick(now) {
    const dt = Math.min(now - last, 100) / 1000;
    last = now;
    if (shown && !still) {
      if (!paused()) offset = (offset + speed * dt) % setWidth;
      tryGrow(now);
      track.style.transform = `translate3d(${-offset.toFixed(2)}px,0,0)`;
    } else if (shown) {
      tryGrow(now);
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
  pump();

  let t;
  window.addEventListener("resize", () => {
    clearTimeout(t);
    t = setTimeout(() => { if (shown && window.innerWidth !== lastWidth) build(shown); }, 250);
  });

  if (toggle && !still) {
    toggle.hidden = false;
    toggle.addEventListener("click", () => {
      const isPaused = root.classList.toggle("is-paused");
      toggle.textContent = isPaused ? "Play" : "Pause";
      toggle.setAttribute("aria-pressed", String(isPaused));
    });
  }
})();
