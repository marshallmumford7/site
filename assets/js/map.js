// Draws the trip map from the JSON next to [data-trip-map]. Needs Leaflet.
(() => {
  const el = document.querySelector("[data-trip-map]");
  if (!el || !window.L) return;
  let trips = [];
  try { trips = JSON.parse(el.nextElementSibling.textContent); } catch (e) { return; }
  if (!trips.length) { el.remove(); return; }

  // Trips at the same spot share one pin.
  const places = new Map();
  trips.forEach((t) => {
    const key = `${(+t.lat).toFixed(3)},${(+t.lng).toFixed(3)}`;
    if (!places.has(key)) places.set(key, { lat: +t.lat, lng: +t.lng, trips: [] });
    places.get(key).trips.push(t);
  });

  const dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const css = getComputedStyle(document.documentElement);
  const teal = css.getPropertyValue("--teal").trim() || "#71a1af";
  const ring = css.getPropertyValue("--paper").trim() || "#fff";

  const map = L.map(el, { scrollWheelZoom: false, worldCopyJump: true, zoomSnap: 0.5 });
  // CARTO's clean basemap needs a free key (carto_key in _config.yml).
  // Without one, fall back to standard OpenStreetMap tiles, which need no key.
  const key = (el.dataset.cartoKey || "").trim();
  const osm = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
  if (key) {
    L.tileLayer(`https://{s}.basemaps.cartocdn.com/${dark ? "dark_all" : "light_all"}/{z}/{x}/{y}{r}.png?key=${encodeURIComponent(key)}`, {
      subdomains: "abcd",
      maxZoom: 18,
      attribution: `${osm} &copy; <a href="https://carto.com/attributions">CARTO</a>`,
    }).addTo(map);
  } else {
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 18, attribution: osm }).addTo(map);
    if (dark) el.classList.add("trip-map-dim");
  }

  // Scroll-to-zoom only after the visitor clicks the map, so the page scrolls normally.
  map.on("click", () => map.scrollWheelZoom.enable());
  el.addEventListener("mouseleave", () => map.scrollWheelZoom.disable());

  function popup(place) {
    const box = document.createElement("div");
    box.className = "trip-popup";
    const list = document.createElement("ul");
    place.trips.forEach((t) => {
      const li = document.createElement("li");
      const a = document.createElement("a");
      a.href = t.url;
      if (t.cover) {
        const img = document.createElement("img");
        img.src = t.cover;
        img.alt = "";
        img.loading = "lazy";
        a.appendChild(img);
      }
      const text = document.createElement("span");
      const title = document.createElement("strong");
      title.textContent = t.title;
      text.appendChild(title);
      if (t.location) {
        const loc = document.createElement("small");
        loc.textContent = t.location;
        text.appendChild(loc);
      }
      a.appendChild(text);
      li.appendChild(a);
      list.appendChild(li);
    });
    box.appendChild(list);
    return box;
  }

  const bounds = [];
  places.forEach((place) => {
    const n = place.trips.length;
    const marker = L.circleMarker([place.lat, place.lng], {
      radius: 7 + Math.min(n - 1, 3) * 2,
      color: ring,
      weight: 2,
      fillColor: teal,
      fillOpacity: 1,
    }).addTo(map);
    marker.bindTooltip(n === 1 ? place.trips[0].title : `${place.trips[0].location || place.trips[0].title} · ${n} trips`, { direction: "top", offset: [0, -8] });
    marker.bindPopup(popup(place), { maxWidth: 280, minWidth: 220 });
    marker.on("mouseover", () => marker.setStyle({ fillColor: css.getPropertyValue("--accent").trim() || teal }));
    marker.on("mouseout", () => marker.setStyle({ fillColor: teal }));
    bounds.push([place.lat, place.lng]);
  });

  if (bounds.length === 1) map.setView(bounds[0], 6);
  else map.fitBounds(bounds, { padding: [40, 40], maxZoom: 7 });
})();
