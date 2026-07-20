# Sera FX — Team Handover Brief

One brief, two readers: **Part A — Infra** and **Part B — Backend**.
Repo: `sera-cx/FREE-FX-Rates-by-Sera.CX` · Site: **https://fx.sera.cx** (live)
Deeper docs: `HANDOVER.md`, `AGENTS.md`, `SPEC.md`, `openapi.yaml`.

---

## Status at a glance (verified live)

| Area | State |
|---|---|
| **Website `fx.sera.cx`** | ✅ **LIVE** — DNS + TLS (Cloudflare), container healthy, all pages 200 |
| **Deploy pipeline** | ✅ Docker → GHCR → self-hosted, auto-deploys on push to `main` |
| **Privy login** | ✅ Origin allowlisted — login modal opens on the live dashboard |
| **Rates backend `rates.sera.cx`** | ❌ **DOES NOT EXIST** (DNS doesn't resolve) — the only real gap |
| **Rates shown on site** | ⚠️ **Simulated** (client-generated) until the backend is up |
| **Dashboard "Generate key"** | ⚠️ Fails — it POSTs to `rates.sera.cx/api-keys`, which isn't there yet |

**Bottom line: the site half is done. The remaining work is entirely Part B (the rates backend).**

> ⚠️ Because key issuance isn't wired yet, don't promote "grab your free key" widely until
> Part B ships — users would hit an error after logging in.

---

# PART A — INFRA ✅ complete

Nothing outstanding. Recorded here so it's documented.

**Done:**
- **Dockerfile** — multi-stage: builds the React dashboard app, nginx serves the static site +
  built `/dashboard/` on `:8080`.
- **CI** `publish-image.yml` — push to `main` → build → `ghcr.io/sera-cx/free-fx-rates-by-sera.cx:latest`
  → self-hosted deploy (`compose.server.yaml`, hardened/read-only, bound to `127.0.0.1:8080`).
- **DNS + TLS** — `fx.sera.cx` live behind Cloudflare, HTTPS valid, TLS terminated at the proxy.
- **Privy** — `https://fx.sera.cx` added to allowed origins for app `cmhlmwd0a00nyl20b4m7dpgci`.
- App built with `VITE_RATES_BASE=https://rates.sera.cx`, `VITE_KEYS_ENDPOINT=https://rates.sera.cx/api-keys`.

**Verified live:** `/` · `/convert/eur-to-usd/` · `/dashboard/` · `/healthz` · `/robots.txt` · `/llms.txt` all 200.

**Only future infra ask:** a DNS record / route for **`rates.sera.cx`** once Backend decides where
that service runs (a Cloudflare Worker provisions its own; a self-hosted service needs a subdomain).

---

# PART B — BACKEND ⬅ the remaining work

## The gap in one paragraph
The site is wired to call **`https://rates.sera.cx`** for real numbers, but that service doesn't
exist. It can't just be the core API: **`api.sera.cx/api/v1` is a signed on-chain orderbook** —
it has **no price/quote endpoint**, **no CORS**, and prices require an API key. So we need a thin
**rates layer** that reads the orderbook server-side, computes rates, and serves clean
CORS-enabled JSON. A working reference implementation is in **`worker/`** (Cloudflare Worker,
currently returning simulated rates) — deploy that, or replicate the same endpoints in your stack.

## What `rates.sera.cx` must serve
CORS-enabled (`Access-Control-Allow-Origin: *`). Contract: `openapi.yaml` + `worker/src/index.js`.

| Route | Returns | Auth |
|---|---|---|
| `GET /quote?from=EUR&to=USD` | `{ buy, mid, sell, asOf }` | none (keyless) |
| `GET /latest?base=EUR` | `{ base, asOf, rates: { USD, … } }` | none |
| `GET /convert?amount=&from=&to=` | `{ amount_out, rate, asOf }` | none |
| `GET /health` | `{ status, asOf }` | none |
| `POST /api-keys` | proxy → core API, returns `{ api_key, api_secret }` | none (payload is signed) |

Keyless reads are intentional (SEO, AI agents, adoption); an optional API key raises limits.

## Steps
1. **Deploy the rates layer** — `cd worker && wrangler deploy`, bind `rates.sera.cx`. (Or implement
   the same routes in your own service. Or serve at `fx.sera.cx/api` — see "domain choice".)
2. **Mint a read-only Sera API key** — a wallet signs EIP-712 `ManageApiKey` (gasless; exact spec in
   `HANDOVER.md` §2). Store as secrets **`SERA_API_KEY`** / **`SERA_API_SECRET`**.
   Keys are **read-only** — they can't trade or withdraw, so they're safe for a rates service.
3. **Implement the live rate source** — `worker/src/sera.js` → `loadRatesFromSera()`:
   read core `GET /orders` best bid/ask → **rate = mid = (bid + ask) / 2**; cross-rate thin pairs
   via a USDC hub; fall back to last-known on illiquid pairs (many of the 780 markets are thin —
   `POST /swap/quote` often returns `no_liquidity`).
   **Confirm two things:** the exact `GET /orders` response shape, and the **canonical token per ISO
   currency** (e.g. EUR → `EURC` vs `EUR0`).
4. **`POST /api-keys` proxy** — already coded in `worker/src/index.js`. Needed because the browser
   can't POST to the core API (its CORS doesn't allowlist `fx.sera.cx`). The client signs, this
   forwards server-side. *Alternative:* add `https://fx.sera.cx` to the core API CORS allowlist and
   POST directly — then the proxy is optional.

## Flip the site to live (small, after the layer is up)
- `index.html`: set `LIVE_RATES_ENABLED = true` and `API_BASE = 'https://rates.sera.cx'`.
- `/convert/*`: in `scripts/build-convert.mjs`, swap the client `setInterval` sim for
  `fetch('https://rates.sera.cx/quote?...')`, then re-run `node scripts/build-convert.mjs`.
- The React dashboard app needs no change — it's already wired via the Docker build args.

## Acceptance checks (Part B done when)
- `curl "https://rates.sera.cx/quote?from=EUR&to=USD"` → real `{buy,mid,sell}` **with** a CORS header.
- Dashboard: connect Privy → sign → **a real key is issued**.
- Homepage hero + a `/convert` page show live (non-simulated) numbers.

---

## Shared reference

| Thing | Value |
|---|---|
| Website | `fx.sera.cx` — image `ghcr.io/sera-cx/free-fx-rates-by-sera.cx:latest` (nginx :8080) |
| Rates layer (to build) | `rates.sera.cx` — `/quote` `/latest` `/convert` `/health` `/api-keys`, CORS |
| Core API | `https://api.sera.cx/api/v1` — signed on-chain orderbook; API key = read-only |
| Secrets (rates layer) | `SERA_API_KEY`, `SERA_API_SECRET` |
| Privy app / client id | `cmhlmwd0a00nyl20b4m7dpgci` / `client-WY6SV4c27aXjfYUVgVZZzZj7XQb6vUjurCKoGDQzRpbR6` |
| Key mint | `POST /api-keys` — EIP-712 `ManageApiKey` (owner, action, timestamp) |
| Rate definition | orderbook **mid** = (best_bid + best_ask) / 2 |

**Domain choice:** `rates.sera.cx` is a placeholder adopted in the Docker build args. To serve rates
as a path on the same host (`fx.sera.cx/api`) instead, change `VITE_RATES_BASE` /
`VITE_KEYS_ENDPOINT` (Dockerfile build args) + `API_BASE` in `index.html`. No rearchitecting.

## Repo map
- `index.html`, `404.html`, favicons, `robots.txt`, `llms.txt`, `sitemap*.xml` — static site
- `convert/` (generated) + `scripts/build-convert.mjs` + `data/currencies.json` — 90 SEO pair pages
- `app/` — React + Privy dashboard source → builds to `dashboard/`
- `worker/` — rates layer reference implementation
- `mcp/` — MCP server for AI agents (`get_rate` / `convert` / `settle`)
- `Dockerfile`, `docker/nginx.conf`, `compose*.yaml`, `.github/workflows/publish-image.yml` — deploy
- Docs: `TEAM-BRIEF.md` (this) · `HANDOVER.md` · `AGENTS.md` · `PLANNING.md` · `SPEC.md` · `GROWTH.md`
