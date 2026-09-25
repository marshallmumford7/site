// Fills the homepage Instagram row with your latest posts from a Behold JSON feed.
// Set behold_feed_id in _config.yml to turn this on.
(() => {
  const row = document.querySelector("[data-behold]");
  if (!row) return;
  const count = 6;

  // Grey squares while loading, so the page doesn't jump.
  row.innerHTML = '<li class="placeholder"></li>'.repeat(count);

  const pick = (p) =>
    p.sizes?.medium?.mediaUrl ||
    p.sizes?.small?.mediaUrl ||
    (p.mediaType === "VIDEO" ? p.thumbnailUrl : p.mediaUrl) ||
    p.thumbnailUrl;

  fetch(`https://feeds.behold.so/${row.dataset.behold}`)
    .then((r) => { if (!r.ok) throw new Error(`Feed returned ${r.status}`); return r.json(); })
    .then((data) => {
      const posts = (Array.isArray(data) ? data : data.posts || []).filter(pick).slice(0, count);
      if (!posts.length) throw new Error("Feed is empty");
      row.innerHTML = "";
      posts.forEach((p) => {
        const li = document.createElement("li");
        const a = document.createElement("a");
        a.href = p.permalink || row.dataset.profile;
        a.target = "_blank";
        a.rel = "noopener";
        const img = document.createElement("img");
        img.src = pick(p);
        img.loading = "lazy";
        img.decoding = "async";
        const text = (p.prunedCaption || p.caption || "").trim();
        img.alt = text ? text.slice(0, 120) : "Instagram post by Marshall Mumford";
        a.appendChild(img);
        li.appendChild(a);
        row.appendChild(li);
      });
      row.removeAttribute("aria-busy");
    })
    .catch((err) => {
      console.warn("Instagram feed:", err.message);
      row.remove(); // the heading and Follow button still link to Instagram
    });
})();
