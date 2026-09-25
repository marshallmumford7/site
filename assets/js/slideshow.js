// Crossfades the homepage slideshow. Pauses when the tab is hidden or
// the visitor prefers reduced motion.
(() => {
  const box = document.querySelector("[data-slideshow]");
  if (!box) return;
  const slides = [...box.querySelectorAll(".slide")];
  if (slides.length < 2) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  slides.forEach((s) => s.removeAttribute("loading")); // load the rest in the background
  let i = 0;
  setInterval(() => {
    if (document.hidden) return;
    slides[i].classList.remove("is-active");
    i = (i + 1) % slides.length;
    slides[i].classList.add("is-active");
  }, 6000);
})();
