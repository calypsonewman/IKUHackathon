(async function main() {
  const COLORS = ['#d6e9f8', '#8fc1ea', '#f0a64a', '#d5281b'];
  const panel = document.getElementById('panel');
  const emptyPanel = panel.innerHTML; // the starting "Choose a destination" message, used by resetView()
  const searchIndex = new Map(); // label -> { country, city, layer }
  let selectedLayer = null;
  let zoomedTo = null; // the country layer or city the map is currently zoomed in on

  Clinics.init();
  Profile.init();

  // No background tiles: the coloured country shapes sit on the map's plain blue "sea" (see .world-map in styles.css).
  const WORLD_VIEW = { center: [25, 10], zoom: 2 };
  const map = L.map('world-map', { worldCopyJump: true, minZoom: 2, maxZoom: 10, maxBounds: [[-85, -200], [85, 200]] })
    .setView(WORLD_VIEW.center, WORLD_VIEW.zoom);

  // Countries
  const topo = await fetch('https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-50m.json').then((r) => r.json());
  const geo = topojson.feature(topo, topo.objects.countries);
  fixDateLine(geo);

  // Russia and Fiji cross the 180° date line, which Leaflet draws as stripes right across the map.
  // Shift the wrapped-around part of those outlines east by 360° so each shape stays in one piece.
  // (Antarctica also crosses it, but sits below the visible map, so it's left alone.)
  function fixDateLine(collection) {
    collection.features.forEach((f) => {
      if (!f.geometry) return;
      const polygons = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
      polygons.forEach((rings) => rings.forEach((ring) => {
        const crosses = ring.some((c, i) => i > 0 && Math.abs(c[0] - ring[i - 1][0]) > 180);
        if (crosses && ring.every((c) => c[1] > -60)) ring.forEach((c) => { if (c[0] < 0) c[0] += 360; });
      }));
    });
  }

  function countryFor(feature) {
    const geoName = feature.properties.name;
    const base = (feature.id && COUNTRIES[feature.id]) || NAMED_COUNTRIES[geoName] ||
      { code: feature.id || geoName, profile: 'westEU' };
    return { ...base, name: base.name || geoName };
  }

  const area = (layer) => {
    const b = layer.getBounds();
    return (b.getNorth() - b.getSouth()) * (b.getEast() - b.getWest());
  };

  const baseStyle = (country) => ({
    fillColor: COLORS[riskLevel(country)], fillOpacity: 0.85, color: '#fff', weight: 0.6,
  });

  const countriesLayer = L.geoJSON(geo, {
    style: (f) => baseStyle(countryFor(f)),
    onEachFeature: (f, layer) => {
      const country = countryFor(f);
      layer.country = country;
      layer.bindTooltip(country.name, { sticky: true, className: 'country-tip' });
      layer.on({
        mouseover: () => layer !== selectedLayer && layer.setStyle({ weight: 2, color: '#003087' }),
        mouseout: () => layer !== selectedLayer && layer.setStyle(baseStyle(country)),
        click: (e) => {
          L.DomEvent.stopPropagation(e); // so the map doesn't also treat this as an ocean click
          toggle(layer, () => select(country, null, layer));
        },
      });
      // Keep the largest shape per name (e.g. Australia rather than Ashmore and Cartier Is.)
      const prev = searchIndex.get(country.name);
      if (!prev || area(layer) > area(prev.layer)) searchIndex.set(country.name, { country, layer });
    },
  }).addTo(map);

  // Cities
  map.createPane('cities').style.zIndex = 450; // keep cities above highlighted countries
  const cityLayer = L.layerGroup().addTo(map);
  CITIES.forEach((city) => {
    const country = countryFor({ id: city.cc, properties: { name: '' } });
    const marker = L.circleMarker(city.ll, {
      pane: 'cities', radius: 5, color: '#003087', weight: 2.5, fillColor: '#fff', fillOpacity: 1,
    }).addTo(cityLayer);
    marker.bindTooltip(city.name, { direction: 'top', offset: [0, -4] });
    marker.on('click', (e) => { L.DomEvent.stopPropagation(e); toggle(city, () => select(country, city, null)); });
    searchIndex.set(`${city.name}, ${country.name}`, { country, city });
  });

  // Search
  const datalist = document.getElementById('dest-list');
  datalist.innerHTML = [...searchIndex.keys()].sort().map((k) => `<option value="${k}"></option>`).join('');
  const searchInput = document.getElementById('dest-search');
  searchInput.addEventListener('change', () => {
    const hit = searchIndex.get(searchInput.value) ||
      [...searchIndex.entries()].find(([k]) => k.toLowerCase().startsWith(searchInput.value.toLowerCase()))?.[1];
    if (!hit) return;
    select(hit.country, hit.city || null, hit.city ? null : hit.layer); // select() also zooms
  });

  function highlight(layer) {
    if (selectedLayer) selectedLayer.setStyle(baseStyle(selectedLayer.country));
    selectedLayer = layer;
    if (layer) { layer.setStyle({ weight: 2.5, color: '#212b32' }); layer.bringToFront(); }
  }

  function select(country, city, layer) {
    if (!layer) layer = searchIndex.get(country.name)?.layer || null;
    highlight(layer);
    zoomTo(city, layer);
    renderPanel(country, city);
  }

  // Smoothly zoom to a city, or to the selected country.
  // Clicking the country or city you're already zoomed in on zooms back out to the whole world.
  function toggle(target, selectIt) {
    if (zoomedTo === target) {
      zoomedTo = null;
      map.flyTo(WORLD_VIEW.center, WORLD_VIEW.zoom, { duration: 1 });
    } else {
      selectIt();
    }
  }

  // Clicking the ocean (anywhere that isn't a country or city) resets the page to how it first loaded.
  // Dragging the map doesn't count as a click, so panning around is unaffected.
  map.on('click', resetView);

  function resetView() {
    highlight(null);
    current = null;
    zoomedTo = null;
    panel.innerHTML = emptyPanel;
    searchInput.value = '';
    Clinics.setVaccineOptions(Object.keys(VACCINES).filter((k) => k !== 'routine'));
    map.flyTo(WORLD_VIEW.center, WORLD_VIEW.zoom, { duration: 1 });
  }

  // If the user zooms all the way out themselves, the next click on that country should zoom in again.
  map.on('zoomend', () => { if (map.getZoom() <= WORLD_VIEW.zoom) zoomedTo = null; });

  function zoomTo(city, layer) {
    zoomedTo = city || layer;
    if (city) map.flyTo(city.ll, 6, { duration: 1 });
    else if (layer) map.flyToBounds(mainBounds(layer), { padding: [30, 30], maxZoom: 6, duration: 1 });
  }

  // Some countries include far-away territories (France -> French Guiana, USA -> Hawaii),
  // so zoom to the country's biggest piece instead of a box around all of them.
  function mainBounds(layer) {
    const geometry = layer.feature.geometry;
    if (geometry.type !== 'MultiPolygon') return layer.getBounds();
    const pieces = geometry.coordinates.map((polygon) => L.latLngBounds(polygon[0].map(([lng, lat]) => [lat, lng])));
    const size = (b) => (b.getNorth() - b.getSouth()) * (b.getEast() - b.getWest());
    return pieces.reduce((biggest, b) => (size(b) > size(biggest) ? b : biggest));
  }

  const STATUS_CHIP = {
    covered: '<span class="chip ok">✓ Protected</span>',
    booster: '<span class="chip warn">Booster due</span>',
    incomplete: '<span class="chip warn">Course incomplete</span>',
    check: '<span class="chip warn">Check record</span>',
  };

  function vaxItem(key, a, group, extra = {}) {
    const v = VACCINES[key];
    const status = extra.status;
    const note = a.notes[key] ? `<p><strong>${a.notes[key]}</strong></p>` : '';
    const why = extra.reasons?.length ? `<p class="why">Recommended for you because of: ${extra.reasons.join(', ')}.</p>` : '';
    const mine = status ? `<p class="mine ${status.state}">${status.text}</p>` : '';
    const find = key === 'routine' || status?.state === 'covered'
      ? '' : `<button class="find" data-vax="${key}">Find clinics offering this near me</button>`;
    return `<div class="vax ${group}"><details><summary><span>${v.name}${extra.reasons?.length ? ' <span class="chip you">For you</span>' : ''}</span>
      ${status ? STATUS_CHIP[status.state] : ''}</summary>
      <div class="body">${mine}${why}${note}<p>${v.info}</p>${find}</div></details></div>`;
  }

  function vaccinesHtml(a, me) {
    if (!me) {
      const someHtml = a.some.length
        ? `<p class="vax-group">Consider for some travellers</p>${a.some.map((k) => vaxItem(k, a, 'some')).join('')}`
        : '';
      return `<p class="vax-group">Recommended for most travellers</p>
        ${a.most.map((k) => vaxItem(k, a, 'most')).join('')}
        ${someHtml}
        <p class="small">"Some travellers" depends on your activities, length of stay and medical history.
          <a href="#profile" class="edit-profile">Add your details</a> for personalised advice.</p>`;
    }
    const covered = new Set(me.covered.map((v) => v.key));
    const item = (group) => (v) => vaxItem(v.key, a, group, { reasons: v.reasons, status: me.statuses[v.key] });
    const rec = me.recommended.filter((v) => !covered.has(v.key));
    const con = me.consider.filter((v) => !covered.has(v.key));
    return `
      ${rec.length ? `<p class="vax-group">Recommended for you</p>${rec.map(item('most')).join('')}` : '<p>You appear to be protected against everything recommended. 🎉</p>'}
      ${con.length ? `<p class="vax-group">Consider (ask your clinic)</p>${con.map(item('some')).join('')}` : ''}
      ${me.covered.length ? `<p class="vax-group">Already protected</p>${me.covered.map(item('done')).join('')}` : ''}
      <p class="small">Based on ${me.summary || 'your details'}. <a href="#profile" class="edit-profile">Edit</a></p>`;
  }

  function alertsHtml(me) {
    if (!me || !me.alerts.length) return '';
    return `<details open class="personal">
        <summary>👤 Your personal notes (${me.alerts.length})</summary>
        <div class="body">${me.alerts.map((x) => `<p class="alert ${x.level}">${x.text}</p>`).join('')}</div>
      </details>`;
  }

  let current = null;
  Profile.onChange(() => current && renderPanel(current.country, current.city, true));

  function renderPanel(country, city, keepScroll) {
    current = { country, city };
    const a = buildAdvice(country, city);
    const me = Profile.personalise(country, a);
    const badges = [];
    if (me) badges.push('<span class="badge you">Personalised</span>');
    if (a.yf === 'most') badges.push('<span class="badge danger">Yellow fever vaccine recommended</span>');
    else if (a.yf === 'some') badges.push('<span class="badge warn">Yellow fever: some areas</span>');
    else if (a.yf === 'cert') badges.push('<span class="badge">Yellow fever certificate may be required</span>');
    if (a.malaria === 'high') badges.push('<span class="badge danger">High malaria risk</span>');
    else if (a.malaria === 'some') badges.push('<span class="badge warn">Malaria in some areas</span>');
    else badges.push('<span class="badge ok">No malaria risk</span>');
    const vaxCount = me ? me.recommended.length + me.consider.length - me.covered.length : a.most.length + a.some.length;
    const scroll = panel.scrollTop;

    panel.innerHTML = `
      <h2>${a.title}</h2>
      <p class="region">${a.region}</p>
      <div class="badges">${badges.join('')}</div>
      ${alertsHtml(me)}

      <details open>
        <summary>💉 Vaccines (${vaxCount}${me ? ' to discuss' : ''})</summary>
        <div class="body">${vaccinesHtml(a, me)}</div>
      </details>

      <details>
        <summary>🩺 Health advice</summary>
        <div class="body"><ul>${a.health.map((h) => `<li>${h}</li>`).join('')}</ul>
          <p class="small"><a href="https://travelhealthpro.org.uk/countries" target="_blank" rel="noopener">Full country guide on TravelHealthPro ↗</a></p></div>
      </details>

      <details>
        <summary>✈️ Travel advice</summary>
        <div class="body"><ul>${a.travel.map((t) => `<li>${t}</li>`).join('')}</ul>
          <p class="small"><a href="${a.fcdoUrl}" target="_blank" rel="noopener">Latest FCDO travel advice for ${country.name} ↗</a></p></div>
      </details>

      <details id="news-section">
        <summary>📰 Latest news <span class="chip you">AI</span></summary>
        <div class="body" id="news-body"></div>
      </details>

      <button class="btn" id="find-all">Find travel clinics near me</button>`;

    const destVax = [...a.most, ...a.some].filter((k) => k !== 'routine');
    Clinics.setVaccineOptions(destVax);
    panel.querySelectorAll('.find').forEach((b) => b.addEventListener('click', () => Clinics.focusVaccine(b.dataset.vax, destVax)));
    News.attach(panel.querySelector('#news-section'), panel.querySelector('#news-body'), country);
    panel.querySelector('#find-all').addEventListener('click', () => Clinics.focusVaccine('', destVax));
    panel.querySelectorAll('.edit-profile').forEach((l) => l.addEventListener('click', (e) => {
      e.preventDefault();
      document.getElementById('profile').open = true;
      document.getElementById('profile').scrollIntoView({ behavior: 'smooth' });
    }));
    panel.scrollTop = keepScroll ? scroll : 0;
  }
})();
