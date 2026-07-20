# Sera FX — Team Handover Brief

One brief, two readers: **Part A — Infra** (deploy the site now) and **Part B — Backend**
(wire live rates later). Deep-dive docs referenced throughout: `HANDOVER.md`, `INFRA.md`,
`AGENTS.md`, `SPEC.md`, `openapi.yaml`.

---

## TL;DR / current state

- The **website is built and self-contained**: marketing page, 90 programmatic `/convert/*` SEO
  pages, and a React **`/dashboard/`** app (Privy login → mint API key). Repo:
  `sera-cx/FREE-FX-Rates-by-Sera.CX`.
- It **runs today on simulated rates** — no backend required to launch. Numbers are illustrative
  (clearly "live" styled but generated client-side).
- **Plan: ship the site first (Part A), add the live rates API second (Part B).** The two are
  decoupled by design — deploying with simulated rates is safe and expected for launch.
- The only site feature that needs the backend is the dashboard's **actual key issuance**; the
  rest of the site is fully functional standalone.

Two-phase rollout:
| Phase | Owner | Outcome |
|---|---|---|
| **1 — Deploy** | Infra | fx.sera.cx live: site + converter + SEO pages + dashboard shell (Privy login) |
| **2 — Live rates** | Backend | `rates.sera.cx` serves real rates; dashboard mints real keys; site flipped to live |

---

# PART A — INFRA (do first: get fx.sera.cx live)

## What's already done (your pipeline — nice)
- ✅ **Dockerfile** (multi-stage: builds the React app, nginx serves the static site + built `/dashboard/`).
- ✅ **CI** `publish-image.yml` → `ghcr.io/sera-cx/free-fx-rates-by-sera.cx:latest`, self-hosted deploy.
- ✅ **compose.server.yaml** (hardened, read-only, binds `127.0.0.1:8080`).
- ✅ App built with `VITE_RATES_BASE=https://rates.sera.cx`, `VITE_KEYS_ENDPOINT=https://rates.sera.cx/api-keys`.

## What's left to launch the site
1. **DNS** — point **`fx.sera.cx`** at the deploy server.
2. **TLS** — terminate HTTPS at the reverse proxy in front of the container (`127.0.0.1:8080`).
   (The container speaks plain HTTP on 8080 by design.)
3. **Privy origin** — in the Privy dashboard for app **`cmhlmwd0a00nyl20b4m7dpgci`**, add allowed
   origin **`https://fx.sera.cx`**. This makes the dashboard's "Connect with Privy" modal open.
   (Login will work; the final *key mint* completes in Phase 2 when the API exists.)

## Nothing else is required for launch
- The site does **not** call the backend for the marketing page, converter, or `/convert` pages —
  those use built-in simulated rates. So `rates.sera.cx` can be absent and the site still works.
- `dashboard/` build output is committed but the Docker build regenerates it — you can `.gitignore`
  it if you prefer (optional cleanup).

## Acceptance checks (Phase 1 done when)
- `https://fx.sera.cx` loads over HTTPS, valid cert.
- `https://fx.sera.cx/convert/eur-to-usd/` renders with a rate + working converter.
- `https://fx.sera.cx/dashboard/` loads; "Connect with Privy" opens the Privy modal.
- `https://fx.sera.cx/healthz` returns `ok` (container health).
- `robots.txt`, `sitemap.xml`, `llms.txt` reachable at the root.

---

# PART B — BACKEND (do later: live rates at rates.sera.cx)

## The gap in one paragraph
The website is wired to call **`https://rates.sera.cx`** for real numbers, but that service
doesn't exist yet. It can't just be the core API: **`api.sera.cx/api/v1` is a signed on-chain
orderbook** — no price/quote endpoint, **no CORS**, and prices require an API key. So we need a
thin **rates layer** that reads the orderbook server-side, computes rates, and serves clean
CORS-enabled JSON. A reference implementation is in **`worker/`** (Cloudflare Worker); build it
there or replicate the same endpoints in your own service at `rates.sera.cx`.

## What `rates.sera.cx` must serve (CORS-enabled, `Access-Control-Allow-Origin: *`)
| Route | Returns | Auth |
|---|---|---|
| `GET /quote?from=EUR&to=USD` | `{ buy, mid, sell, asOf }` | none (keyless) |
| `GET /latest?base=EUR` | `{ base, asOf, rates: { USD, … } }` | none |
| `GET /convert?amount=&from=&to=` | `{ amount_out, rate, asOf }` | none |
| `GET /health` | `{ status, asOf }` | none |
| `POST /api-keys` | proxy → core API `/api-keys`, returns `{ api_key, api_secret }` | none (payload is signed) |

Contract: `openapi.yaml` + reference code `worker/src/index.js`. Keyless reads are intentional
(reach/SEO/agents); an optional API key raises limits.

## Steps
1. **Deploy the rates layer** — either `wrangler deploy` the `worker/` and bind `rates.sera.cx`,
   or implement the same routes in your stack. (Or serve it at `fx.sera.cx/api` and change one
   build arg — see "domain choice" below.)
2. **Mint a read-only Sera API key** — wallet signs EIP-712 `ManageApiKey` (gasless; exact spec
   in `HANDOVER.md` §2). Store as secrets **`SERA_API_KEY`**, **`SERA_API_SECRET`** on the rates
   service. Keys are **read-only** (can't trade/withdraw) — safe to hold.
3. **Implement the live rate source** — `worker/src/sera.js` → `loadRatesFromSera()`: read core
   `GET /orders` best bid/ask → **rate = mid = (bid+ask)/2**; cross-rate thin pairs via a USDC
   hub; fall back to last-known on illiquid pairs. Confirm the exact `/orders` response shape and
   the **canonical token per ISO currency** (e.g. EUR → EURC vs EUR0). Until implemented, the
   layer returns simulated rates.
4. **The `/api-keys` proxy** — the browser can't POST to the core API (its CORS doesn't allowlist
   `fx.sera.cx`). The rates layer forwards the client-signed payload server-side (already coded in
   `worker/src/index.js`). Alternative: add `fx.sera.cx` to the **core API CORS allowlist** and
   POST directly (then this proxy is optional).

## Flip the site to live (small, after the layer is up)
- `index.html`: set `LIVE_RATES_ENABLED = true`, `API_BASE = 'https://rates.sera.cx'`.
- `/convert/*`: in `scripts/build-convert.mjs`, swap the client `setInterval` sim for
  `fetch('https://rates.sera.cx/quote?...')`, then `node scripts/build-convert.mjs`.
- The React app is already wired via the Docker build args — no change needed.

## Acceptance checks (Phase 2 done when)
- `curl https://rates.sera.cx/quote?from=EUR&to=USD` → real `{buy,mid,sell}` with CORS header.
- Dashboard: connect Privy → sign → **real key issued** (via `/api-keys` proxy).
- Homepage hero/converter + a `/convert` page show live (non-simulated) numbers.

---

## Shared reference

| Thing | Value |
|---|---|
| Website | `fx.sera.cx` (Docker/nginx image, `ghcr.io/sera-cx/free-fx-rates-by-sera.cx:latest`) |
| Rates layer | `rates.sera.cx` — `/quote` `/latest` `/convert` `/health` `/api-keys`, CORS (ref: `worker/`) |
| Core API | `https://api.sera.cx/api/v1` (signed on-chain orderbook; API key = read-only) |
| Secrets (rates layer) | `SERA_API_KEY`, `SERA_API_SECRET` |
| Privy app id / client id | `cmhlmwd0a00nyl20b4m7dpgci` / `client-WY6SV4c27aXjfYUVgVZZzZj7XQb6vUjurCKoGDQzRpbR6` |
| Key mint | `POST /api-keys` (EIP-712 `ManageApiKey`) via the rates-layer proxy |

**Domain choice:** `rates.sera.cx` is a placeholder name adopted in the Docker build args. If you'd
rather serve rates as a path on the same host (`fx.sera.cx/api`), change `VITE_RATES_BASE` /
`VITE_KEYS_ENDPOINT` (Dockerfile build args) + `API_BASE` in `index.html` — no rearchitecting.

## Repo map
- `index.html`, `404.html`, favicons, `robots.txt`, `llms.txt`, `sitemap*.xml` — static site.
- `convert/` (generated), `scripts/build-convert.mjs`, `data/currencies.json` — SEO pair pages.
- `app/` — React + Privy dashboard source; builds to `dashboard/`.
- `worker/` — rates layer (Cloudflare Worker), reference implementation.
- `mcp/` — MCP server for AI agents (`get_rate`/`convert`/`settle`).
- `Dockerfile`, `docker/nginx.conf`, `compose*.yaml`, `.github/workflows/publish-image.yml` — deploy.
- Docs: `TEAM-BRIEF.md` (this), `HANDOVER.md`, `INFRA.md`, `AGENTS.md`, `PLANNING.md`, `SPEC.md`, `GROWTH.md`.
