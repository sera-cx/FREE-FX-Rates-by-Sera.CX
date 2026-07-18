# FREE FX Rates by Sera.CX — Growth & Domination Playbook

> How fx.sera.cx becomes the #1 venue people (and machines) get FX rates from — and how the word spreads on its own.
> Companion to `PLANNING.md` (strategy) + `SPEC.md` (build). This doc = distribution, moat, GTM.

---

## 0. The hard truth that shapes everything

**Google already owns the head term.** Search "usd to eur" and Google's own converter onebox sits above every organic result. You will not out-rank the onebox for head converter queries. Any plan that assumes "rank #1 for usd to eur" is dead on arrival.

So the win is **not** the head SERP. It's the four places the onebox is weak or absent:

1. **AI answer engines (GEO)** — ChatGPT, Claude, Perplexity, Gemini, Copilot. *There is no Google onebox here.* Whoever is the cleanest, most-cited, machine-readable FX source becomes the default answer. **This is the single biggest opening and our primary wedge.**
2. **The long tail + segment/use-case intent** — "fx api for payment settlement", "mid-market rate no markup", "show prices in local currency" — the onebox doesn't serve these; buyers do.
3. **Developers & machines** — a free, no-signup, machine-readable API/feeds is a thing people *build on and embed*, which spreads by itself. Google's onebox can't be embedded or called.
4. **Distribution surfaces off our domain** — widgets, SDKs, integrations, the MCP tool — Sera showing up *inside other people's products and AI agents*.

**Thesis:** Win by being *the free, transparent, machine-readable mid-market rate that every developer, product, and AI agent reaches for by default* — then let embeds, API usage, and citations compound. "Free" is the wedge against paid incumbents (xe, OANDA, Wise API); "machine-readable + no-signup" is the wedge that makes it spread.

---

## 1. Competitive map & our angle

| Player | Strength | Their gap = our angle |
|---|---|---|
| **Google converter onebox** | Owns head SERP | Can't be embedded, called, or cited by AI; no segment/API story |
| **xe.com** | Brand, traffic | Paid/gated API, ad-heavy UX, weak GEO/machine-readability |
| **Wise** | Trust, real rates | It's a product not a data utility; API tied to their rails |
| **OANDA** | Historical data | Paid, enterprise-gated, not free/open |
| **exchangerate.host / Frankfurter / open.er-api** | Free dev APIs | Thin brand, minimal SEO/GEO/segment presence, no embeds/UX layer |
| **ECB reference rates** | Authority | Once-a-day, EUR-base only, no product layer |

**Nobody owns "free + branded + machine-readable + AI-cited + embeddable + segment-aware" all at once.** That's the whitespace. The free dev-API players have the data ethos but no brand/GEO/distribution; the brands have traffic but gate the data. Sera does both.

---

## 2. The growth engine = 3 compounding loops

Growth isn't a campaign; it's loops that feed themselves.

### Loop A — Embed flywheel (the widest)
Ecommerce/blog/fintech sites drop the free converter widget → every embed = a **backlink + "Rates by Sera.CX" brand impression** on a third-party domain → more referral traffic + more domain authority → higher rankings + more embeds. Zero backend (reads static feeds). **k-factor lever:** make the widget beautiful, one-line install, and genuinely useful so people *want* it. Track embed count as a first-class metric.

### Loop B — API/developer flywheel
Free, no-signup JSON feeds + a clean API → developers build apps, bots, spreadsheets, tutorials on it → those link back, post on GitHub/Stack Overflow/Reddit, and cite Sera in docs → more developers discover it → more usage. **Lever:** be the *easiest possible* to start (no key for the free tier, copy-paste examples in 6 languages, published on every registry).

### Loop C — GEO/citation flywheel
Clean structured data + `llms.txt` + answer-first content → AI engines cite fx.sera.cx → people see "source: Sera.CX" in AI answers → brand recognition + direct visits + more people referencing us → more training/citation signal → more citations. **Lever:** be the most extractable, most accurate, most machine-readable source on the open web.

All three share one substrate: **the static site + free feeds.** Build once, three loops spin.

---

## 3. GEO domination (primary wedge — go all-in)

The new "front page" is the AI answer. Playbook to *own* FX there:

- **Be everywhere the answer is assembled:** allow every AI crawler (SPEC §4); get into Bing's index hard (it feeds ChatGPT + Copilot); rank in Google organic (feeds AI Overviews + Gemini grounding).
- **Answer-first, self-contained sentences** on every page: *"1 USD = 0.9231 EUR (mid-market, updated hourly, source: Sera.CX)."* That exact shape is what gets lifted verbatim into an answer with attribution.
- **`llms.txt` + `llms-full.txt`** with methodology + top rates inlined → a model can answer *and cite* without fetching.
- **Machine feeds + MCP server** → Sera becomes a *tool* inside agents (Claude/ChatGPT/IDE agents). Publish to the **MCP registry**; an agent that needs FX picks the free, well-documented one. This is a moat classic SEO can't touch.
- **Wikidata + Wikipedia citations** → the knowledge graph learns "Sera.CX = FX reference-rate provider," which feeds every AI's grounding.
- **Share-of-AI-voice as a north-star sub-metric:** run a fixed prompt panel monthly ("what's the X to Y rate", "free fx api", "mid-market rate source") across ChatGPT/Claude/Perplexity/Gemini; measure citation share; treat it like rank tracking.

If we win nothing else, winning GEO wins the decade.

---

## 4. Linkable assets — the digital-PR engine

Rankings + citations need links + authority. You don't earn those with converter pages; you earn them with **assets journalists and bloggers cite:**

- **"Sera FX Index" / weekly + monthly rate reports** — auto-generated data stories ("Q3 currency movers", "biggest EM depreciations this month"). Data journalism = links from finance media.
- **Historical open dataset** — a genuinely free, well-documented historical series (CSV/JSON, `Dataset` schema) → cited by researchers, students, Kaggle, GitHub repos. Each citation = a link + entity signal.
- **Central-bank rate tracker / methodology transparency** — being *the* explainer of "what is the mid-market rate" earns educational links (universities, .edu, tutorials).
- **Free tools as bait:** currency-strength heatmap, historical chart maker, "what was $X worth on date Y" inflation-style tool. Tools attract links far better than articles.
- **Embeddable charts** — like the widget but for a pair's history; bloggers embed → backlinks.

Each asset is *evergreen and static* — build once, earns links for years.

---

## 5. Distribution channels — where we actively spread

Beyond the self-running loops, deliberate placement:

**Developer ecosystem (highest ROI for a free API):**
- Publish SDKs to **npm, PyPI, packagist, Go** — `sera-fx` one-liners. Each registry = a discovery surface + backlink.
- **Postman public workspace**, **RapidAPI**, **public-apis** GitHub list, **API directories**.
- **Google Sheets add-on** + **Excel `=SERA()` function** + **Zapier/Make connector** — non-devs pulling live rates → massive reach, each store listing = backlink + brand.
- **Stack Overflow / GitHub** — answer FX questions with working Sera examples (helpful, not spammy).

**Integrations that live inside daily tools:**
- **Slack bot** (`/fx 100 usd eur`), **Discord bot**, **browser extension** (highlight a price → convert), **Raycast/Alfred** extensions, **MCP server** for AI agents. Every one is a distribution node with our brand.

**Community & social:**
- **Reddit** (r/webdev, r/fintech, r/algotrading, r/ecommerce) and **Hacker News** — launch the *free open API + open historical data* angle (developers love free/open; that's the story that spreads).
- **Auto-generated social rate cards** — daily "USD/EUR today" branded images (reuse the OG pipeline) posted to X/LinkedIn; each is a branded impression.
- **Product Hunt** launch of the widget + API.

**Partnerships as distribution (not just as customers):**
- PSPs/neobanks/ecommerce platforms → co-marketing, case studies, "powered by Sera.CX" placements. A single platform integration puts Sera in front of thousands of merchants. Segment pages are the top of this funnel.

---

## 6. Trust & accuracy as a growth strategy

In FX, **trust is distribution** — you only get cited (by humans *and* AI) if you're reliably right.
- **Radical transparency:** methodology, source, exact update timestamps on every rate, public status page. This is *why* an AI picks you over an anonymous free API.
- **Accuracy monitoring:** cross-check against ECB/other references; alert on divergence. One viral "Sera showed a wrong rate" incident sets GEO back months.
- **Never dark-pattern:** no gating the free data, no bait-and-switch. The free promise *is* the brand. Monetize later on top (SPEC/PLANNING), never by breaking it.
- **Provenance = citability:** "mid-market, source Sera.CX, {timestamp}" repeated everywhere trains both users and models to attribute.

---

## 7. Programmatic & data expansion roadmap (widen the moat)

Each expansion = more surface area for all three loops:
1. **Currencies/pairs** — top 40 → top 80 → long tail, demand-driven.
2. **Languages (i18n)** — the non-English long tail is enormous ("dólar a euro", "usd to inr", "美元兑人民币"); ×N page count, huge new markets, low competition.
3. **Asset classes** — crypto, precious metals, maybe indices — same infra, new query universes and new communities.
4. **Data depth** — EOD/reference snapshots, longer history, volatility/strength metrics → more linkable data products.
5. **Verticals** — travel-money, remittance, invoicing/accounting, trading — each a segment page + tailored tools.

**Data history is a compounding moat:** every day we snapshot, our historical dataset grows and becomes harder to replicate — and more citable.

---

## 8. Monetization that *protects* the free engine (later, don't touch v1)

The free tier is the growth engine — never gate it. Revenue sits *on top*:
- **API tiers** — free (rate-limited, no key) → paid (higher limits, SLA, historical depth, websocket, API key). Classic PLG upgrade path; the free segment/converter traffic feeds it.
- **Enterprise** — institutions/PSPs/neobanks: SLA, dedicated endpoints, compliance/audit provenance, custom bases. The `/for/*` pages are this funnel.
- **White-label widget / remove-attribution** — the flywheel widget's "powered by" becomes a paid removable.
Every paid tier is a *superset* of free — free stays maximally viral.

---

## 9. Metrics — the domination scoreboard

**North star:** *rate lookups served across all surfaces* (site + feeds + widget + API + MCP) — the truest measure of "the venue people get FX from."

Loop/health metrics:
- **Spread:** live embed count, API consumers, SDK installs, integration installs, backlinks (referring domains).
- **GEO:** share-of-AI-voice (monthly prompt panel), AI-referral sessions, "source: Sera.CX" citation count.
- **SEO:** indexed pages, non-brand impressions/clicks, pairs earning impressions (→ expansion queue), topical-authority growth.
- **Brand:** direct + branded-search traffic (the real signal that word spread).
- **Trust:** uptime, max data-staleness, accuracy-divergence incidents (target: zero).

---

## 10. 90-day launch sequence (once design + API land)

| Weeks | Focus | Ships |
|---|---|---|
| **1–2** | Foundation | DNS+HTTPS, Cloudflare decision, Astro scaffold, base layout+schema+OG plumbing, robots/llms.txt, analytics, GSC+Bing verified |
| **3–5** | Core index | Home + 4 segment pages + methodology + api page + top-40 pairs (baked+live), OG images, sitemaps → submitted |
| **6–8** | Distribution primitives | Widget v1, free API + docs, SDKs (npm/PyPI), `/rates.json` feeds, Postman/RapidAPI/public-apis listings |
| **9–10** | GEO push | llms-full.txt, Dataset schema live, MCP server v1 → registry, first linkable data report, Wikidata entity |
| **11–13** | Spread | Product Hunt + HN + Reddit launch (free open API/data story), Sheets/Slack/extension, historical dataset release, outreach to first PSP/ecommerce partners |

Sequencing logic: **index before you promote** (don't launch to HN with an unindexed site), **feeds before widget** (widget depends on them), **GEO after content exists** (nothing to cite otherwise), **spread last** (when there's something worth spreading).

---

## 11. Risks to #1 (and mitigations)

| Risk | Mitigation |
|---|---|
| Google onebox owns head terms | Don't fight it — win GEO + long-tail + segments + off-domain distribution |
| Free API abuse / cost blowup | Static feeds via CDN (Cloudflare) absorb load cheaply; rate-limit the dynamic API; no-key free tier is just cached JSON |
| Accuracy/trust incident | Cross-reference monitoring + alerting + status page; transparency |
| `api.sera.cx` dependency/outage | Baked fallback + cached feeds + status; normalized adapter isolates it |
| Commoditized data (why us vs free APIs?) | Brand + UX + GEO + embeds + trust + segment presence — the *layer*, not the raw data |
| AI engines stop citing / change rules | Diversify across all engines; own the entity in the knowledge graph; MCP tool as a direct channel |
| Scaling content thin/spammy | Per-pair unique data, curated pairs, helpful-content discipline (SPEC §3, §10) |

---

## 12. The one-sentence strategy
**Be the free, transparent, machine-readable mid-market FX rate that every developer, product, and AI agent reaches for by default — ship the static site + open feeds once, and let embeds, API usage, and AI citations compound into #1.**
