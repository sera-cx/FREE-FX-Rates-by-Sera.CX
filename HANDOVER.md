# Backend Handover — connecting fx.sera.cx to real rates

**Audience:** backend/infra dev wiring the live rates.
**Goal:** stand up a small server-side **rates layer** that lets the static site (and the
marketed "free FX rates API") show real numbers. The static frontend is done and deployed;
it's feature-flagged off from live data until this exists.

> All facts below were verified against the live API and docs.sera.cx on 2026-07-18.
> Don't trust the marketing copy on the site for the API shape — trust this doc.

---

## 1. The gap in one paragraph

The site markets a simple `GET api.sera.cx/v1/quote?from=EUR&to=USD → {buy,mid,sell}` rates
API. **That endpoint does not exist.** The real core API is a **signed on-chain stablecoin
orderbook** at `https://api.sera.cx/api/v1`. It has **no price/quote/rates/ticker endpoint**,
**no CORS headers**, and prices live only in the **authenticated orderbook** (needs an API
key). Sera does not publish a mid-price feed — market makers "bring their own rate source"
(per the Market Maker Guide). So we must **derive** rates ourselves, server-side, and expose
them CORS-enabled for the browser.

---

## 2. Verified API facts

- **Base URL:** `https://api.sera.cx/api/v1`
- **Auth header (for protected routes):** `Authorization: Bearer {API_KEY}:{API_SECRET}`
  where `API_KEY` looks like `sera_...`.
- **Minting an API key:** requires an Ethereum wallet (mainnet, funded with USDC) signing an
  **EIP-712 `ManageApiKey`** payload. Domain: `{name:"Sera", version:"1", chainId:1,
  verifyingContract:"0xB5C50C5D5f038404F85970b7f5B7259C4AC0E198"}`. See
  docs.sera.cx → API Reference → Authentication / Next Steps. **This is a wallet operation —
  do it yourself; the key + secret are secrets (see §7).**

**Public routes (no key), live-tested 200:**
| Route | Returns |
|---|---|
| `GET /health` | service health |
| `GET /system/time` | server unix time (use for signed deadlines) |
| `GET /tokens` | token registry — `{address,symbol,decimals,currency,min_trade_amount}` |
| `GET /markets` | 780 markets — `{symbol, base_symbol, quote_symbol, base_address, quote_address, *_decimals, tick_precision, min_*}` — **no price field** |
| `GET /config` | chain id + contract addresses + EIP-712 domain — **no price data** |
| `POST /swap/quote` | swap quote (no key) — **often `{"error":"no_liquidity"}`** on thin markets |

**Key-protected reads (401 without key):** `GET /orders`, `GET /orders/{id}`, `GET /fills`,
`GET /fills/{id}`, `GET /balances`, `GET /permit/metadata`.

**Do not exist (404):** `/quote`, `/rates`, `/ticker`, `/orderbook`, `/depth`, `/prices`, `/stats`.

---

## 3. What the frontend expects from the rates layer (the contract to implement)

The static site (`index.html`) is wired to consume exactly this. Serve it **with CORS**
(`Access-Control-Allow-Origin: *`). Full draft in [`openapi.yaml`](openapi.yaml).

**a) `GET {RATES_BASE}/quote?from=EUR&to=USD`**
```json
{ "buy": 1.0851, "mid": 1.0842, "sell": 1.0833 }
```
Consumed by `pullQuote()` → hero card. Numbers must be finite.

**b) `GET {RATES_BASE}/latest?base=EUR`**
```json
{ "base": "EUR", "asOf": "2026-07-18T14:00:00Z",
  "rates": { "USD": 1.0842, "GBP": 0.8516, "JPY": 169.6, "CHF": 0.966, "AUD": 1.624 } }
```
`rates[X]` = units of X per 1 `base`. Consumed by `hydrateConverter()`.

**c) `GET {RATES_BASE}/history?pair=GBP/USD&date=2026-01-15`** (optional, phase 2)
```json
{ "pair": "GBP/USD", "date": "2026-01-15", "rate": 1.2731 }
```

Ticker + markets chart currently use static demo arrays; wiring them to real data is a small
phase-2 follow-up once (a)/(b) exist.

---

## 4. Deriving the rate (decision made: orderbook mid)

Product decision: a displayed rate = **orderbook mid = (best_bid + best_ask) / 2**, with
`buy = best_ask`, `sell = best_bid` (spread comes straight from the book).

Reality to handle:
- Best bid/ask come from **`GET /orders`** (authenticated) per market. Confirm the exact
  response shape / whether there's a book-depth variant in the Orders docs.
- **Liquidity is sparse** across the 780 markets (`/swap/quote` frequently returns
  `no_liquidity`). You need fallbacks:
  1. Direct market `BASE/QUOTE` mid if the book has both sides.
  2. Else **cross-rate through a hub token** (USDC): `rate(A,B) = mid(A,USDC) / mid(B,USDC)`.
  3. Else mark the pair **stale/unavailable** (return last-known with `asOf`, or omit).
- **Currency ↔ token mapping:** the site uses ISO currency codes (USD, EUR, …); markets use
  **stablecoin tokens** (USDC, EURC, EUR0, …), and a currency can have multiple tokens
  (e.g. EUR → EURC *and* EUR0). Build a canonical `ISO → token address` map from `GET /tokens`
  (pick one canonical token per currency; verified: USD→USDC `0xa0b8…eb48`, EUR has EURC
  `0x1aba…c33c` and EUR0 `0x3c89…8e49` — decide which is canonical).

---

## 5. Architecture — pick one

**Option A (recommended long-term): add public endpoints to the core API.**
Have the Sera API team expose CORS-enabled `GET /api/v1/rates` and `/quote` computed from the
book server-side. Then the frontend needs **no key and no extra infra** — just point at
`https://api.sera.cx/api/v1`. Cleanest; makes the marketing literally true.

**Option B (fast, self-contained): a Cloudflare Worker rates layer.**
```
Sera core API (auth, no CORS)                 Cloudflare Worker (free)
  GET /orders (book) ───────► reads book with Bearer key (server-side)
  GET /tokens, /markets ─────► builds ISO↔token map, computes mids
                                    │ caches (KV), refreshes on a Cron Trigger (e.g. 60s)
                                    ▼  responds with CORS: *
  browser ◄──── GET /quote, /latest, rates.json ◄──┘
```
- Holds the `sera_...` key + secret as **Worker secrets** (`wrangler secret put`), never in code.
- Cron Trigger every 60s → refresh mids → store in KV → serve from cache (don't hit the core
  API per visitor; also protects your key's rate limits).
- ~1 file. Deploy under e.g. `rates.sera.cx` or `fx.sera.cx/api/*` (via a route).

Either way the output contract is §3.

---

## 6. Flip the frontend to live (2 lines)

In [`index.html`](index.html), search for the rates block:
```js
const LIVE_RATES_ENABLED = false;                 // → true
const API_BASE = 'https://api.sera.cx/api/v1';    // → your rates-layer base (Worker URL / core API)
```
Set the flag `true` and `API_BASE` to the rates layer, commit, push to `main` (auto-deploys via
GitHub Pages). The hero + converter then fetch every 60s and fall back silently to the demo if
the layer is unreachable. No other frontend changes needed for phase 1.

---

## 7. Security — non-negotiable

- **Never** put the `sera_...` key/secret in the frontend, `index.html`, or this public repo.
  It stays a server-side secret (Worker secret / core-API env). A key in the static site is
  exposed to the world instantly.
- The key's wallet can place orders/withdraw — treat it like funds. Use a dedicated,
  minimally-funded key for read/quoting if the flow allows; confirm read-only scoping with the
  Sera core team.
- Serve the rates layer over HTTPS with `Access-Control-Allow-Origin: https://fx.sera.cx`
  (or `*` if you want the public API open, which the marketing implies).

---

## 7b. Auth & onboarding — Privy-gated

Requirement: **users must sign in with Privy before they can get API access / call rates.**
Privy is the front door; Sera's wallet-signed key flow sits behind it.

**Sera Privy app (from the fx-old.sera.cx bundle — public client identifiers):**
- App ID: `cmhlmwd0a00nyl20b4m7dpgci`
- Client ID: `client-WY6SV4c27aXjfYUVgVZZzZj7XQb6vUjurCKoGDQzRpbR6`
- The Privy **app secret** (server-side token verification) comes from the Privy dashboard —
  keep it a server secret, never in the frontend. Confirm whether to reuse this same app for
  the new fx.sera.cx or spin up a dedicated one (and add fx.sera.cx to Privy's allowed origins).

**Onboarding flow:**
1. User hits the dashboard → **Privy login** (email / social / external wallet). Privy
   provisions an **embedded wallet** for users without one — so everyone gets a signer.
2. That wallet signs Sera's **EIP-712 `ManageApiKey` (`POST /api-keys`, action=create)** —
   gasless, read-only key (see §2). User receives `api_key` + `api_secret`.
3. Dashboard shows the key + a copy-paste snippet. Calls use `Authorization: Bearer key:secret`
   against the rates layer (server-side; never ship the key to a browser — §7).

**Enforcement point:** gate **API-key issuance and authenticated rate calls** behind a valid
Privy session (verify the Privy token server-side before minting/serving). Do **not** gate the
public rate pages — keep them open for conversion + SEO/GEO.

**SEO the public rates (product decision — "so Google can call it"):** the public-facing rate
values must be **crawlable**, i.e. rendered into **server-side/static HTML at build time**, not
injected only by client JS (Googlebot/AI crawlers won't reliably run the fetch). Concretely:
- Bake the current rate into the HTML of each public page, refreshed by the rates layer on a
  build/cron (SPEC §4 snapshot model), with client JS layering the live update on top.
- The indexable rate surface is the **programmatic `/convert/{base}-to-{quote}` pages**
  (SPEC §3): one per pair, rate in the markup, plus `FAQPage` + a rates `Dataset` JSON-LD so
  search and LLMs can extract "1 EUR = 1.08 USD" with attribution. These pages are public and
  ungated even though the API/dashboard behind them requires Privy.

**Tradeoff to confirm with product:** a hard login gate removes the anonymous *keyless* tier,
which is the biggest AI-citation / quick-adoption lever. Reconciliation: Privy-gate the
**human dashboard + key issuance**, but still allow (a) the public on-page demo and (b)
issued keys to work headless for agents/servers. If a fully keyless public tier is wanted
later, it can sit alongside the gated one.

## 8. Open questions to resolve with the Sera core team

1. Exact **`GET /orders` response** for reading best bid/ask — is there a depth/top-of-book
   variant, or do we page orders and compute? What are the **rate limits**? (Note: API keys are
   already **read-only** per the docs, so a quoting key can't trade — good.)
2. **Canonical token per ISO currency** (e.g. EUR → EURC or EUR0?) and the official currency list
   behind the "160+ currencies" claim.
3. Preferred hosting for the layer — **core-API endpoints (Option A)** or **Worker (Option B)**?
4. Is a simple public rates endpoint on the **roadmap**? If yes soon, we may skip the Worker.
5. **Privy app**: reuse the existing `cmhlmwd0a00nyl20b4m7dpgci` app for fx.sera.cx, or a new one?
   Either way, add `https://fx.sera.cx` to the Privy allowed origins and get the app secret.

---

## 9. Quick verification snippets

```bash
# public, works today
curl https://api.sera.cx/api/v1/health
curl https://api.sera.cx/api/v1/tokens        # ISO↔token map source
curl https://api.sera.cx/api/v1/markets       # 780 markets, no prices

# authenticated read (needs your key) — this is where prices come from
curl -H "Authorization: Bearer sera_XXX:SECRET" \
  "https://api.sera.cx/api/v1/orders?symbol=EURC/USDC"
```

Frontend integration points live in `index.html` (`LIVE_RATES_ENABLED`, `API_BASE`,
`pullQuote`, `hydrateConverter`). Target contract: `openapi.yaml`. Broader architecture
rationale: `SPEC.md` §4.
