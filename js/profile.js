// Optional traveller profile: trip details, medical conditions and vaccination history.
// Kept in sessionStorage only (cleared when the tab closes); nothing is sent to a server.
const Profile = (() => {
  const STORAGE_KEY = 'thm-profile';

  const DURATIONS = {
    '': 'Not sure',
    short: 'Less than 1 week',
    weeks: '1–4 weeks',
    months: '1–6 months',
    long: 'More than 6 months',
  };

  const ACTIVITIES = {
    rural: 'Rural travel or backpacking',
    animals: 'Contact with animals, or caving',
    forest: 'Walking or camping in forests',
    altitude: 'Trekking or climbing above 2,500m',
    vfr: 'Visiting friends or relatives',
    health: 'Healthcare or aid work',
    bodily: 'Possible new sexual partners, tattoos, piercings or medical treatment',
    hajj: 'Hajj or Umrah pilgrimage',
  };

  const CONDITIONS = {
    pregnant: 'Pregnant or planning pregnancy',
    immuno: 'Weakened immune system (e.g. chemotherapy, high-dose steroids, HIV)',
    age60: 'Aged 60 or over',
    chronic: 'Long-term condition (e.g. asthma, diabetes, heart or kidney disease)',
    dengue: 'Had dengue fever before',
  };
  const HISTORY_LABELS = { routine: 'Diphtheria, tetanus & polio' };
  // How long a completed course is assumed to protect, in years (simplified UK guidance).
  const VALIDITY_YEARS = { routine: 10, mmr: Infinity, hepA: 25, hepB: Infinity, typhoid: 3, rabies: Infinity, je: 1, tbe: 3, yf: Infinity, cholera: 2, menacwy: 5 };
  const NHS_APP_HELP = 'https://www.nhs.uk/nhs-app/help/vaccinations/view-vaccinations/';
  const SINGLE_DOSE = new Set(['typhoid', 'yf', 'menacwy']);

  // Which activities make a "some travellers" vaccine recommended for this person.
  const LONG = 'long-stay';
  const TRIGGERS = {
    hepA: ['rural', 'vfr', LONG],
    typhoid: ['rural', 'vfr', LONG],
    hepB: ['health', 'bodily', LONG],
    rabies: ['animals', 'rural', LONG],
    je: ['rural', LONG],
    tbe: ['forest'],
    cholera: ['health'],
    menacwy: ['hajj', 'vfr', LONG],
    yf: ['rural', 'forest', LONG],
  };
  const TRIGGER_TEXT = {
    rural: 'rural travel', vfr: 'visiting friends & relatives', [LONG]: 'staying a month or more',
    animals: 'animal contact', health: 'healthcare/aid work', bodily: 'possible blood or body-fluid exposure',
    forest: 'forest walking/camping', hajj: 'Hajj/Umrah',
  };
  const ZIKA_DENGUE_PROFILES = new Set(['centralAm', 'caribbean', 'southAmT', 'seAsia', 'southAsia', 'pacific', 'ssa']);

  let state = load();
  const listeners = [];

  function blank() {
    return { departure: '', duration: '', activities: [], conditions: [], vaccines: {}, nhs: null };
  }

  function load() {
    try { return { ...blank(), ...JSON.parse(sessionStorage.getItem(STORAGE_KEY)) }; } catch { return blank(); }
  }

  function save() {
    try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* storage unavailable */ }
    renderSummary();
    listeners.forEach((fn) => fn());
  }

  function isEmpty() {
    return !state.departure && !state.duration && !state.activities.length &&
      !state.conditions.length && !Object.keys(state.vaccines).length;
  }

  // ---------- Form ----------

  function checkboxes(name, options, selected) {
    return Object.entries(options).map(([k, label]) => `
      <label class="check"><input type="checkbox" name="${name}" value="${k}" ${selected.includes(k) ? 'checked' : ''}/> ${label}</label>`).join('');
  }

  function historyRows() {
    return Object.keys(VACCINES).map((k) => {
      const rec = state.vaccines[k] || { status: '', date: '' };
      const fromNhs = rec.source === 'nhs' ? `<span class="nhs-tag" title="From your NHS record (${rec.origin || 'NHS'})">NHS</span>` : '';
      return `<tr data-vax="${k}">
        <th scope="row">${HISTORY_LABELS[k] || VACCINES[k].name} ${fromNhs}</th>
        <td><select aria-label="${VACCINES[k].name} status">
          <option value="">Not had / don't know</option>
          <option value="partial" ${rec.status === 'partial' ? 'selected' : ''}>Started course</option>
          <option value="complete" ${rec.status === 'complete' ? 'selected' : ''}>${SINGLE_DOSE.has(k) ? 'Had it' : 'Full course'}</option>
        </select></td>
        <td><input type="month" aria-label="${VACCINES[k].name} last dose" value="${rec.date || ''}" /></td>
      </tr>`;
    }).join('');
  }

  function renderForm() {
    const body = document.getElementById('profile-body');
    body.innerHTML = `
      <div class="profile-grid">
        <fieldset>
          <legend>Your trip</legend>
          <label class="field">Departure date <input type="date" id="pf-departure" value="${state.departure}" /></label>
          <label class="field">Length of stay
            <select id="pf-duration">${Object.entries(DURATIONS).map(([k, v]) =>
              `<option value="${k}" ${state.duration === k ? 'selected' : ''}>${v}</option>`).join('')}</select>
          </label>
          <p class="field-label">Activities</p>
          ${checkboxes('activity', ACTIVITIES, state.activities)}
        </fieldset>

        <fieldset>
          <legend>Your health</legend>
          <div class="nhs-box" id="nhs-box"></div>
          <p class="field-label">Medical conditions</p>
          ${checkboxes('condition', CONDITIONS, state.conditions)}
          <details class="history">
            <summary>Vaccination history (${Object.keys(state.vaccines).length} recorded)</summary>
            <div class="table-wrap"><table>
              <thead><tr><th>Vaccine</th><th>Status</th><th>Last dose</th></tr></thead>
              <tbody>${historyRows()}</tbody>
            </table></div>
          </details>
        </fieldset>
      </div>
      <div class="profile-actions">
        <p class="small">Saved only in this browser tab and cleared when you close it. Nothing is sent to a server.</p>
        <button type="button" class="btn btn-secondary" id="pf-clear">Clear my details</button>
      </div>`;

    body.querySelector('#pf-departure').addEventListener('change', (e) => { state.departure = e.target.value; save(); });
    body.querySelector('#pf-duration').addEventListener('change', (e) => { state.duration = e.target.value; save(); });
    body.querySelectorAll('input[name=activity]').forEach((el) => el.addEventListener('change', () => {
      state.activities = [...body.querySelectorAll('input[name=activity]:checked')].map((x) => x.value); save();
    }));
    body.querySelectorAll('input[name=condition]').forEach((el) => el.addEventListener('change', () => {
      state.conditions = [...body.querySelectorAll('input[name=condition]:checked')].map((x) => x.value); save();
    }));
    body.querySelectorAll('tr[data-vax]').forEach((row) => {
      const update = () => {
        const status = row.querySelector('select').value;
        const date = row.querySelector('input').value;
        if (!status && !date) delete state.vaccines[row.dataset.vax];
        else state.vaccines[row.dataset.vax] = { status: status || 'complete', date };
        row.querySelector('.nhs-tag')?.remove(); // edited by hand now
        save();
      };
      row.querySelector('select').addEventListener('change', update);
      row.querySelector('input').addEventListener('change', update);
    });
    body.querySelector('#pf-clear').addEventListener('click', () => { state = blank(); save(); renderForm(); });
    renderNhsBox();
  }

  function renderNhsBox(mode) {
    const box = document.getElementById('nhs-box');
    if (state.nhs) {
      const imported = Object.entries(state.vaccines).filter(([, v]) => v.source === 'nhs');
      const fmt = (ym) => (ym ? fmtMonth(ym) : 'date unknown');
      const sandbox = state.nhs.sandbox === 'connected'
        ? '✓ Connected to the NHS Immunisation API (sandbox test environment).'
        : `NHS Immunisation API sandbox ${state.nhs.sandbox}. Showing the sample record only.`;
      box.innerHTML = `<p><strong>✓ NHS record linked</strong> (${state.nhs.patient.name})${NhsRecord.isDemo ? ' <span class="demo-tag">DEMO DATA</span>' : ''}</p>
        <ul class="nhs-imported">${imported.map(([k, v]) => `<li>${HISTORY_LABELS[k] || VACCINES[k].name}:
          ${v.doses ? `${v.doses} dose${v.doses === 1 ? '' : 's'}, ` : ''}last ${fmt(v.date)} <span class="small">(${v.origin || 'NHS'})</span></li>`).join('')}</ul>
        ${state.nhs.other?.length ? `<p class="small">Also on this record: ${state.nhs.other.map((o) =>
          `${o.name} (${fmt(o.date)}, ${o.origin})`).join('; ')}.</p>` : ''}
        <p class="small">${sandbox} Imported vaccinations are in the history below and you can edit them.</p>
        <p class="small">About this data: the NHS lists diphtheria, tetanus &amp; polio, MMR and MenACWY as <em>in development</em>
          for its Immunisation API, and older childhood vaccinations may not be included. Your full history is held in your
          GP record (see the NHS App: Vaccinations, then Your vaccinations). Travel vaccines are not covered, so add those yourself.</p>
        <button type="button" class="link-btn" id="nhs-unlink">Unlink NHS record</button>`;
      box.querySelector('#nhs-unlink').addEventListener('click', unlinkNhs);
      return;
    }
    if (mode === 'consent') {
      box.innerHTML = `<p><strong>Share your NHS record with this app?</strong></p>
        <p class="small">We will read your <strong>vaccination history</strong> to personalise your advice.
        This stays in this browser tab only.</p>
        ${NhsRecord.isDemo ? `<p class="small demo-note">Prototype: this calls the NHS Immunisation API's <strong>sandbox</strong>
          (test environment) and adds a <strong>sample record</strong> for a fictional patient. Real NHS login is not connected yet.</p>` : ''}
        <div class="row"><button type="button" class="btn" id="nhs-agree">Agree and link</button>
        <button type="button" class="link-btn" id="nhs-cancel">Cancel</button></div>`;
      box.querySelector('#nhs-agree').addEventListener('click', linkNhs);
      box.querySelector('#nhs-cancel').addEventListener('click', () => renderNhsBox());
      return;
    }
    if (mode === 'loading') { box.innerHTML = '<p>Connecting to your NHS record…</p>'; return; }
    box.innerHTML = `<p><strong>Link your NHS record</strong> to see how the app can check your routine UK vaccines
      (diphtheria, tetanus &amp; polio, MMR and MenACWY) for you.</p>
      <p class="small">The NHS Immunisation API is still adding these vaccine types, so this is a demo for now.</p>
      <button type="button" class="btn btn-secondary" id="nhs-link">Link NHS record${NhsRecord.isDemo ? ' (demo)' : ''}</button>
      <p class="small">Or fill in your details below. You can see your own vaccination record in the NHS App:
        select <strong>Vaccinations</strong>, then <strong>Your vaccinations</strong>
        (<a href="${NHS_APP_HELP}" target="_blank" rel="noopener">how to find it ↗</a>).
        It depends on your GP surgery, and vaccines given privately may not show.</p>`;
    box.querySelector('#nhs-link').addEventListener('click', () => renderNhsBox('consent'));
  }

  async function linkNhs() {
    renderNhsBox('loading');
    try {
      const rec = await NhsRecord.fetchRecord();
      state.nhs = { patient: rec.patient, other: rec.other || [], sandbox: rec.sandbox };
      Object.entries(rec.vaccines).forEach(([k, v]) => { if (VACCINES[k]) state.vaccines[k] = v; });
      save();
      renderForm();
      document.querySelector('#profile-body details.history').open = true;
    } catch (err) {
      console.error(err);
      renderNhsBox();
      document.getElementById('nhs-box').insertAdjacentHTML('afterbegin', '<p class="error">Could not link your NHS record. Please try again.</p>');
    }
  }

  function unlinkNhs() {
    Object.keys(state.vaccines).forEach((k) => { if (state.vaccines[k].source === 'nhs') delete state.vaccines[k]; });
    state.nhs = null;
    save();
    renderForm();
  }

  function renderSummary() {
    const el = document.getElementById('profile-summary');
    if (isEmpty()) { el.textContent = 'Optional: add your trip and health details for personalised advice'; return; }
    const bits = [];
    if (state.duration) bits.push(DURATIONS[state.duration]);
    if (state.activities.length) bits.push(`${state.activities.length} activit${state.activities.length === 1 ? 'y' : 'ies'}`);
    if (state.conditions.length) bits.push(`${state.conditions.length} condition${state.conditions.length === 1 ? '' : 's'}`);
    if (Object.keys(state.vaccines).length) bits.push(`${Object.keys(state.vaccines).length} vaccines recorded`);
    if (state.nhs) bits.push('NHS record linked');
    el.textContent = `Personalised: ${bits.join(' · ')}`;
  }

  // ---------- Personalisation ----------

  const fmtMonth = (ym) => new Date(ym + '-01').toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });

  // "Routine UK vaccines" covers two separate records: diphtheria/tetanus/polio and MMR.
  // Show both, and flag the routine item with the worst of the two so nothing is wrongly shown as covered.
  function vaccineStatus(key, refDate) {
    return key === 'routine' ? routineStatus(refDate) : singleStatus(key, refDate);
  }

  function routineStatus(refDate) {
    const parts = [['Diphtheria, tetanus &amp; polio', singleStatus('routine', refDate)], ['MMR', singleStatus('mmr', refDate)]];
    if (parts.every(([, s]) => !s)) return null;
    const states = parts.map(([, s]) => (s ? s.state : 'check'));
    const state = ['booster', 'incomplete', 'check'].find((s) => states.includes(s)) || 'covered';
    const text = parts.map(([name, s]) => `<strong>${name}:</strong> ${s ? s.text : 'not recorded. Check your NHS App or ask your GP.'}`).join('<br>');
    return { state, text };
  }

  function singleStatus(key, refDate) {
    const rec = state.vaccines[key];
    if (!rec || !rec.status) return null;
    const when = rec.date ? ` (last dose ${fmtMonth(rec.date)})` : '';
    if (rec.status === 'partial' && !SINGLE_DOSE.has(key)) {
      const partialText = {
        hepA: `One dose given${when}. A booster gives long-term protection.`,
        mmr: `One dose recorded${when}. A second dose is free from your GP and gives lifelong protection.`,
      };
      return { state: 'incomplete', text: partialText[key] || `Course started${when}. You may need to finish it.` };
    }
    if (!rec.date) return { state: 'covered', text: 'Recorded as complete. Check the date with your clinic.' };
    const years = (refDate - new Date(rec.date + '-01')) / (365.25 * 864e5);
    if (years <= VALIDITY_YEARS[key]) {
      const extra = key === 'rabies' ? ' You still need urgent treatment after any bite.' : '';
      return { state: 'covered', text: `Protected${when}.${extra}` };
    }
    const text = key === 'routine'
      ? `Last dose over 10 years ago${when}. A booster may be advised if medical care is limited where you're going.`
      : `Booster may be due${when}.`;
    return { state: 'booster', text };
  }

  // Returns null when the user hasn't entered anything, so the generic view is shown.
  function personalise(country, advice) {
    if (isEmpty()) return null;
    const today = new Date(new Date().toDateString());
    const departure = state.departure ? new Date(state.departure) : null;
    const refDate = departure && departure > today ? departure : today;
    const acts = new Set(state.activities);
    if (state.duration === 'months' || state.duration === 'long') acts.add(LONG);
    const conds = new Set(state.conditions);

    const recommended = advice.most.map((key) => ({ key, reasons: [] }));
    const consider = [];
    advice.some.forEach((key) => {
      const hits = (TRIGGERS[key] || []).filter((t) => acts.has(t));
      if (key === 'menacwy' && !acts.has('hajj') && country.profile !== 'ssa') hits.length = 0;
      if (hits.length) recommended.push({ key, reasons: hits.map((t) => TRIGGER_TEXT[t]) });
      else consider.push({ key, reasons: [] });
    });

    const statuses = {};
    [...recommended, ...consider].forEach(({ key }) => { statuses[key] = vaccineStatus(key, refDate); });
    const isCovered = (v) => statuses[v.key]?.state === 'covered';
    const covered = [...recommended, ...consider].filter(isCovered);
    const needed = recommended.filter((v) => !isCovered(v));

    // Personal alerts
    const alerts = [];
    const neededKeys = new Set(needed.map((v) => v.key));
    const yfInPlay = [...recommended, ...consider].some((v) => v.key === 'yf') || advice.yf === 'cert';
    const zikaArea = ZIKA_DENGUE_PROFILES.has(country.profile);

    if (departure) {
      const days = Math.round((departure - today) / 864e5);
      if (days < 0) {
        alerts.push({ level: 'info', text: 'Your departure date is in the past. Update it to get timing advice.' });
      } else if (days <= 14 && needed.length) {
        alerts.push({ level: 'danger', text: `You leave in ${days} day${days === 1 ? '' : 's'}. Some vaccine courses take 1–4 weeks, but faster schedules may be possible. Book a travel appointment now.` });
      } else if (days > 56 && needed.length) {
        const book = new Date(departure - 56 * 864e5).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' });
        alerts.push({ level: 'info', text: `Aim to book a travel health appointment around ${book} (6–8 weeks before you go).` });
      } else if (needed.length) {
        alerts.push({ level: 'warn', text: `You leave in ${days} days. Book a travel health appointment soon.` });
      }
      if (neededKeys.has('yf') && days >= 0 && days < 10) {
        alerts.push({ level: 'danger', text: 'A yellow fever certificate only becomes valid 10 days after vaccination. Get advice on entry requirements.' });
      }
    }
    if (conds.has('pregnant')) {
      if (yfInPlay) alerts.push({ level: 'danger', text: 'Yellow fever is a live vaccine and is not usually given in pregnancy. You need specialist advice, and you may need an exemption letter.' });
      if (zikaArea) alerts.push({ level: 'danger', text: 'Zika can harm an unborn baby. Pregnant travellers are advised to postpone non-essential travel to areas with Zika risk.' });
      if (advice.malaria !== 'none') alerts.push({ level: 'danger', text: 'Malaria is more dangerous in pregnancy and some antimalarials are not suitable. Consider whether travel is essential.' });
      alerts.push({ level: 'warn', text: 'Some vaccines are not suitable in pregnancy. Tell your nurse or pharmacist that you are pregnant or planning pregnancy.' });
    }
    if (conds.has('immuno')) {
      alerts.push({ level: 'danger', text: 'Live vaccines (yellow fever, oral typhoid, MMR) may not be safe with a weakened immune system. Speak to your specialist before travel.' });
    }
    if (conds.has('age60') && neededKeys.has('yf') && !state.vaccines.yf) {
      alerts.push({ level: 'warn', text: 'Serious side effects from a first yellow fever vaccine are more common in people aged 60 and over. Discuss the risks with a travel clinic.' });
    }
    if (conds.has('dengue') && zikaArea) {
      alerts.push({ level: 'warn', text: 'A second dengue infection can be more severe. As you have had dengue before, ask whether the dengue vaccine (Qdenga) is suitable for you.' });
    }
    if (conds.has('chronic')) {
      alerts.push({ level: 'info', text: 'Take enough medicine for your whole trip plus extra, in your hand luggage, with a GP letter. Make sure your travel insurance covers your condition.' });
    }
    if (acts.has('altitude')) {
      alerts.push({ level: 'warn', text: 'Altitude: above 2,500m, sleep no more than 300–500m higher each night and know the signs of altitude sickness. Ask whether acetazolamide is right for you.' });
    }
    if (acts.has(LONG) && advice.malaria !== 'none') {
      alerts.push({ level: 'info', text: 'For long stays in malaria areas, discuss long-term antimalarial options and how to get medical care locally.' });
    }

    return { recommended, consider, covered, statuses, alerts, summary: summaryText() };
  }

  function summaryText() {
    const bits = [];
    if (state.duration) bits.push(DURATIONS[state.duration].toLowerCase());
    state.activities.forEach((a) => bits.push(ACTIVITIES[a].toLowerCase()));
    if (state.nhs) bits.push('NHS record');
    else if (Object.keys(state.vaccines).length) bits.push('your vaccination history');
    return bits.join(', ');
  }

  function init() {
    renderForm();
    renderSummary();
  }

  return { init, personalise, onChange: (fn) => listeners.push(fn) };
})();
