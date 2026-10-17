// Draws the trip map from the JSON next to [data-trip-map]. Needs Leaflet.
(() => {
  const el = document.querySelector("[data-trip-map]");
  if (!el || !window.L) return;
  let trips = [];
  try { trips = JSON.parse(el.nextElementSibling.textContent); } catch (e) { return; }
  if (!trips.length) { el.remove(); return; }

  // Trips at the same spot share one pin. Trips in a group also get a group
  // pin, shown when zoomed out; zoom in past the group's split_zoom and the
  // group pin is replaced by the trips' own pins.
  const spots = new Map();  // pins for single trips (always shown)
  const groups = new Map(); // group name -> { pin, spots inside it, splitZoom }
  const spotKey = (t) => `${(+t.lat).toFixed(3)},${(+t.lng).toFixed(3)}`;
  const addTo = (bucket, key, lat, lng, t, name = "") => {
    if (!bucket.has(key)) bucket.set(key, { lat, lng, name, trips: [] });
    bucket.get(key).trips.push(t);
  };
  trips.forEach((t) => {
    if (t.group && t.glat != null) {
      if (!groups.has(t.group)) {
        groups.set(t.group, { pin: { lat: +t.glat, lng: +t.glng, name: t.group, trips: [] }, spots: new Map(), splitZoom: +t.gzoom || 8 });
      }
      const g = groups.get(t.group);
      g.pin.trips.push(t);
      addTo(g.spots, spotKey(t), +t.lat, +t.lng, t);
    } else {
      addTo(spots, spotKey(t), +t.lat, +t.lng, t);
    }
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
    if (place.name) {
      const h = document.createElement("p");
      h.className = "trip-popup-head";
      h.textContent = place.name;
      box.appendChild(h);
    }
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

  function pin(place) {
    const n = place.trips.length;
    const marker = L.circleMarker([place.lat, place.lng], {
      radius: 7 + Math.min(n - 1, 3) * 2,
      color: ring,
      weight: 2,
      fillColor: teal,
      fillOpacity: 1,
    });
    const label = place.name || (n === 1 ? place.trips[0].title : place.trips[0].location || place.trips[0].title);
    marker.bindTooltip(n === 1 && !place.name ? label : `${label} \u00b7 ${n} trip${n === 1 ? "" : "s"}`, { direction: "top", offset: [0, -8] });
    marker.bindPopup(popup(place), { maxWidth: 280, minWidth: 220 });
    marker.on("mouseover", () => marker.setStyle({ fillColor: css.getPropertyValue("--accent").trim() || teal }));
    marker.on("mouseout", () => marker.setStyle({ fillColor: teal }));
    return marker;
  }

  const bounds = [];
  spots.forEach((place) => {
    pin(place).addTo(map);
    bounds.push([place.lat, place.lng]);
  });

  const layers = [];
  groups.forEach((g) => {
    const together = L.layerGroup([pin(g.pin)]);
    const apart = L.layerGroup([...g.spots.values()].map(pin));
    layers.push({ together, apart, splitZoom: g.splitZoom });
    bounds.push([g.pin.lat, g.pin.lng]);
  });

  function update() {
    const z = map.getZoom();
    layers.forEach(({ together, apart, splitZoom }) => {
      const split = z >= splitZoom;
      if (split) { map.removeLayer(together); apart.addTo(map); }
      else { map.removeLayer(apart); together.addTo(map); }
    });
  }
  if (bounds.length === 1) map.setView(bounds[0], 6);
  else map.fitBounds(bounds, { padding: [40, 40], maxZoom: 7 });
  map.whenReady(() => {
    update();
    map.on("zoomend", () => { map.closePopup(); update(); });
  });
})();
