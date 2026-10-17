// Nearby clinic finder: NHS-listed pharmacy travel clinics and GP practices from the
// NHS Directory of Healthcare Services (via our server's /api/clinics), shown as a list
// with badges and sort options, plus a Leaflet map with matching numbered pins.
const Clinics = (() => {
  const YF_FINDER = 'https://nathnacyfzone.org.uk/search-centres';
  const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const els = {};
  const state = { origin: null, placeText: null, vaccine: '', sort: 'distance', clinics: [], source: '', error: '' };
  let map, pins, markers = [], loadId = 0;

  function init() {
    els.map = document.getElementById('clinic-map');
    els.list = document.getElementById('clinic-list');
    els.status = document.getElementById('clinic-status');
    els.select = document.getElementById('vaccine-select');
    els.sort = document.getElementById('clinic-sort');
    els.advice = document.getElementById('clinic-advice');

    document.getElementById('locate-btn').addEventListener('click', locate);
    document.getElementById('place-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const text = document.getElementById('place-input').value.trim();
      if (text) searchPlace(text);
    });
    els.select.addEventListener('change', () => { state.vaccine = els.select.value; render(); });
    els.sort.addEventListener('change', () => { state.sort = els.sort.value; render(); });
    els.list.addEventListener('click', onListClick);

    map = L.map(els.map, { scrollWheelZoom: false }).setView([53, -1.5], 6); // England
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);
    pins = L.layerGroup().addTo(map);

    setVaccineOptions(Object.keys(VACCINES).filter((k) => k !== 'routine'));
  }

  // Limit the dropdown to the vaccines relevant to the chosen destination.
  function setVaccineOptions(keys, selected = '') {
    els.select.innerHTML = '<option value="">Any travel vaccine</option>' +
      keys.map((k) => `<option value="${k}">${VACCINES[k].name}</option>`).join('');
    els.select.value = keys.includes(selected) ? selected : '';
    state.vaccine = els.select.value;
    render();
  }

  // ---------- Where is the user? ----------

  function locate() {
    if (!navigator.geolocation) return setStatus('Location is not supported by this browser. Enter a postcode instead.');
    setStatus('Finding your location…');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        state.origin = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        state.placeText = null;
        load();
      },
      (err) => setStatus(`Could not get your location (${err.message}). Enter a postcode or town instead.`),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  // Bigger places first, so "Brighton" means the city, not a hamlet in Cornwall.
  const PLACE_RANK = ['City', 'Town', 'Other Settlement', 'Suburban Area', 'Village', 'Hamlet'];
  const placeRank = (p) => (PLACE_RANK.includes(p.local_type) ? PLACE_RANK.indexOf(p.local_type) : PLACE_RANK.length);

  // UK postcode, partial postcode or town -> { lat, lng, label }, via postcodes.io (free, no key).
  // We look the place up ourselves so the map never has to guess where the user means.
  async function geocodeUk(text) {
    const base = 'https://api.postcodes.io';
    const get = (path) => fetch(base + path).then((r) => r.json()).catch(() => null);
    const q = encodeURIComponent(text);
    const full = await get(`/postcodes/${q}`); // e.g. "SW1A 1AA"
    if (full?.result) {
      const r = full.result;
      return { lat: r.latitude, lng: r.longitude, label: `${r.postcode} (${r.admin_district})` };
    }
    const outcode = await get(`/outcodes/${q}`); // e.g. "SW1A"
    if (outcode?.result) {
      const r = outcode.result;
      return { lat: r.latitude, lng: r.longitude, label: `${r.outcode} (${r.admin_district?.[0] || 'UK'})` };
    }
    const places = await get(`/places?q=${q}&limit=20`); // e.g. "Leeds"
    const exact = (places?.result || []).filter((p) => p.name_1.toLowerCase() === text.toLowerCase());
    const p = (exact.length ? exact : places?.result || []).sort((a, b) => placeRank(a) - placeRank(b))[0];
    return p ? { lat: p.latitude, lng: p.longitude, label: `${p.name_1} (${p.county_unitary || p.region})` } : null;
  }

  async function searchPlace(text) {
    setStatus(`Looking up "${text}"…`);
    const found = await geocodeUk(text);
    if (!found) return setStatus(`Couldn't find "${text}". Try a full UK postcode (e.g. SW1A 1AA) or a town name.`);
    state.origin = { lat: found.lat, lng: found.lng };
    state.placeText = found.label; // shown in the status line, so the user can see which place we picked
    load();
  }

  // ---------- Fetch (only when the location changes) ----------

  async function load() {
    const id = ++loadId; // if the user searches again quickly, ignore answers to the older search
    state.error = '';
    setStatus(`Searching the NHS directory near ${state.placeText || 'your location'}…`);
    try {
      const res = await fetch(`/api/clinics?lat=${state.origin.lat}&lng=${state.origin.lng}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || (res.status === 404
          ? 'the clinic finder needs the app server. Start it with: python3 server/app.py'
          : `server error ${res.status}`));
      }
      if (id !== loadId) return;
      // Exact distance from the user's real position (the server rounds positions for caching).
      state.clinics = data.clinics.map((c) => ({ ...c, distanceKm: distanceKm(state.origin, c) }));
      state.source = data.source;
    } catch (err) {
      if (id !== loadId) return;
      state.clinics = [];
      state.error = err.message;
    }
    render();
  }

  // ---------- Draw (whenever location, vaccine or sort changes) ----------

  function render() {
    els.advice.innerHTML = adviceHtml();
    const shown = visibleClinics();
    renderMap(shown);
    renderList(shown);
    renderStatus(shown);
  }

  // What the user should know about the selected vaccine before choosing a clinic.
  function adviceHtml() {
    const v = VACCINES[state.vaccine];
    if (!v) {
      return `<p class="alert">Pharmacy travel clinics give most travel vaccines, usually for a fee.
        Some are free from your own GP practice. Choose a vaccine for specific advice.</p>`;
    }
    if (state.vaccine === 'yf') {
      return `<p class="alert warn"><strong>Yellow fever</strong> vaccine is only given at registered yellow fever centres.
        The NHS directory doesn't show which clinics are registered, so
        <a href="${YF_FINDER}" target="_blank" rel="noopener">find a registered centre (NaTHNaC) ↗</a>
        or call a travel clinic below to check.</p>`;
    }
    if (v.nhsFree) {
      return `<p class="alert ok">✅ <strong>${v.name}</strong> is usually <strong>free on the NHS</strong>
        from the GP practice you're registered with. Pharmacy travel clinics can also give it for a fee.</p>`;
    }
    return `<p class="alert"><strong>${v.name}</strong> isn't usually free on the NHS.
      Pharmacy travel clinics can give it for a fee: call ahead to check they stock it.</p>`;
  }

  // GP practices only help with vaccines that are free on the NHS, so hide them otherwise.
  function visibleClinics() {
    const v = VACCINES[state.vaccine];
    const showGps = !v || v.nhsFree;
    const list = state.clinics.filter((c) => c.kind !== 'gp' || showGps);
    const byDistance = (a, b) => a.distanceKm - b.distanceKm;
    const first = (test) => (a, b) => (test(b) - test(a)) || byDistance(a, b);
    if (state.sort === 'open') return list.sort(first(isOpenNow));
    if (state.sort === 'website') return list.sort(first((c) => !!c.website));
    if (state.sort === 'pharmacy') return list.sort(first((c) => c.kind === 'pharmacy'));
    return list.sort(byDistance);
  }

  function renderMap(shown) {
    pins.clearLayers();
    markers = [];
    if (!state.origin) return;
    const you = [state.origin.lat, state.origin.lng];
    L.circleMarker(you, { radius: 8, color: '#fff', weight: 3, fillColor: '#005eb8', fillOpacity: 1 })
      .bindTooltip(state.placeText || 'You are here').addTo(pins);
    shown.forEach((c, i) => {
      const icon = L.divIcon({ className: `clinic-pin ${c.kind}`, html: String(i + 1), iconSize: [26, 26] });
      markers.push(L.marker([c.lat, c.lng], { icon, title: c.name }).bindPopup(popupHtml(c)).addTo(pins));
    });
    map.fitBounds([you, ...shown.map((c) => [c.lat, c.lng])], { padding: [30, 30], maxZoom: 15 });
  }

  function renderList(shown) {
    if (!shown.length) {
      els.list.innerHTML = fallbackLinks();
      return;
    }
    els.list.innerHTML = shown.map((c, i) => `
      <li data-i="${i}">
        <div class="name"><span class="num ${c.kind}">${i + 1}</span>${esc(tidy(c.name))}</div>
        <div class="clinic-badges">${badgesHtml(c)}</div>
        <div class="addr">${esc(tidy(c.address))}${c.postcode ? `, ${esc(c.postcode)}` : ''} · <strong>${c.distanceKm.toFixed(1)} km</strong></div>
        <div class="meta">${esc(hoursToday(c))}</div>
        <div class="links">${linksHtml(c)}</div>
      </li>`).join('') +
      `<li class="list-note">Source: ${esc(state.source)}. Opening hours can change: check before you go.
        <a href="${mapsSearchUrl()}" target="_blank" rel="noopener">More options in Google Maps ↗</a></li>`;
  }

  function renderStatus(shown) {
    if (state.error) return setStatus(`Couldn't load clinics: ${state.error}`);
    if (!state.origin) return setStatus('Share your location or enter a UK postcode to find NHS-listed travel clinics near you.');
    const pharmacies = shown.filter((c) => c.kind === 'pharmacy').length;
    const gps = shown.length - pharmacies;
    setStatus(`Showing ${pharmacies} pharmacy travel clinics${gps ? ` and ${gps} GP practices` : ''} near ${state.placeText || 'your location'}.`);
  }

  // ---------- Small pieces ----------

  function badgesHtml(c) {
    const b = ['<span class="badge">🏥 NHS listed</span>'];
    if (c.travelClinic) b.push('<span class="badge ok">✈️ Travel clinic</span>');
    if (c.kind === 'gp') b.push('<span class="badge you">GP: free NHS vaccines if you\'re registered here</span>');
    if (Object.keys(c.hours).length) b.push(isOpenNow(c) ? '<span class="badge ok">Open now</span>' : '<span class="badge warn">Closed now</span>');
    return b.join('');
  }

  function linksHtml(c) {
    const links = [];
    if (c.website) links.push(`<a href="${esc(c.website)}" target="_blank" rel="noopener">Website / book ↗</a>`);
    if (c.phone) links.push(`<a href="tel:${esc(c.phone.replace(/\s/g, ''))}">Call ${esc(c.phone)}</a>`);
    links.push(`<a href="https://www.google.com/maps/dir/?api=1&destination=${c.lat},${c.lng}" target="_blank" rel="noopener">Directions ↗</a>`);
    return links.join(' · ');
  }

  function popupHtml(c) {
    return `<strong>${esc(tidy(c.name))}</strong><br>${esc(tidy(c.address))}${c.postcode ? `, ${esc(c.postcode)}` : ''}<br>
      ${esc(hoursToday(c))}<br>${linksHtml(c)}`;
  }

  // Clicking a list entry zooms the map to its pin (but links still work normally).
  function onListClick(e) {
    const li = e.target.closest('li[data-i]');
    if (!li || e.target.closest('a')) return;
    const m = markers[li.dataset.i];
    map.setView(m.getLatLng(), 16);
    m.openPopup();
  }

  // Opening times come as { Monday: [["09:00", "17:30"]], ... }. "HH:MM" strings compare correctly as text.
  function isOpenNow(c) {
    const now = new Date();
    const hhmm = now.toTimeString().slice(0, 5);
    return (c.hours[DAYS[now.getDay()]] || []).some(([open, close]) => open <= hhmm && hhmm < close);
  }

  function hoursToday(c) {
    if (!Object.keys(c.hours).length) return 'Opening hours not listed';
    const today = c.hours[DAYS[new Date().getDay()]];
    return today ? `Today: ${today.map(([o, cl]) => `${o}–${cl}`).join(', ')}` : 'Closed today';
  }

  function fallbackLinks() {
    return `
      <li><div class="name"><a href="https://www.nhs.uk/service-search/pharmacy/find-a-pharmacy" target="_blank" rel="noopener">Find a pharmacy (NHS) ↗</a></div>
        <div class="addr">Many pharmacies offer travel vaccination services.</div></li>
      <li><div class="name"><a href="https://www.nhs.uk/service-search/find-a-gp" target="_blank" rel="noopener">Find your GP (NHS) ↗</a></div>
        <div class="addr">Some travel vaccines are free on the NHS from your GP practice.</div></li>`;
  }

  function mapsSearchUrl() {
    const q = encodeURIComponent(VACCINES[state.vaccine]?.query || 'travel vaccination clinic');
    return `https://www.google.com/maps/search/${q}/@${state.origin.lat},${state.origin.lng},14z`;
  }

  function setStatus(msg) { els.status.textContent = msg; }

  // "KEENCARE PHARMACY" -> "Keencare Pharmacy" (some NHS entries are all capitals).
  function tidy(s) {
    return s === s.toUpperCase() ? s.toLowerCase().replace(/\b\w/g, (ch) => ch.toUpperCase()) : s;
  }

  function distanceKm(a, b) {
    const r = Math.PI / 180, R = 6371;
    const dLat = (b.lat - a.lat) * r, dLng = (b.lng - a.lng) * r;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  }

  // Called from the destination panel: "find clinics for this vaccine".
  function focusVaccine(key, destinationKeys) {
    if (destinationKeys) setVaccineOptions(destinationKeys, key);
    else { els.select.value = key; state.vaccine = key; render(); }
    document.getElementById('clinics').scrollIntoView({ behavior: 'smooth' });
  }

  return { init, setVaccineOptions, focusVaccine };
})();
