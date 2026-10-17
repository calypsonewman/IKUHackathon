"""Travel Health Map server.

Serves the static app and a /api/news endpoint that asks Gemini (with Google Search grounding)
for recent travel-relevant news about a country. Results are cached on disk per country.
Standard library only, so it runs with `python3 server/app.py` and nothing to install.

Later: swap the file cache in `NewsCache` for Tiger Cloud (Postgres/TimescaleDB).
"""
import json
import os
import re
import threading
import time
import urllib.error
import urllib.request
import xml.etree.ElementTree as ET
from email.utils import parsedate_to_datetime
from datetime import date
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, quote_plus, urlparse

ROOT = Path(__file__).resolve().parent.parent
SERVER_DIR = ROOT / "server"
CACHE_DIR = SERVER_DIR / "cache"
CACHE_TTL_SECONDS = 12 * 60 * 60
CATEGORIES = {"outbreak", "safety", "entry", "weather", "other"}


def load_env(path):
    if not path.exists():
        return
    for line in path.read_text().splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            key, value = line.split("=", 1)
            os.environ.setdefault(key.strip(), value.strip())


load_env(SERVER_DIR / ".env")
API_KEY = os.environ.get("GEMINI_API_KEY", "")
MODEL = os.environ.get("GEMINI_MODEL", "gemini-3.8-flash")
PORT = int(os.environ.get("PORT", "8000"))
# auto = try Google Search grounding, fall back to Google News RSS + Gemini summary
NEWS_MODE = os.environ.get("NEWS_MODE", "auto")
grounding_blocked_until = 0.0


class GeminiError(Exception):
    def __init__(self, message, status=None):
        super().__init__(message)
        self.status = status


PROMPT = """Today is {today}. Search recent local and international news (last 14 days) about {country}
that matters to UK travellers: disease outbreaks, natural disasters or severe weather, unrest or
security incidents, strikes or transport disruption, and changes to entry rules.

Respond with JSON only (no markdown), in this exact shape:
[{{"category": "outbreak|safety|entry|weather|other", "severity": 1, "headline": "...",
   "summary": "...", "event_date": "YYYY-MM-DD"}}]
- severity: 1 = minor/background, 2 = notable, 3 = serious/urgent
- summary: at most 2 short factual sentences, no medical advice
- at most 6 items, most important first
- return [] if there is nothing significant. Never invent events."""


def call_gemini(body):
    if not API_KEY:
        raise GeminiError("GEMINI_API_KEY is not set in server/.env")
    req = urllib.request.Request(
        f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent",
        data=json.dumps(body).encode(),
        headers={"Content-Type": "application/json", "x-goog-api-key": API_KEY},
    )
    try:
        with urllib.request.urlopen(req, timeout=90) as resp:
            data = json.load(resp)
    except urllib.error.HTTPError as err:
        try:
            message = json.load(err)["error"]["message"]
        except Exception:
            message = str(err)
        raise GeminiError(f"Gemini API error {err.code}: {message}", err.code)
    except urllib.error.URLError as err:
        raise GeminiError(f"Could not reach Gemini: {err.reason}")
    candidate = (data.get("candidates") or [{}])[0]
    text = "".join(p.get("text", "") for p in candidate.get("content", {}).get("parts", []))
    return text, candidate


def news_grounded(country):
    """Gemini searches the web itself (needs Search grounding quota)."""
    body = {
        "contents": [{"parts": [{"text": PROMPT.format(today=date.today().isoformat(), country=country)}]}],
        "tools": [{"google_search": {}}],
    }
    text, candidate = call_gemini(body)
    sources = []
    for chunk in candidate.get("groundingMetadata", {}).get("groundingChunks", []):
        web = chunk.get("web") or {}
        source = {"title": web.get("title") or "Source", "uri": web.get("uri", "")}
        if source["uri"].startswith("https://") and source not in sources:
            sources.append(source)
    return parse_items(text), sources[:10], "Google Search grounding"


RSS_TERMS = "(outbreak OR disease OR travel OR tourists OR protest OR unrest OR flood OR earthquake OR storm OR strike OR visa)"


def fetch_headlines(country, limit=25):
    url = ("https://news.google.com/rss/search?q=" + quote_plus(f'"{country}" {RSS_TERMS} when:14d')
           + "&hl=en-GB&gl=GB&ceid=GB:en")
    try:
        with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "TravelHealthMap/1.0"}), timeout=20) as resp:
            root = ET.fromstring(resp.read())
    except Exception as err:
        raise GeminiError(f"Could not fetch news feed: {err}")
    headlines = []
    for item in root.findall(".//item"):
        try:
            published = parsedate_to_datetime(item.findtext("pubDate"))
        except Exception:
            continue
        link = item.findtext("link") or ""
        if link.startswith("https://"):
            headlines.append({"title": item.findtext("title") or "", "source": item.findtext("source") or "",
                              "date": published, "link": link})
    headlines.sort(key=lambda h: h["date"], reverse=True)
    return headlines[:limit]


RSS_PROMPT = """Today is {today}. Below are recent news headlines about {country}, numbered.
Using ONLY these headlines, pick the ones that matter to UK travellers (disease outbreaks, natural disasters
or severe weather, unrest or security incidents, strikes or transport disruption, entry-rule changes).
Merge headlines about the same event. Ignore sport, business and politics with no traveller impact.

Return a JSON list (at most 6 items, most important first):
[{{"category": "outbreak|safety|entry|weather|other", "severity": 1, "headline": "...",
   "summary": "...", "event_date": "YYYY-MM-DD", "sources": [1, 4]}}]
- severity: 1 = minor/background, 2 = notable, 3 = serious/urgent
- summary: at most 2 short factual sentences based only on the headlines, no medical advice
- sources: the headline numbers you used
- return [] if nothing is relevant. Never add facts that are not in the headlines.

Headlines:
{headlines}"""


def news_from_rss(country):
    """Free-tier path: real headlines from Google News, summarised by Gemini without web access."""
    headlines = fetch_headlines(country)
    if not headlines:
        return [], [], "Google News"
    listing = "\n".join(f"{i}. [{h['date']:%Y-%m-%d}] {h['title']}" for i, h in enumerate(headlines, 1))
    body = {
        "contents": [{"parts": [{"text": RSS_PROMPT.format(today=date.today().isoformat(), country=country, headlines=listing)}]}],
        "generationConfig": {"responseMimeType": "application/json"},
    }
    text, _ = call_gemini(body)
    items = parse_items(text)
    used = []
    for item in items:
        refs = [headlines[n - 1] for n in item.pop("source_ids", []) if 1 <= n <= len(headlines)]
        item["sources"] = [{"title": h["source"] or "Source", "uri": h["link"]} for h in refs]
        used += [s for s in item["sources"] if s not in used]
    return items, used, "Google News"


def ask_gemini(country):
    global grounding_blocked_until
    if NEWS_MODE == "rss":
        return news_from_rss(country)
    if NEWS_MODE == "auto" and time.time() < grounding_blocked_until:
        return news_from_rss(country)
    try:
        return news_grounded(country)
    except GeminiError as err:
        # 429/403 here usually means Search grounding isn't available on this key's plan.
        if NEWS_MODE == "auto" and err.status in (403, 429):
            grounding_blocked_until = time.time() + 3600
            return news_from_rss(country)
        raise


def parse_items(text):
    """Pull the JSON list out of the model's reply and validate every field."""
    start, end = text.find("["), text.rfind("]")
    if start == -1 or end < start:
        raise GeminiError("Gemini did not return a news list")
    try:
        raw = json.loads(text[start : end + 1])
    except json.JSONDecodeError:
        raise GeminiError("Gemini returned malformed JSON")

    items = []
    for item in raw if isinstance(raw, list) else []:
        if not isinstance(item, dict) or not item.get("headline"):
            continue
        category = str(item.get("category", "other")).lower()
        try:
            severity = min(3, max(1, int(item.get("severity", 1))))
        except (TypeError, ValueError):
            severity = 1
        event_date = str(item.get("event_date", ""))
        items.append({
            "category": category if category in CATEGORIES else "other",
            "severity": severity,
            "headline": str(item["headline"])[:200],
            "summary": str(item.get("summary", ""))[:500],
            "event_date": event_date if re.fullmatch(r"\d{4}-\d{2}-\d{2}", event_date) else "",
            "source_ids": [n for n in item.get("sources", []) if isinstance(n, int)][:5],
        })
    items = items[:6]
    return items


class NewsCache:
    """One JSON file per country. Replace with Tiger Cloud later."""

    def __init__(self):
        CACHE_DIR.mkdir(exist_ok=True)
        self.locks = {}
        self.guard = threading.Lock()

    def lock_for(self, code):
        with self.guard:
            return self.locks.setdefault(code, threading.Lock())

    def get(self, code, country):
        path = CACHE_DIR / f"news-{code}.json"
        with self.lock_for(code):  # one Gemini call per country at a time
            if path.exists() and time.time() - path.stat().st_mtime < CACHE_TTL_SECONDS:
                return json.loads(path.read_text())
            items, sources, method = ask_gemini(country)
            for item in items:
                item.pop("source_ids", None)
            result = {
                "country": country,
                "updated": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                "model": MODEL,
                "method": method,
                "items": items,
                "sources": sources,
            }
            path.write_text(json.dumps(result, indent=2))
            return result


cache = NewsCache()


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def send_json(self, status, payload):
        body = json.dumps(payload).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        url = urlparse(self.path)
        # Never serve the server folder (it holds .env), git data or dotfiles.
        if url.path.startswith(("/server", "/.")) or "/." in url.path:
            return self.send_error(404)
        if url.path == "/api/news":
            return self.news(parse_qs(url.query))
        return super().do_GET()

    def news(self, query):
        code = (query.get("code") or [""])[0]
        country = (query.get("country") or [""])[0].strip()
        if not re.fullmatch(r"[A-Za-z0-9]{1,4}", code) or not re.fullmatch(r"[\w .,'&()\-]{2,60}", country):
            return self.send_json(400, {"error": "Invalid country"})
        try:
            self.send_json(200, cache.get(code, country))
        except GeminiError as err:
            self.log_message("news error for %s: %s", country, err)
            self.send_json(502, {"error": str(err)})


if __name__ == "__main__":
    print(f"Travel Health Map on http://localhost:{PORT}  (Gemini model: {MODEL}, news mode: {NEWS_MODE}, key {'set' if API_KEY else 'MISSING'})")
    ThreadingHTTPServer(("127.0.0.1", PORT), Handler).serve_forever()
