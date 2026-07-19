# Sera FX — Rates Layer (Cloudflare Worker)

The public, CORS-enabled rates API the static site + MCP server + agents consume. It exists
because Sera's core API (`api.sera.cx/api/v1`) is a signed on-chain orderbook with **no price
endpoint and no CORS** — so we read the book server-side and serve computed rates.

## Endpoints
| Route | Returns |
|---|---|
| `GET /health` | `{ status, mode, asOf }` |
| `GET /quote?from=EUR&to=USD` | `{ buy, mid, sell, asOf }` |
| `GET /latest?base=EUR` | `{ base, asOf, rates: { USD, GBP, … } }` |
| `GET /convert?amount=1000&from=EUR&to=USD` | `{ amount_out, rate, asOf }` |
| `GET /currencies` | supported ISO codes + names |

## Run locally
```bash
cd worker
npm install
npm run dev        # wrangler dev → http://localhost:8787
curl "http://localhost:8787/quote?from=EUR&to=USD"
```

## Status: SIMULATED
`src/index.js` → `loadRates()` returns simulated rates so the whole stack runs with no key.

## Go live
1. Create a **read-only Sera API key** with your wallet (EIP-712 `POST /api-keys`, gasless — see
   `../HANDOVER.md` §2). Set secrets:
   ```bash
   wrangler secret put SERA_API_KEY
   wrangler secret put SERA_API_SECRET
   ```
2. Implement `src/sera.js` → `loadRatesFromSera(env)` (read `/orders` best bid/ask, compute mid
   via the USDC hub; confirm the `/orders` shape + canonical token per currency).
3. In `src/index.js`, swap `loadRates()` to call `loadRatesFromSera(env)`.
4. (Recommended) enable the KV + cron in `wrangler.toml` to cache snapshots and refresh every
   ~60s, so visitor traffic never hits the core API directly.
5. `npm run deploy`. Point `RATES_BASE` (site + MCP) at the deployed URL / `rates.sera.cx`.

## Wire the site
In `../index.html`: set `LIVE_RATES_ENABLED = true` and `API_BASE = '<this worker URL>'`.
