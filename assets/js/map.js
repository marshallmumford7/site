// Draws the trip map from the JSON next to [data-trip-map]. Needs Leaflet.
// Groups (from _data/map.yml) show as one pin when zoomed out and split into
// their members at split_zoom. A group can list another group's key among its
// trips, so groups can nest (e.g. Cornell > Cornell Fashion Collective).
(() => {
  const el = document.querySelector("[data-trip-map]");
  if (!el || !window.L) return;
  let data;
  try { data = JSON.parse(el.nextElementSibling.textContent); } catch (e) { return; }
  const trips = new Map((data.trips || []).map((t) => [t.slug, t]));
  const groupDefs = data.groups && typeof data.groups === "object" ? data.groups : {};
  if (!trips.size) { el.remove(); return; }

  // Build the group tree. Each node: { name, lat, lng, zoom, children: [nodes or trips] }
  const nodes = {};
  Object.entries(groupDefs).forEach(([key, g]) => {
    if (!g || !Array.isArray(g.coords)) return;
    nodes[key] = { key, name: g.name || key, lat: +g.coords[0], lng: +g.coords[1], zoom: +g.split_zoom || 8, children: [] };
  });
  const claimed = new Set(); // trips and groups that live inside some group
  Object.entries(groupDefs).forEach(([key, g]) => {
    const node = nodes[key];
    if (!node) return;
    (g.trips || []).forEach((member) => {
      if (claimed.has(member) || member === key) return; // each item lives in one group only
      if (nodes[member]) { node.children.push(nodes[member]); claimed.add(member); }
      else if (trips.has(member)) { node.children.push(trips.get(member)); claimed.add(member); }
    });
  });
  // A trip with no coordinates of its own sits at its nearest group's spot.
  (function place(node, parent) {
    node.children.forEach((c) => {
      if (c.children) place(c, node);
      else if (c.lat == null) { c.lat = node.lat; c.lng = node.lng; }
    });
  })({ children: Object.values(nodes) }, null);
  const tripsIn = (node) => node.children.flatMap((c) => (c.children ? tripsIn(c) : [c]));

  const roots = [
    ...Object.values(nodes).filter((n) => !claimed.has(n.key)),
    ...[...trips.values()].filter((t) => !claimed.has(t.slug) && t.lat != null),
  ];

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

  // Work out which pins are visible at zoom z. Trips at the same spot share a pin.
  function pinsAt(z) {
    const out = new Map();
    const addTrip = (t) => {
      const k = `${(+t.lat).toFixed(3)},${(+t.lng).toFixed(3)}`;
      if (!out.has(k)) out.set(k, { lat: +t.lat, lng: +t.lng, name: "", trips: [] });
      const p = out.get(k);
      if (!p.name && t.spot) p.name = t.spot;
      p.trips.push(t);
    };
    const visit = (item) => {
      if (!item.children) return addTrip(item);
      if (z < item.zoom) out.set(`group:${item.key}`, { lat: item.lat, lng: item.lng, name: item.name, trips: tripsIn(item) });
      else item.children.forEach(visit);
    };
    roots.forEach(visit);
    return [...out.values()];
  }

  const layer = L.layerGroup().addTo(map);
  function draw() {
    layer.clearLayers();
    pinsAt(map.getZoom()).forEach((p) => pin(p).addTo(layer));
  }

  const bounds = roots.map((r) => [r.lat, r.lng]);
  if (bounds.length === 1) map.setView(bounds[0], 6);
  else map.fitBounds(bounds, { padding: [40, 40], maxZoom: 7 });
  map.whenReady(() => {
    draw();
    map.on("zoomend", () => { map.closePopup(); draw(); });
  });
})();
