# Go-live checklist

Hosting is handled by the Docker/CI pipeline in this repo (build image → GHCR →
self-hosted deploy via `compose.server.yaml`; nginx serves the static site + the built
`/dashboard/` app). This list is the **remaining cross-team dependencies** to actually go live.

## Already done (infra pipeline)
- ✅ Dockerfile (multi-stage: builds the React app, nginx serves everything on :8080)
- ✅ CI `publish-image.yml` → `ghcr.io/sera-cx/free-fx-rates-by-sera.cx:latest`, self-hosted deploy
- ✅ App built with `VITE_RATES_BASE=https://rates.sera.cx`, `VITE_KEYS_ENDPOINT=https://rates.sera.cx/api-keys`

## 1. DNS + TLS  (infra)
- Point **`fx.sera.cx`** at the deploy server; terminate **TLS** at the reverse proxy in front
  of the container (`127.0.0.1:8080`). (CNAME to GitHub Pages was removed — correct.)

## 2. Stand up `rates.sera.cx`  ← critical, everything depends on it
The app, the `/convert` pages, and the MCP server all call `https://rates.sera.cx`. It must
serve, **CORS-enabled**: `GET /quote` `/latest` `/convert` `/health` and **`POST /api-keys`**
(proxy to the core API). Two options:
- **Use the worker in `worker/`** (Cloudflare Worker) — deploy it and bind `rates.sera.cx`; or
- **Build the same endpoints** into your own service at that hostname (contract: `openapi.yaml`
  + `worker/src/index.js` as the reference; rate = orderbook mid).
Then:
- **Mint a read-only Sera API key** (wallet, EIP-712 gasless — `HANDOVER.md` §2) and set it as
  secrets: `SERA_API_KEY`, `SERA_API_SECRET`.
- **Implement the live rate source** (`worker/src/sera.js` → read core `/orders` best bid/ask →
  mid; confirm the `/orders` shape + canonical token per ISO currency). Until then it serves
  simulated rates.

## 3. Privy — allow the origin  (infra/admin)
In the Privy dashboard for app **`cmhlmwd0a00nyl20b4m7dpgci`**:
- **Add allowed origin `https://fx.sera.cx`** (+ any staging). This is what makes the login
  modal open. Confirm email/social/wallet login + embedded wallets are on.

## 4. Core API — CORS  (optional)
- We route rate reads + key minting through `rates.sera.cx`, so no core-API CORS change is
  strictly needed. If you ever want direct browser calls, add `https://fx.sera.cx` to the core
  API CORS allowlist.

## 5. Flip the marketing site to live rates  (dev, small)
The React app is already wired via build args. Two spots still on simulated data:
- `index.html`: set `LIVE_RATES_ENABLED = true`, `API_BASE = 'https://rates.sera.cx'`.
- `/convert/*`: in `scripts/build-convert.mjs`, swap the client `setInterval` sim for a
  `fetch('https://rates.sera.cx/quote?...')`, then re-run `node scripts/build-convert.mjs`.

## 6. Optional / later
- Submit `sitemap.xml` to Google Search Console + Bing Webmaster Tools.
- `dashboard/` build output is committed but the Docker build regenerates it — can be
  `.gitignore`d to avoid churn.

## Quick reference
| Thing | Value |
|---|---|
| Site image | `ghcr.io/sera-cx/free-fx-rates-by-sera.cx:latest` (nginx :8080) |
| Site domain | `fx.sera.cx` → deploy server (TLS at proxy) |
| Rates layer | `rates.sera.cx` — `/quote` `/latest` `/convert` `/api-keys`, CORS (see `worker/`) |
| Secrets | `SERA_API_KEY`, `SERA_API_SECRET` (read-only Sera key) |
| Privy app id | `cmhlmwd0a00nyl20b4m7dpgci` (add origin `https://fx.sera.cx`) |
| Core API | `https://api.sera.cx/api/v1` (signed orderbook; API key = read-only) |
| Key mint | `POST /api-keys` (EIP-712 ManageApiKey) via `rates.sera.cx` proxy |
