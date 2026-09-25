// Shows a copyright notice instead of the menu when someone right-clicks
// (or long-presses on Android) a photo, and stops photos being dragged out.
// This deters casual saving; it can't stop screenshots.
(() => {
  const owner = "Marshall Mumford";
  const note = document.createElement("div");
  note.className = "copyright-note";
  note.setAttribute("role", "status");
  note.textContent = `\u00a9 ${new Date().getFullYear()} ${owner}. All rights reserved.`;
  document.body.appendChild(note);
  let timer;

  function show(x, y) {
    // A notice inside an open lightbox has to live in the lightbox to appear above it.
    (document.querySelector("dialog[open]") || document.body).appendChild(note);
    note.classList.add("is-visible");
    const pad = 12;
    const w = note.offsetWidth, h = note.offsetHeight;
    note.style.left = Math.min(Math.max(pad, x + 8), window.innerWidth - w - pad) + "px";
    note.style.top = Math.min(Math.max(pad, y + 8), window.innerHeight - h - pad) + "px";
    clearTimeout(timer);
    timer = setTimeout(() => note.classList.remove("is-visible"), 2200);
  }

  document.addEventListener("contextmenu", (e) => {
    if (!e.target.closest("img")) return;
    e.preventDefault();
    show(e.clientX, e.clientY);
  });
  document.addEventListener("dragstart", (e) => {
    if (e.target.closest("img")) e.preventDefault();
  });
})();
