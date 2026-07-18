# FREE FX Rates by Sera.CX — Technical Spec

> Implementation companion to `PLANNING.md`. Concrete schemas, markup, config.
> API/design still TBD — specs are written against a **normalized internal model** so build is unblocked; `api.sera.cx` plugs in via one adapter.

---

## 1. Data model (source-agnostic — this de-risks the API dependency)

We do **not** couple pages to `api.sera.cx`'s shape. We define our own normalized snapshot; an adapter maps whatever the API returns into it. If the source changes, we touch one file.

### 1.1 Canonical snapshot — `data/snapshots/latest.json`
```jsonc
{
  "schema": 1,
  "base": "USD",                     // reference base for storage (all rates relative to this)
  "asOf": "2026-07-18T14:00:00Z",    // source timestamp (UTC, ISO-8601)
  "fetchedAt": "2026-07-18T14:00:03Z",
  "source": "api.sera.cx",
  "rates": {                         // 1 USD = N of each currency
    "EUR": 0.9231,
    "GBP": 0.7842,
    "JPY": 157.21
    // ...
  }
}
```
Cross-rate for any pair A→B is derived: `rate(A,B) = rates[B] / rates[A]` (store one base, derive all pairs — avoids an N² file).

### 1.2 Per-base fanout feed — `public/rates/{base}.json` (public, cacheable)
```jsonc
{ "base": "EUR", "asOf": "...", "rates": { "USD": 1.0833, "GBP": 0.8495, ... } }
```

### 1.3 Historical series — `public/historical/{base}-to-{quote}.json`
```jsonc
{
  "pair": "USD-EUR", "base": "USD", "quote": "EUR",
  "granularity": "daily",
  "series": [ ["2026-07-17", 0.9225], ["2026-07-18", 0.9231] ]  // [date, rate]
}
```
Compact `[date, rate]` tuples keep files small for the charts + agents.

### 1.4 Adapter contract — `scripts/adapters/sera.mjs`
```
export async function fetchRates(env) -> NormalizedSnapshot
```
Must: hit `api.sera.cx`, validate (all rates finite > 0, base present, `asOf` within max-age), throw on malformed so the cron fails loudly rather than committing garbage. **Open Q:** does the API return one base + all quotes, or arbitrary pairs? Does it expose history, or do we accrete our own daily snapshots into the series files over time?

---

## 2. Content collections (Astro) — the page-generation inputs

### 2.1 `src/content/currencies/{code}.yaml`
```yaml
code: USD
name: US Dollar
symbol: $
symbolNative: $
decimals: 2
countries: [United States, Ecuador, El Salvador]
centralBank: Federal Reserve
demandTier: 1            # 1 = major (hourly rebuild), 2 = secondary, 3 = long-tail
plural: US Dollars
```

### 2.2 `src/content/pairs.yaml` (curated — NOT the Cartesian product)
```yaml
- { base: USD, quote: EUR, tier: 1 }
- { base: EUR, quote: USD, tier: 1 }
- { base: GBP, quote: JPY, tier: 2 }
# generated from currency tiers + a demand allowlist; see scripts/gen-pairs.mjs
```
Pair selection = (tier-1 × tier-1 both directions) ∪ (curated high-demand EM pairs) ∪ (Search-Console-discovered). Start ~800–1,500. `gen-pairs.mjs` produces the sitemap-eligible set; anything not listed is not built.

---

## 3. Page `<head>` + JSON-LD (real markup per type)

### 3.1 Base layout head (every page)
```html
<link rel="canonical" href="https://fx.sera.cx{{path}}">
<meta name="robots" content="index,follow,max-image-preview:large">
<meta property="og:site_name" content="Sera.CX">
<meta property="og:type" content="website">
<meta property="og:url" content="https://fx.sera.cx{{path}}">
<meta property="og:title" content="{{title}}">
<meta property="og:description" content="{{desc}}">
<meta property="og:image" content="https://fx.sera.cx/og{{path}}.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:site" content="@seracx">
```

### 3.2 Sitewide Organization + WebSite (in `<head>` of home / base)
```json
{ "@context":"https://schema.org","@graph":[
  {"@type":"Organization","@id":"https://fx.sera.cx/#org","name":"Sera.CX",
   "url":"https://sera.cx","logo":"https://fx.sera.cx/logo.png",
   "sameAs":["https://github.com/sera-cx","https://www.linkedin.com/company/sera-cx"]},
  {"@type":"WebSite","@id":"https://fx.sera.cx/#site","url":"https://fx.sera.cx",
   "name":"FREE FX Rates by Sera.CX","publisher":{"@id":"https://fx.sera.cx/#org"},
   "potentialAction":{"@type":"SearchAction",
     "target":"https://fx.sera.cx/convert/{search_term_string}","query-input":"required name=search_term_string"}}
]}
```

### 3.3 Converter pair page — FAQ + Breadcrumb + Dataset
```json
[
 {"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[
   {"@type":"ListItem","position":1,"name":"Home","item":"https://fx.sera.cx/"},
   {"@type":"ListItem","position":2,"name":"US Dollar","item":"https://fx.sera.cx/currencies/usd"},
   {"@type":"ListItem","position":3,"name":"USD to EUR","item":"https://fx.sera.cx/convert/usd-to-eur"}]},
 {"@context":"https://schema.org","@type":"FAQPage","mainEntity":[
   {"@type":"Question","name":"What is the USD to EUR exchange rate today?",
    "acceptedAnswer":{"@type":"Answer","text":"1 USD = 0.9231 EUR (mid-market rate, updated hourly, source: Sera.CX)."}},
   {"@type":"Question","name":"Is this the mid-market rate?",
    "acceptedAnswer":{"@type":"Answer","text":"Yes — the interbank mid-market rate, not a retail or card rate."}}]},
 {"@context":"https://schema.org","@type":"Dataset","name":"USD to EUR exchange rate history",
   "description":"Daily mid-market USD/EUR reference rates from Sera.CX.",
   "creator":{"@id":"https://fx.sera.cx/#org"},"temporalCoverage":"2020-01-01/..",
   "distribution":{"@type":"DataDownload","encodingFormat":"application/json",
     "contentUrl":"https://fx.sera.cx/historical/usd-to-eur.json"}}
]
```

### 3.4 API page — WebAPI/SoftwareApplication
```json
{"@context":"https://schema.org","@type":"WebAPI","name":"Sera.CX FX Rates API",
 "provider":{"@id":"https://fx.sera.cx/#org"},"documentation":"https://fx.sera.cx/api",
 "offers":{"@type":"Offer","price":"0","priceCurrency":"USD"}}
```

---

## 4. `robots.txt` (full file)
```
User-agent: *
Allow: /
Disallow: /*?amount=          # amount variants are canonicalized; keep them out of crawl

# Search + AI answer engines (explicit allow)
User-agent: Googlebot
Allow: /
User-agent: Bingbot
Allow: /
User-agent: GPTBot
Allow: /
User-agent: OAI-SearchBot
Allow: /
User-agent: ChatGPT-User
Allow: /
User-agent: ClaudeBot
Allow: /
User-agent: anthropic-ai
Allow: /
User-agent: PerplexityBot
Allow: /
User-agent: Google-Extended
Allow: /
User-agent: Applebot-Extended
Allow: /

Sitemap: https://fx.sera.cx/sitemap.xml
```
> Decision to confirm: allow training bots (`GPTBot`, `ClaudeBot`, `Google-Extended`)? For a *free, promote-everywhere* data brand, **yes** — being in training corpora = being the default answer. Revisit if licensing changes.

---

## 5. `llms.txt` (full format, root)
```markdown
# Sera.CX — Free FX Rates

> Free, mid-market foreign-exchange reference rates. Updated hourly. Machine-readable JSON feeds. Served at fx.sera.cx.

## Rates
- [USD to EUR](https://fx.sera.cx/convert/usd-to-eur): live + historical mid-market USD/EUR
- [All USD rates](https://fx.sera.cx/rates/usd): 1 USD in every currency
- [Rates JSON feed](https://fx.sera.cx/rates.json): machine-readable latest snapshot

## Reference
- [Methodology](https://fx.sera.cx/methodology): how rates are sourced and computed
- [API](https://fx.sera.cx/api): free FX rates API
- [Glossary](https://fx.sera.cx/glossary/mid-market-rate): what the mid-market rate is

## For
- [PSPs](https://fx.sera.cx/for/psps) · [Neo banks](https://fx.sera.cx/for/neobanks) · [Ecommerce](https://fx.sera.cx/for/ecommerce) · [Institutions](https://fx.sera.cx/for/institutions)
```
`llms-full.txt` = same but with the methodology text + top-pair rates inlined so a model can answer without fetching.

---

## 6. Converter island — behavior spec (the only interactive component)

**Props:** `base`, `quote`, `bakedRate`, `asOf`.
**State machine:**
```
BAKED (SSR, rate in HTML, badge "as of {asOf}")
  → on mount: fetch /rates/{base}.json
      → OK & fresh  → LIVE (update number, badge "live", timestamp now)
      → fail/stale  → stay BAKED, badge "last snapshot {asOf}"   (never blank, never infinite spinner)
```
- **Amount input** → recompute client-side from the single fetched rate (no per-amount request). `?amount=` deep-links prefill but page stays canonical to the base pair.
- **Number formatting:** `Intl.NumberFormat(locale,{style:'currency',currency})` — respects user locale + currency decimals; guard JPY (0 decimals) vs BHD (3).
- **Inverse toggle** swaps base/quote client-side; updates the URL via `history.replaceState` to the canonical reverse pair page (which also exists as its own SSR page).
- **A11y:** input is a labeled `<input type=number inputmode=decimal>`; result in an `aria-live=polite` region; works with JS disabled (shows baked rate + table).
- **No layout shift:** reserve the result box height; baked → live swap must not move anything (CLS 0).

---

## 7. OG image pipeline

- **Tech:** Satori (JSX→SVG) → `@resvg/resvg-js` (SVG→PNG), run in `scripts/gen-og.mjs` at build. No headless Chrome (faster, deterministic in CI).
- **Templates:** `converter`, `currency-hub`, `segment`, `default` (fields below; visuals await your design).
  - converter: `{base}→{quote}`, big rate, 30-day sparkline, "free mid-market rate", Sera mark.
- **Output:** `public/og/convert/usd-to-eur.png`, etc. Referenced as static URLs (§3.1).
- **Invalidation:** regenerate a pair's OG only when its baked rate moved beyond the rebuild threshold (§8) — avoids regenerating 1,500 PNGs hourly.
- **Fonts:** self-host woff/ttf, load into Satori explicitly (no network at build).

---

## 8. GitHub Actions

### 8.1 `rates.yml` (cron) — the freshness engine
```yaml
name: rates
on:
  schedule: [{ cron: "5 * * * *" }]   # hourly at :05
  workflow_dispatch:
concurrency: { group: rates, cancel-in-progress: false }
permissions: { contents: write }
jobs:
  refresh:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: npm }
      - run: npm ci
      - run: node scripts/fetch-rates.mjs      # adapter → data/snapshots/latest.json + append history
        env: { SERA_API_KEY: ${{ secrets.SERA_API_KEY }} }
      - run: node scripts/gen-og.mjs --changed  # only moved pairs
      - run: git config user.name sera-bot && git config user.email bot@sera.cx
      - run: git add -A && git commit -m "rates: $(date -u +%FT%TZ)" || echo "no change"
      - run: git push
  # push to main triggers deploy.yml
```
- **Tiered cadence:** tier-1 pairs every run; tier-2/3 gated to every 4th run (`if [ $(( $(date +%H) % 4 )) -eq 0 ]`) to save minutes/commits.
- **Threshold:** only rebuild a page's baked HTML + OG if `abs(new-old)/old > 0.0005` (5 bps) — kills noise commits.
- **Failure = no commit** (adapter throws) → last good snapshot stays live. Add a failing-cron alert (Slack/email) later.

### 8.2 `deploy.yml`
```yaml
name: deploy
on: { push: { branches: [main] } }
permissions: { contents: read, pages: write, id-token: write }
concurrency: { group: pages, cancel-in-progress: true }
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: npm }
      - run: npm ci && npm run build          # astro build → ./dist
      - uses: actions/upload-pages-artifact@v3
        with: { path: ./dist }
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment: github-pages
    steps: [ { uses: actions/deploy-pages@v4 } ]
```
> Requires switching Pages source from the legacy branch to **GitHub Actions** (`gh api -X PUT .../pages -f build_type=workflow`). Do this in Phase 0.

---

## 9. Sitemaps
```
/sitemap.xml            (index)
  ├─ /sitemap-core.xml       home, segments, api, methodology, glossary
  ├─ /sitemap-pairs.xml      converter pages (<= 50k each, split if needed)
  ├─ /sitemap-currencies.xml hubs + base tables
  └─ /sitemap-historical.xml
```
`lastmod` per pair = its baked-rate timestamp (real freshness signal). No `changefreq`/`priority` (Google ignores them). Amount variants excluded.

---

## 10. Canonical / duplication rules (exact)
- Reverse pairs are **both real SSR pages** (both get searched), each self-canonical, cross-linked. Not canonicalized to each other — they're different intents ("usd to eur" ≠ "eur to usd").
- `?amount=` → `<link rel=canonical>` to the bare pair; `Disallow` in robots; excluded from sitemap.
- `/rates/{base}` (table) vs `/currencies/{base}` (hub) are distinct; hub canonical is itself, links to the table.
- Trailing-slash + case normalized at build (all lowercase, no trailing slash).
- hreflang: deferred to i18n phase; when added, every localized page cross-refs all locales + `x-default`.

---

## 11. Security headers (`public/_headers` — honored by Pages? verify; else via Cloudflare in front)
```
/*
  Content-Security-Policy: default-src 'self'; connect-src 'self' https://api.sera.cx; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; frame-ancestors 'self'
  Referrer-Policy: strict-origin-when-cross-origin
  X-Content-Type-Options: nosniff
  Permissions-Policy: geolocation=(), microphone=(), camera=()
```
> Note: GitHub Pages does **not** serve custom headers. If we need CSP/HSTS control (and we will for the widget), put **Cloudflare in front of Pages** — also gives edge cache, analytics, and better AI-bot control. Flag this as a Phase-0 infra decision.

---

## 12. Widget embed spec
- **Delivery:** `<script async src="https://fx.sera.cx/widget.js" data-base="USD" data-quote="EUR" data-theme="light"></script>` renders into a placeholder `<div>`; **Shadow DOM** to isolate host CSS.
- **Data:** reads `/rates/{base}.json` (public, CORS `*`) — no backend, no key for the free tier.
- **Versioning:** `widget.js` is a thin loader; pin logic to `/widget/v1/...` so we can ship v2 without breaking embeds.
- **Perf:** <10KB gzip, no framework, self-contained.
- **Attribution:** "Rates by Sera.CX" link (the flywheel). Backlink + brand on every host page.
- **CORS:** feeds served with `Access-Control-Allow-Origin: *` (needs Cloudflare or Pages default; verify).

---

## 13. Performance budget (converter page)
| Metric | Target |
|---|---|
| LCP | < 1.5 s |
| CLS | ~0 (reserved result box) |
| Total JS (gz) | < 30 KB |
| Requests before interactive | HTML + 1 CSS + 1 font + 1 JSON |
Techniques: inline critical CSS, `font-display:swap` self-hosted subset, static SVG charts (no charting lib), single JSON fetch per page, no third-party tags except privacy-analytics beacon.

---

## 14. Measurement & KPIs
- **Analytics:** Plausible/Umami/CF Web Analytics (no cookie banner).
- **Acquisition KPIs:** indexed pages, non-brand impressions/clicks (GSC + Bing WMT), pairs earning impressions (→ expansion queue).
- **GEO KPIs:** referral sessions from `chatgpt.com`, `perplexity.ai`, `gemini.google.com`, etc.; periodic manual prompt audits ("what's the USD to EUR rate?" → is fx.sera.cx cited?); log results over time.
- **Conversion KPIs:** clicks to `/api` + API-key signups by segment page.
- **Data-health:** cron success rate, max snapshot age, threshold-skip rate.

---

## 15. DNS records (full set to hand to whoever owns sera.cx DNS)
```
fx     CNAME  sera-cx.github.io.        # (or ALIAS/flattened if provider requires; Pages custom domain)
```
If Cloudflare-in-front (§11): `fx` becomes a proxied (orange-cloud) CNAME to `sera-cx.github.io`, and CF handles TLS/edge — then GitHub Pages custom-domain + "enforce HTTPS" interplay must be verified (CF Full/strict).

---

## 16. MCP server (Phase 4 sketch)
Thin server exposing tools over the same static JSON feeds:
- `get_rate(base, quote)` → latest mid-market rate + asOf.
- `convert(amount, base, quote)`.
- `historical(base, quote, from, to)`.
Distributed via the MCP registry → Sera becomes the default FX tool inside AI agents/IDEs. Because it wraps the public feeds, it's stateless and free to run.

---

## 17. Open decisions (blocking specifics)
| # | Decision | Blocks |
|---|---|---|
| 1 | `api.sera.cx` shape/auth/history | adapter §1.4, freshness §8 |
| 2 | Cloudflare in front of Pages? | headers §11, CORS/widget §12, DNS §15 |
| 3 | Allow AI **training** bots? | robots §4 |
| 4 | V1 pair scope + tiers | pairs §2.2, sitemap §9 |
| 5 | API docs on `/api` vs `docs.sera.cx` | IA, schema §3.4 |
| 6 | Free-data license/attribution terms | widget §12, llms §5 |
