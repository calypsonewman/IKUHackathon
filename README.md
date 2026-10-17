# IKUHackathon
App extension for NHS app to track vaccination advice and travel advice.

## Travel Health Map

An interactive world map. Click a country (or a city marker) to see dropdowns for:
- **Vaccines** – recommended for most travellers / consider for some travellers, with details
- **Health advice** – malaria, mosquito-borne disease, altitude, food & water, etc.
- **Travel advice** – emergency numbers, entry notes, link to FCDO advice

Below the map, **Vaccination clinics near you** uses your current location (or a postcode) to show clinics on Google Maps, filtered by the vaccine you pick.

### Run it

No build step and nothing to install. Start the app server (it serves the site and the AI news API):

```bash
cp server/.env.example server/.env   # then add your GEMINI_API_KEY
python3 server/app.py
# open http://localhost:8000
```

### Google Maps API key (optional)

Without a key, the clinics section uses a keyless Google Maps embed plus a link to full results.
For a clickable clinic list with markers and distances:

1. `cp config.example.js config.js` (config.js is git-ignored)
2. Add a key with **Maps JavaScript API** and **Places API (New)** enabled.

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
