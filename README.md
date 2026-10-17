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

### Data

Advice lives in `js/data.js`, grouped by regional profile with per-country overrides. It is general guidance summarised from NaTHNaC/TravelHealthPro, NHS fitfortravel and FCDO. It is not medical advice.

### Personalised advice (optional)

The **Your trip & health** card at the top takes departure date, length of stay, activities, medical conditions and vaccination history. The destination panel then shows:
- vaccines **recommended for you** (with the reason), ones to **consider**, and ones you're **already protected** against or need a **booster** for
- personal notes (timing before departure, pregnancy, weakened immune system, altitude, long-term conditions)

Details are kept in `sessionStorage` only (cleared when the tab closes).

**NHS record linking is a demo.** `js/nhs.js` returns a sample record. A real integration needs NHS login (OpenID Connect) and onboarding to an NHS API (e.g. Immunisation History FHIR API / GP Connect), with a backend to hold client credentials. Swap `fetchRecord()` for that flow; the rest of the app already consumes the mapped result.

### Latest news (Gemini)

Each destination has a **📰 Latest news** dropdown. When opened, `server/app.py` (`/api/news`) collects recent travel-relevant news and Gemini turns it into short items (category, severity, date, summary) with links to the original articles. Results are cached per country for 12 hours in `server/cache/`.

- `NEWS_MODE=auto` tries Gemini's Google Search grounding first; if the key has no grounding quota it falls back to Google News RSS headlines summarised by Gemini (works on the free tier).
- The API key stays on the server; the browser never sees it. The server refuses to serve `server/` and dotfiles.
- News is shown separately and labelled as an AI summary; it never changes the vaccine advice.
- Later: replace the file cache (`NewsCache`) with Tiger Cloud.
