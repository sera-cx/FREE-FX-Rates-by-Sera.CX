# FREE FX Rates by Sera.CX — Master Plan

> Static site (GitHub Pages) at **fx.sera.cx**. No database. Rates from `api.sera.cx` (TBD).
> Goal: rank + get cited across search **and** AI channels; convert institutions, PSPs, neo banks, ecommerce.
> Status: planning. Awaiting design + rate API contract.

---

## 0. Strategic frame

Two distinct products living on one static domain:

1. **Distribution surface** — thousands of SEO/GEO pages (converter long-tail + segment pages) whose job is to *acquire* attention from Google, Bing, and LLM answer engines, then hand qualified traffic to the API.
2. **Trust surface** — methodology, data provenance, update cadence, disclaimers. In a finance (YMYL) niche this is not optional; it's the multiplier on everything else.

The site never sells "a converter." It sells *"the free, transparent, machine-readable mid-market reference rate that everything else plugs into."* Every page reinforces that entity claim.

---

## 1. Audience → intent → funnel

| Segment | Jobs-to-be-done | Query & AI-prompt patterns | Landing | Primary CTA |
|---|---|---|---|---|
| **Institutions** (banks, asset mgrs, treasury) | Reference/benchmark rate, historical series, provenance for audit | "reference FX rate source", "EOD mid-market rate API", "historical EUR/USD dataset" | `/for/institutions`, `/methodology`, historical pair pages | API key / talk to us |
| **PSPs** | Rate for settlement + FX at checkout, transparent markup | "FX API for payment settlement", "mid-market rate no markup", "currency conversion API checkout" | `/for/psps` | API key / docs |
| **Neo banks** | Card FX, multi-currency wallet, beat Visa/MC rate narrative | "Visa exchange rate vs mid-market", "multi-currency wallet FX API", "transparent card FX" | `/for/neobanks`, comparison explainers | API key |
| **Ecommerce** | Local-currency display, converter widget, dynamic pricing | "show prices in local currency", "currency converter widget", "USD to EUR today" | `/for/ecommerce`, `/widget`, converter long-tail | Embed widget / API key |

Each segment page = problem → how Sera solves → integration snippet → proof (methodology/uptime) → CTA. Segment pages are the only hand-written "money" pages; everything else is templated.

---

## 2. URL taxonomy (canonical spec)

```
/                                   Home (entity hub)
/for/institutions|psps|neobanks|ecommerce   Segment money pages
/convert/{base}-to-{quote}          Programmatic converter (e.g. /convert/usd-to-eur)
/convert/{base}-to-{quote}?amount=  Amount variant → JS-rendered, canonical → base pair
/currencies/{code}                  Currency hub (USD): all pairs, about, symbol, countries
/rates/{base}                       Base table: 1 USD in all quotes
/historical/{base}-to-{quote}       Historical series page
/widget                             Embeddable converter (distribution flywheel)
/api                                API overview → deep-links to docs.sera.cx / api.sera.cx
/methodology                        How rates are sourced/computed (E-E-A-T core)
/glossary/{term}                    mid-market-rate, interbank-rate, spread, ...
/about /contact /status /legal/*    Trust + compliance
/llms.txt /llms-full.txt            AI-channel entry points
/sitemap.xml /robots.txt
```

**Rules**
- Lowercase, hyphenated, no trailing slash, one canonical per concept.
- `{base}-to-{quote}` is *the* pair URL; reverse pair links to it, not a duplicate.
- Amount pages are **not** separate URLs in the sitemap — one page, JS handles amounts, `<link rel=canonical>` → `/convert/usd-to-eur`. Prevents index bloat / thin-content flags.
- Ship only pairs with demand. **V1: top ~40 currencies** (majors + high-traffic EM) → curated pair set (~800–1,500), not the full 22k Cartesian product. Expand from Search Console + AI-referral data.

---

## 3. Programmatic SEO — making templated pages not-thin

Google/LLMs punish near-duplicate templated pages. Each converter page needs **unique, useful, per-pair content**, not just a swapped ticker:

Per-pair page blocks:
1. **Answer-first H1 + sentence** — "1 USD = 0.92 EUR right now" (rate baked into static HTML, JS live-refreshes).
2. Live converter widget (amount input).
3. **7/30/90-day mini chart** (static SVG from snapshot data + live overlay).
4. **Rate table** — 1, 10, 100, 1,000, 10,000 units both directions (unique numbers per pair).
5. Per-pair **FAQ** (FAQPage schema): "Is this the mid-market rate?", "How often updated?", "USD/EUR history".
6. **Both currencies' facts** — symbol, ISO code, central bank, countries, cash vs card rate note.
7. Contextual internal links: currency hubs, top related pairs, historical page, relevant segment page.
8. Freshness stamp — "Updated {timestamp} UTC".

**Content uniqueness budget:** aim >40% non-boilerplate tokens per page. The numbers (rate tables, charts, historical stats) do most of that work automatically because they're genuinely different per pair.

**Internal linking graph (hub-and-spoke):**
- Currency hub `/currencies/usd` links to all USD pairs → distributes authority.
- Each pair links up to both currency hubs + laterally to top-N correlated pairs.
- Segment pages link down to the most commercially relevant pairs.
- Home links to hubs + segments only (keeps it clean).
- Breadcrumbs everywhere (BreadcrumbList schema).

**Index management:** `noindex` amount variants, empty/deprecated pairs; `sitemap.xml` lists only canonical indexable URLs; split sitemaps by type (`sitemap-pairs.xml`, `sitemap-segments.xml`, ...) under a sitemap index.

---

## 4. The static + live freshness architecture (the crux)

No database, but crawlers/LLMs must see a *real recent rate in the HTML*, and humans must see a *live* one.

```
api.sera.cx ──(cron, GitHub Action, hourly)──> snapshot JSON committed to repo
     │                                                   │
     │                                          Astro build regenerates
     │                                          affected static pages + OG imgs
     ▼                                                   ▼
Browser JS fetches live rate ◄───────── Pages serves fresh static HTML (crawlers/LLMs)
```

- **Build-time snapshot** → static HTML always carries a rate no more than ~1h stale (tunable). This is what ranks and gets quoted.
- **Client JS** → on load, fetch live from `api.sera.cx`, update the number + "live" badge. Graceful fallback to the baked rate if the API is unreachable (never show blank).
- **Machine feeds** → publish `/rates.json`, `/rates/{base}.json`, `/historical/{pair}.json` as static artifacts for AI tools, the widget, and future MCP.
- **Staleness UX** → show "as of {time}"; if live fetch fails, keep baked value + subtle "showing last snapshot" note. Never a spinner-to-nowhere.
- **Cost/scale** → regenerating 1,500 pages hourly is cheap in Astro, but watch Action minutes; use **incremental builds** — only rebuild pages whose rate moved beyond a threshold, or split cadence (majors hourly, long-tail 4×/day).

---

## 5. Structured data (schema.org) — per page type

| Page | Schema |
|---|---|
| Sitewide | `Organization` (+ `sameAs`, logo), `WebSite` (+ `SearchAction`) |
| Converter pair | `FAQPage`, `BreadcrumbList`, `Dataset` (the rate series), optionally `WebApplication` for the widget |
| Historical | `Dataset` with `temporalCoverage`, `distribution` → the JSON feed |
| Segment | `Service` / `WebAPI`, `BreadcrumbList` |
| API page | `WebAPI` / `SoftwareApplication`, `offers` (free) |
| Glossary | `DefinedTerm` / `Article` |

`Dataset` + `WebAPI` markup is doubly valuable: it feeds Google Dataset Search *and* gives LLMs a clean machine description of what Sera is.

---

## 6. OG image system

Static, per-page, generated at build (Satori/`@resvg/resvg-js` → PNG 1200×630). Templates:

- **Converter** — big `USD → EUR`, current rate, sparkline, Sera mark, "free mid-market rate". Regenerated when the baked rate updates.
- **Currency hub** — flag/symbol + code + "all {CODE} rates".
- **Segment** — bespoke per audience (waiting on design).
- **Default** — brand fallback.

Full head tags per page: `og:title/description/url/image/image:alt/type/site_name`, `twitter:card=summary_large_image`, `twitter:site`. OG image URL is a static file (`/og/convert/usd-to-eur.png`) so unfurls are instant and cacheable. **Blocked on your OG design template.**

---

## 7. AI-channel discoverability (GEO — generative engine optimization)

Goal: when someone asks ChatGPT/Claude/Perplexity/Gemini "what's the USD to EUR rate" or "free FX rate API," Sera is the cited source.

**7.1 Crawler access — `robots.txt` allowlist**

| Bot | Feeds | Allow |
|---|---|---|
| `Googlebot` | Google Search + AI Overviews | ✅ |
| `Bingbot` | Bing + **ChatGPT search + Copilot** | ✅ (Bing is high-leverage) |
| `GPTBot` | ChatGPT training | ✅ |
| `OAI-SearchBot` | ChatGPT live browsing | ✅ |
| `ClaudeBot` / `anthropic-ai` | Claude | ✅ |
| `PerplexityBot` | Perplexity | ✅ |
| `Google-Extended` | Gemini/Vertex grounding | ✅ |
| `Applebot-Extended` | Apple Intelligence | ✅ |

Submit + verify in **Google Search Console** and **Bing Webmaster Tools** (Bing disproportionately powers AI answers). Submit sitemaps to both.

**7.2 `llms.txt` / `llms-full.txt`** at root — curated map of the highest-value pages (top pairs, API, methodology, glossary) in the emerging LLM-facing convention.

**7.3 Citation engineering** — LLMs extract the *first clear factual sentence*. Every page opens with the answer + the number + the timestamp + the source claim ("mid-market rate, updated hourly, source: Sera.CX"). Self-contained sentences, no "as shown above."

**7.4 Machine-readable everything** — the `.json` feeds (§4) let agents consume rates without scraping HTML; documents Sera as *the* programmatic source.

**7.5 Entity/knowledge-graph building** — consistent `Organization` schema + `sameAs` (GitHub, LinkedIn, later Wikidata/Crunchbase), consistent NAP/brand string "Sera.CX", so the graph resolves "Sera.CX = FX rates provider."

**7.6 Future: MCP server** — a Sera FX MCP server makes the rates a drop-in tool inside AI agents/IDEs; huge GEO moat. Park for post-v1, but design the JSON feeds now so MCP is a thin wrapper.

---

## 8. E-E-A-T / trust / compliance (YMYL — finance)

- **`/methodology`** — where rates come from, mid-market definition, computation, update frequency, what it is *not* (not a dealable/executable rate). This page is cited by everything and read by procurement.
- **Disclaimers** — "indicative reference rates, not financial advice, not a quote for execution." Site-wide footer + per-converter microcopy.
- **`/status`** — uptime + last-updated heartbeat (static badge fed by the cron; can pull from a status provider later).
- **Provenance stamps** — every rate shows source + timestamp.
- **Legal** — terms of use for the free data, attribution requirement, rate-limit/fair-use note, privacy policy (see §10).
- **Authorship/org signals** — real About page, contact, entity schema.

---

## 9. Widget / embed distribution flywheel (ecommerce lever)

A `<script>`/iframe converter embed that ecommerce sites drop into product/checkout pages:
- Each embed = a **backlink + brand impression** on third-party sites → compounding SEO authority + top-of-funnel for the API.
- Configurable (base/quote, theme, amount), reads the static JSON feeds → zero backend.
- `/widget` page = generator + copy-paste snippet + live preview.
- Optional attribution link "Rates by Sera.CX" (drives the flywheel; make removable on paid tier later).

---

## 10. Analytics, measurement & monitoring

- **Privacy-first analytics** (Plausible/Umami/Cloudflare Web Analytics) — no cookie banner, keeps CWV clean, GDPR-friendly.
- **GSC + Bing WMT** — coverage, queries, which pairs earn impressions → demand signal for expansion.
- **Rank + AI-citation tracking** — monitor whether ChatGPT/Perplexity/Gemini cite fx.sera.cx (manual prompts at first; tooling later). Track referral traffic from `chat.openai.com`, `perplexity.ai`, etc. as a GEO KPI.
- **Core Web Vitals** monitoring (CrUX/Lighthouse CI in the pipeline).
- **Build/data health** — alert if the rates cron fails or data goes stale beyond threshold.

---

## 11. Performance & security budget

- **Perf:** static HTML, near-zero JS on critical path (Astro islands only for the converter), self-hosted fonts, inlined critical CSS, static OG/PNG. Target LCP <1.5s, CLS ~0, JS <30KB on converter pages.
- **Security headers** (via Pages `_headers` where supported, else meta/CDN): CSP, `Referrer-Policy`, `X-Content-Type-Options`, `Permissions-Policy`. Static + no DB shrinks attack surface to near zero.
- **HTTPS enforced** once the Pages cert provisions (post-DNS).

---

## 12. Internationalization (phase 2+)

- Long-tail intent is heavily non-English ("dólar a euro hoy", "usd to inr today", "美元兑人民币").
- Plan: `hreflang` + localized `/es/convert/...`, `/hi/...` etc., translated boilerplate + localized number/currency formatting. Big multiplier but adds page count ×N — sequence after English proves the model.

---

## 13. Build / CI architecture

- **Generator: Astro** — static output, content collections for currency/pair data, build-time OG generation, islands for the live converter. (Alt: 11ty; Astro wins on OG + islands.)
- **Repo layout:**
  ```
  src/pages/                 routes (incl. [pair].astro dynamic)
  src/content/currencies/    per-currency metadata (name, symbol, country, cbank)
  src/content/pairs/         curated pair list + demand tier
  src/components/            Converter island, Chart, RateTable, FAQ
  src/layouts/               Base (head/schema/OG tags)
  data/snapshots/            committed rate snapshots (from cron)
  scripts/fetch-rates.mjs    pull api.sera.cx → snapshot + feeds
  scripts/gen-og.mjs         Satori → /public/og/**.png
  scripts/build-sitemaps.mjs
  public/                    llms.txt, robots.txt, rates.json, og/**
  .github/workflows/deploy.yml
  .github/workflows/rates.yml (cron)
  ```
- **Actions:**
  1. `deploy.yml` — build + deploy to Pages via **GitHub Actions source** (migrate off the legacy branch source).
  2. `rates.yml` — cron: fetch → snapshot → tiered rebuild → OG regen → deploy. Concurrency guard so runs don't overlap.
- **Scale guardrails:** incremental/threshold rebuilds, tiered cadence (majors hourly / long-tail 4×day), watch Action minutes, cache Astro build.

---

## 14. Phased roadmap

| Phase | Scope | Exit criteria |
|---|---|---|
| **0 — Foundation** *(now)* | Repo ✅, Pages ✅, CNAME ✅. DNS + HTTPS. Astro scaffold, base layout, schema/OG plumbing, robots/llms.txt, analytics. | fx.sera.cx serves a real page over HTTPS |
| **1 — Core** | Home + 4 segment pages + `/methodology` + `/api` + top ~40 currencies' pairs with baked+live rates, OG images, sitemaps, GSC/Bing. | Indexed, converter live, rates auto-refresh |
| **2 — Depth** | Currency hubs, historical pages, glossary, FAQ schema everywhere, `/widget` embed, `/status`. | Long-tail indexed, first AI citations observed |
| **3 — Distribution** | Widget adoption, i18n (top 3 languages), rank + AI-citation tracking, expand pair set by demand. | Non-brand + AI referral traffic growing |
| **4 — Moat** | MCP server, richer datasets, Wikidata/entity, partner embeds. | Sera cited as default FX source in AI channels |

---

## 15. Risks

- **Thin/duplicate content** at scale → mitigated by per-pair unique data blocks + curated pair set + canonical discipline.
- **Stale rates in static HTML** → tiered cron + live JS overlay + staleness UX.
- **Action-minute / build-time blowup** → incremental + tiered rebuilds.
- **YMYL trust gap** → methodology + disclaimers + provenance up front.
- **Crawl budget waste** on low-value pages → sitemap hygiene, noindex variants.
- **API dependency** (`api.sera.cx` down) → baked fallback, cached feeds, status page.

---

## 16. Open inputs needed
1. **Design** — page templates + OG template (incoming).
2. **`api.sera.cx` contract** — endpoints, auth, response shape, update frequency, rate limits, historical availability.
3. **V1 currency/pair scope** + update cadence.
4. Whether API docs live here (`/api`) or a separate `docs.sera.cx`.
5. Attribution/licensing terms for the free data (affects widget + `llms.txt`).
