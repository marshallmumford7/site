// Full-screen photo viewer. Works on any list marked with data-gallery.
(() => {
  const grids = document.querySelectorAll("[data-gallery]");
  if (!grids.length || typeof HTMLDialogElement !== "function") return;

  const icon = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"/></svg>`;
  const dialog = document.createElement("dialog");
  dialog.className = "lightbox";
  dialog.setAttribute("aria-label", "Photo viewer");
  dialog.innerHTML = `
    <div class="lb-stage"><img alt=""></div>
    <div class="lb-bar"><span class="lb-caption"></span><span class="lb-count"></span></div>
    <button class="lb-btn lb-prev" type="button" aria-label="Previous photo">${icon("M15 5l-7 7 7 7")}</button>
    <button class="lb-btn lb-next" type="button" aria-label="Next photo">${icon("M9 5l7 7-7 7")}</button>
    <button class="lb-btn lb-close" type="button" autofocus aria-label="Close">${icon("M6 6l12 12M18 6L6 18")}</button>`;
  document.body.appendChild(dialog);

  const stage = dialog.querySelector(".lb-stage");
  const img = stage.querySelector("img");
  const caption = dialog.querySelector(".lb-caption");
  const count = dialog.querySelector(".lb-count");
  let items = [];
  let index = 0;

  function show(i) {
    index = (i + items.length) % items.length;
    const link = items[index];
    img.src = link.href;
    img.alt = link.querySelector("img")?.alt || "";
    caption.textContent = link.dataset.caption || "";
    count.textContent = `${index + 1} of ${items.length}`;
    [index + 1, index - 1].forEach((n) => {
      const next = items[(n + items.length) % items.length];
      if (next) new Image().src = next.href;
    });
  }

  grids.forEach((grid) => {
    const links = [...grid.querySelectorAll("a.photo")];
    links.forEach((link, i) => {
      link.addEventListener("click", (e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        e.preventDefault();
        items = links;
        show(i);
        dialog.showModal();
      });
    });
  });

  const single = () => items.length < 2;
  dialog.querySelector(".lb-prev").addEventListener("click", () => show(index - 1));
  dialog.querySelector(".lb-next").addEventListener("click", () => show(index + 1));
  dialog.querySelector(".lb-close").addEventListener("click", () => dialog.close());
  dialog.addEventListener("close", () => items[index]?.focus());
  dialog.addEventListener("keydown", (e) => {
    if (single()) return;
    if (e.key === "ArrowRight") show(index + 1);
    if (e.key === "ArrowLeft") show(index - 1);
  });
  stage.addEventListener("click", (e) => { if (e.target === stage) dialog.close(); });

  let startX = null;
  stage.addEventListener("pointerdown", (e) => { startX = e.clientX; });
  stage.addEventListener("pointerup", (e) => {
    if (startX === null || single()) return;
    const dx = e.clientX - startX;
    startX = null;
    if (Math.abs(dx) > 50) show(dx < 0 ? index + 1 : index - 1);
  });

  const toggleArrows = () => dialog.querySelectorAll(".lb-prev, .lb-next").forEach((b) => (b.hidden = single()));
  new MutationObserver(toggleArrows).observe(dialog, { attributes: true, attributeFilter: ["open"] });
})();
