// NHS record connector.
//
// DEMO ONLY: real access needs NHS login (OpenID Connect) plus onboarding to an NHS API such as the
// Immunisation History FHIR API or GP Connect. Those need registered client credentials and a backend
// to hold secrets, so this module returns a sample record with the same shape a real connector would.
// To go live, replace `fetchRecord()` with: NHS login redirect -> backend token exchange ->
// FHIR Immunization + Condition queries -> map through `fromFhir()`.
const NhsRecord = (() => {
  // SNOMED-style vaccine product hints -> our vaccine keys (used by fromFhir).
  const CODE_MAP = {
    hepatitisA: 'hepA', hepatitisB: 'hepB', typhoid: 'typhoid', rabies: 'rabies',
    japaneseEncephalitis: 'je', tickBorneEncephalitis: 'tbe', yellowFever: 'yf',
    cholera: 'cholera', menACWY: 'menacwy', tdIPV: 'routine',
  };

  // Sample FHIR-like bundle for a fictional patient.
  const DEMO_BUNDLE = {
    patient: { name: 'Demo Patient', nhsNumber: '999 000 0000' },
    immunizations: [
      { vaccine: 'tdIPV', date: '2014-09', doseNumber: 5, seriesDoses: 5 },
      { vaccine: 'hepatitisA', date: '2019-04', doseNumber: 1, seriesDoses: 2 },
      { vaccine: 'hepatitisA', date: '2020-02', doseNumber: 2, seriesDoses: 2 },
      { vaccine: 'typhoid', date: '2021-03', doseNumber: 1, seriesDoses: 1 },
      { vaccine: 'hepatitisB', date: '2021-03', doseNumber: 2, seriesDoses: 3 },
      { vaccine: 'menACWY', date: '2016-10', doseNumber: 1, seriesDoses: 1 },
    ],
    conditions: ['asthma'],
  };

  // Collapse immunization events into { key: { status: 'complete'|'partial', date } } using the latest dose.
  function fromFhir(bundle) {
    const vaccines = {};
    bundle.immunizations.forEach((imm) => {
      const key = CODE_MAP[imm.vaccine];
      if (!key) return;
      const prev = vaccines[key];
      if (prev && prev.date > imm.date) return;
      vaccines[key] = { status: imm.doseNumber >= imm.seriesDoses ? 'complete' : 'partial', date: imm.date, source: 'nhs' };
    });
    return { patient: bundle.patient, vaccines, conditions: bundle.conditions };
  }

  async function fetchRecord() {
    await new Promise((r) => setTimeout(r, 900)); // simulate the network round trip
    return fromFhir(DEMO_BUNDLE);
  }

  return { fetchRecord, isDemo: true };
})();
