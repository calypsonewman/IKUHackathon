// NHS record connector (DEMO).
//
// Our server (/api/nhs-record) calls the real NHS Immunisation FHIR API *sandbox*, adds a clearly labelled
// sample record in the same official FHIR format (the sandbox only ever returns one RSV record), and converts
// both into this app's vaccine keys: { patient, vaccines: { key: { status, date, doses, origin } }, other, sandbox }.
//
// Going live means NHS login (so the user proves who they are) plus NHS onboarding for the Immunisation FHIR API.
// Only the server changes; this file and the rest of the app stay the same.
const NhsRecord = (() => {
  async function fetchRecord() {
    const res = await fetch('/api/nhs-record');
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Server error ${res.status}`);
    return data;
  }

  return { fetchRecord, isDemo: true };
})();
