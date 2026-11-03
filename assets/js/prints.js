// Turns the print request form into a pre-filled email.
(() => {
  const form = document.querySelector("[data-print-form]");
  if (!form) return;
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const v = (n) => (form.elements[n] ? form.elements[n].value.trim() : "");
    const subject = `Print request: ${v("photo")}`;
    const lines = [
      "Hi Marshall,",
      "",
      "I'd like to order a print.",
      "",
      `Photo: ${v("photo")}`,
      `Size: ${v("size")}`,
      `Finish: ${v("finish")}`,
    ];
    if (v("notes")) lines.push("", v("notes"));
    lines.push("", "Thanks,", v("name") || "");
    window.location.href =
      `mailto:${form.dataset.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join("\n"))}`;
  });
})();
