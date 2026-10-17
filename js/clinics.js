// Nearby clinic finder. Uses the Google Maps JS API + Places (New) when an API key is configured,
// otherwise falls back to a keyless Google Maps embed.
const Clinics = (() => {
  const apiKey = (window.APP_CONFIG && window.APP_CONFIG.GOOGLE_MAPS_API_KEY) || '';
  const DEFAULT_QUERY = 'travel vaccination clinic';
  const els = {};
  const state = { origin: null, placeText: null, vaccine: '' };
  let gmap, markers = [], googleReady;

  function init() {
    els.map = document.getElementById('clinic-map');
    els.list = document.getElementById('clinic-list');
    els.status = document.getElementById('clinic-status');
    els.select = document.getElementById('vaccine-select');

    document.getElementById('locate-btn').addEventListener('click', locate);
    document.getElementById('place-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const text = document.getElementById('place-input').value.trim();
      if (text) searchPlace(text);
    });
    els.select.addEventListener('change', () => { state.vaccine = els.select.value; refresh(); });
    setVaccineOptions(Object.keys(VACCINES).filter((k) => k !== 'routine'));
    renderEmbed(); // show something before location is known
  }

  // Limit the dropdown to the vaccines relevant to the chosen destination.
  function setVaccineOptions(keys, selected = '') {
    els.select.innerHTML = '<option value="">Any travel vaccine</option>' +
      keys.map((k) => `<option value="${k}">${VACCINES[k].name}</option>`).join('');
    els.select.value = keys.includes(selected) ? selected : '';
    state.vaccine = els.select.value;
  }

  function query() {
    return state.vaccine ? VACCINES[state.vaccine].query : DEFAULT_QUERY;
  }

  function locate() {
    if (!navigator.geolocation) return setStatus('Location is not supported by this browser. Enter a postcode instead.');
    setStatus('Finding your location…');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        state.origin = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        state.placeText = null;
        refresh();
      },
      (err) => setStatus(`Could not get your location (${err.message}). Enter a postcode or town instead.`),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  async function searchPlace(text) {
    state.placeText = text;
    if (!apiKey) { state.origin = null; return refresh(); }
    await loadGoogle();
    new google.maps.Geocoder().geocode({ address: text }, (res, status) => {
      if (status !== 'OK' || !res[0]) return setStatus(`Couldn't find "${text}".`);
      const loc = res[0].geometry.location;
      state.origin = { lat: loc.lat(), lng: loc.lng() };
      refresh();
    });
  }

  function refresh() {
    if (apiKey && state.origin) return renderWithApi();
    renderEmbed();
  }

  function setStatus(msg) { els.status.textContent = msg; }

  function mapsSearchUrl() {
    const q = encodeURIComponent(query());
    if (state.origin) return `https://www.google.com/maps/search/${q}/@${state.origin.lat},${state.origin.lng},13z`;
    if (state.placeText) return `https://www.google.com/maps/search/${encodeURIComponent(query() + ' near ' + state.placeText)}`;
    return `https://www.google.com/maps/search/${q}`;
  }

  // Keyless mode: an embedded Google Maps search.
  function renderEmbed() {
    let q = query();
    if (state.origin) q += ` near ${state.origin.lat.toFixed(5)},${state.origin.lng.toFixed(5)}`;
    else if (state.placeText) q += ` near ${state.placeText}`;
    const ll = state.origin ? `&ll=${state.origin.lat},${state.origin.lng}` : '';
    els.map.innerHTML = `<iframe title="Clinics map" loading="lazy" referrerpolicy="no-referrer-when-downgrade"
      src="https://www.google.com/maps?q=${encodeURIComponent(q)}${ll}&z=13&output=embed"></iframe>`;

    if (state.origin || state.placeText) {
      setStatus(`Showing "${query()}" near ${state.placeText || 'your location'}.`);
    }
    els.list.innerHTML = `
      <li><div class="name"><a href="${mapsSearchUrl()}" target="_blank" rel="noopener">Open full results in Google Maps ↗</a></div>
        <div class="addr">See opening times, reviews and directions.</div></li>
      <li><div class="name"><a href="https://www.nhs.uk/service-search/pharmacy/find-a-pharmacy" target="_blank" rel="noopener">Find a pharmacy (NHS) ↗</a></div>
        <div class="addr">Many pharmacies offer travel vaccination services.</div></li>
      <li><div class="name"><a href="https://www.nhs.uk/service-search/find-a-gp" target="_blank" rel="noopener">Find your GP (NHS) ↗</a></div>
        <div class="addr">Some travel vaccines are free on the NHS from your GP practice.</div></li>
      ${apiKey ? '' : '<li class="meta">Tip: add a Google Maps API key in config.js to list clinics here with markers.</li>'}`;
  }

  function loadGoogle() {
    if (googleReady) return googleReady;
    googleReady = new Promise((resolve, reject) => {
      window.__gmapsReady = resolve;
      const s = document.createElement('script');
      s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&v=weekly&loading=async&callback=__gmapsReady`;
      s.async = true;
      s.onerror = reject;
      document.head.appendChild(s);
    });
    return googleReady;
  }

  // API mode: interactive map, your location, and a clickable list of clinics.
  async function renderWithApi() {
    setStatus('Searching for clinics…');
    try {
      await loadGoogle();
      const { Map, InfoWindow } = await google.maps.importLibrary('maps');
      const { AdvancedMarkerElement, PinElement } = await google.maps.importLibrary('marker');
      const { Place } = await google.maps.importLibrary('places');

      if (!gmap) {
        els.map.innerHTML = '';
        gmap = new Map(els.map, { center: state.origin, zoom: 13, mapId: 'DEMO_MAP_ID' });
      }
      gmap.setCenter(state.origin);
      markers.forEach((m) => (m.map = null));
      markers = [];

      const you = new PinElement({ background: '#005eb8', borderColor: '#003087', glyphColor: '#fff', glyph: '★' });
      markers.push(new AdvancedMarkerElement({ map: gmap, position: state.origin, title: 'You are here', content: you.element }));

      const { places } = await Place.searchByText({
        textQuery: query(),
        fields: ['displayName', 'formattedAddress', 'location', 'rating', 'googleMapsURI'],
        locationBias: { center: state.origin, radius: 15000 },
        maxResultCount: 15,
      });

      const info = new InfoWindow();
      const bounds = new google.maps.LatLngBounds(state.origin);
      els.list.innerHTML = '';

      places.forEach((p, i) => {
        const pin = new PinElement({ glyph: String(i + 1), background: '#007f3b', borderColor: '#00401e', glyphColor: '#fff' });
        const m = new AdvancedMarkerElement({ map: gmap, position: p.location, title: p.displayName, content: pin.element });
        const dist = distanceKm(state.origin, { lat: p.location.lat(), lng: p.location.lng() });
        const html = `<strong>${escapeHtml(p.displayName)}</strong><br>${escapeHtml(p.formattedAddress || '')}<br>
          <a href="${p.googleMapsURI}" target="_blank" rel="noopener">Open in Google Maps</a>`;
        m.addListener('click', () => { info.setContent(html); info.open(gmap, m); });
        markers.push(m);
        bounds.extend(p.location);

        const li = document.createElement('li');
        li.innerHTML = `<div class="name">${i + 1}. ${escapeHtml(p.displayName)}</div>
          <div class="addr">${escapeHtml(p.formattedAddress || '')}</div>
          <div class="meta">${dist.toFixed(1)} km away${p.rating ? ` · ★ ${p.rating}` : ''} ·
            <a href="${p.googleMapsURI}" target="_blank" rel="noopener">Directions</a></div>`;
        li.addEventListener('click', (e) => {
          if (e.target.tagName === 'A') return;
          gmap.panTo(p.location); gmap.setZoom(15);
          info.setContent(html); info.open(gmap, m);
        });
        els.list.appendChild(li);
      });

      if (places.length) gmap.fitBounds(bounds, 40);
      setStatus(places.length
        ? `Found ${places.length} results for "${query()}" near ${state.placeText || 'your location'}.`
        : `No results for "${query()}" nearby. Try "Any travel vaccine".`);
    } catch (err) {
      console.error(err);
      setStatus('Google Maps API failed (check your key and that Places API (New) is enabled). Showing basic map instead.');
      gmap = null;
      renderEmbed();
    }
  }

  function distanceKm(a, b) {
    const r = Math.PI / 180, R = 6371;
    const dLat = (b.lat - a.lat) * r, dLng = (b.lng - a.lng) * r;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  }

  // Called from the destination panel: "find clinics for this vaccine".
  function focusVaccine(key, destinationKeys) {
    if (destinationKeys) setVaccineOptions(destinationKeys, key);
    else { els.select.value = key; state.vaccine = key; }
    refresh();
    document.getElementById('clinics').scrollIntoView({ behavior: 'smooth' });
  }

  return { init, setVaccineOptions, focusVaccine, refresh };
})();
