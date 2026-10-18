# IKUHackathon
## JABMAP: Making Health More Accessible 
The project's main idea is to make vaccine information readily available in one space. 

Problem:
When travelling to another country, we require getting some vaccinations or health tests done depending on our health condition and the destination’s health regulations. Searching for these required tests and vaccines can be a tedious task, given that various sources point to different requirements.

This application solves this issue and its features are described under the 'Travel Health Map' sub-title.

## Travel Health Map

An interactive world map. Click a country (or a city marker) to see dropdowns for:
- **Vaccines** – recommended for most travellers / consider for some travellers, with details
- **Health advice** – malaria, mosquito-borne disease, altitude, food & water, etc.
- **Travel advice** – emergency numbers, entry notes, link to FCDO advice

Below the map, **Vaccination clinics near you** uses your current location (or a UK postcode/town) to list NHS-listed pharmacy travel clinics and GP practices, with badges, sort options and a map with matching numbered pins.

### Run it

No build step and nothing to install. Start the app server (it serves the site and the AI news API):

```bash
cp server/.env.example server/.env   # then add your GEMINI_API_KEY and NHS_API_KEY
python3 server/app.py
# open http://localhost:8000  (not index.html directly: news and clinics need the server)
```

### Clinics (NHS Directory of Healthcare Services)

`server/app.py` (`/api/clinics`) asks the NHS Directory of Healthcare Services API (v3) for the nearest pharmacies with a **Travel clinic** service (code `SRV0516`) and the nearest GP practices, and caches each ~1 km area for 24 hours in `server/cache/`.

- Get a free key: create an account on the [NHS England developer hub](https://digital.nhs.uk/developer), add an **Integration test** application, and add the **Service search - REST API (Integration Testing Environment)**. Put the key in `server/.env` as `NHS_API_KEY`.
- The integration environment is a close copy of live NHS data, limited to 1,500 requests/week and 1/second. Going live needs NHS onboarding (set `NHS_API_BASE` to production).
- Postcodes and towns are turned into coordinates with [postcodes.io](https://postcodes.io) (free, no key).
- The NHS data says *whether* a pharmacy runs a travel clinic, not which vaccines it stocks, and does not mark yellow fever centres, so the app links to NaTHNaC's yellow fever centre finder.
- Which vaccines are free at GP practices is set by `nhsFree` in `js/data.js`.

### Google star ratings (optional)

With `GOOGLE_PLACES_API_KEY` in `server/.env`, each clinic search also runs two Google Places (New) Text Searches ("pharmacy" and "pharmacy travel clinic vaccinations", nearest first) and attaches **★ rating (count)** to NHS pharmacies that match by location and name. The badge links to the Google reviews, and there is a **Best rated first** sort.

- Matching: within 120 m and sharing a distinctive name word (or within 25 m), or within 250 m with an identical name. Unmatched clinics simply show no stars; GP practices are not rated.
- Cost control: `GOOGLE_DAILY_LIMIT` (default 30 requests/day, tracked in `server/cache/google-usage.json`) keeps usage under Google's 1,000 free requests a month. When the limit is reached, clinics still load without stars.
- Google ratings are fetched fresh each time (Google's terms don't allow caching them); only NHS data is cached.

### Data

Advice lives in `js/data.js`, grouped by regional profile with per-country overrides. It is general guidance summarised from NaTHNaC/TravelHealthPro and FCDO. It is not medical advice.

### Personalised advice (optional)

The **Your trip & health** card at the top takes departure date, length of stay, activities, medical conditions and vaccination history. The destination panel then shows:
- vaccines **recommended for you** (with the reason), ones to **consider**, and ones you're **already protected** against or need a **booster** for
- personal notes (timing before departure, pregnancy, weakened immune system, altitude, long-term conditions)

Details are kept in `sessionStorage` only (cleared when the tab closes).

**NHS record linking is a demo.** "Link NHS record" calls `server/app.py` (`/api/nhs-record`), which:

- calls the real **NHS Immunisation FHIR API sandbox** (open access, no key) for the sandbox's test patient, for the vaccine types that match this app: diphtheria/tetanus/polio (`3IN1`), `MMR` and `MENACWY`. The NHS lists all three as *in development* for this API (Beta covers RSV, flu and HPV), and doesn't say how far back records go;
- adds `server/sample-nhs-record.json`, a **sample record for a fictional patient** in the same FHIR R4 format, because the sandbox only ever returns one RSV record;
- converts both with the same code (by target-disease SNOMED code, falling back to the disease name) into the profile's vaccine history, counting doses against the UK schedule (5 for diphtheria/tetanus/polio, 2 for MMR, 1 for MenACWY). Anything else on the record is listed separately.

The profile shows which items came from the sandbox and which from the sample. Routine vaccinations are held in each patient's GP record, which patients can see in the NHS App (Vaccinations > Your vaccinations); the GP record itself (GP Connect) is only available to health and care organisations. The Immunisation API does not cover travel vaccines (hepatitis A, typhoid, rabies, yellow fever, etc.), so users add those themselves.

Going live needs NHS login (identity verified to P9) and NHS onboarding for the Immunisation FHIR API, which is currently only open to health and care organisations. Only the server would change: replace the sandbox call and drop the sample file.

### Latest news (Gemini)

Each destination has a **📰 Latest news** dropdown. When opened, `server/app.py` (`/api/news`) collects recent travel-relevant news and Gemini turns it into short items (category, severity, date, summary) with links to the original articles. Results are cached per country for 12 hours in `server/cache/`.

- `NEWS_MODE=auto` tries Gemini's Google Search grounding first; if the key has no grounding quota it falls back to Google News RSS headlines summarised by Gemini (works on the free tier).
- The API key stays on the server; the browser never sees it. The server refuses to serve `server/` and dotfiles.
- News is shown separately and labelled as an AI summary; it never changes the vaccine advice.
- Later: replace the file cache (`NewsCache`) with Tiger Cloud.
