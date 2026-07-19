# FREE FX Rates by Sera.CX

Marketing + landing site for **Sera FX** — the free, real-time FX rates API.
Live at **[fx.sera.cx](https://fx.sera.cx)**, hosted on GitHub Pages.

Real-time buy, sell and mid-market rates across 160+ currencies, updated every 60 seconds.
Free forever — no credit card, no paid tier, commercial use allowed. Powered by Sera's
on-chain FX settlement engine. API at `api.sera.cx/v1`, docs at [docs.sera.cx](https://docs.sera.cx).

## Structure
- `index.html` — the single-page site (self-contained: inline CSS/JS, Google Fonts).
- `dashboard/` — "Connect with Privy → mint key" page (preview: simulated auth; wire real Privy).
- `worker/` — the rates layer (Cloudflare Worker): CORS-enabled `/quote` `/latest` `/convert`,
  simulated today, adapter seam for Sera's orderbook mid (`worker/src/sera.js`).
- `mcp/` — MCP server exposing `get_rate` / `convert` / `settle` to AI agents (calls the worker).
- `404.html` — branded not-found page.
- `assets/` — `sera-mark.png` (nav/footer logo), `og.png` (social share card), wordmarks.
- `favicon.*`, `apple-icon-180x180.png` — the Sera **S** favicon set.
- `robots.txt` — allows search engines **and** AI answer-engine crawlers (GEO).
- `llms.txt` / `llms-full.txt` — machine-readable summaries for LLMs.
- `sitemap.xml` — search-engine sitemap.
- `CNAME` — custom domain (`fx.sera.cx`).

## SEO / GEO baked in
Full Open Graph + Twitter Card tags, canonical URL, and JSON-LD structured data
(`Organization`, `WebSite`, `WebAPI`, `FAQPage`) so the site ranks in search and gets
cited by ChatGPT, Claude, Perplexity and Gemini.

## Planning docs
- `PLANNING.md` — strategy, SEO architecture, audience funnels.
- `SPEC.md` — implementation spec, data model, CI.
- `GROWTH.md` — distribution loops, GEO domination, GTM.

## Notes
- The homepage converter/ticker use illustrative **simulated** rates (feature-flagged via
  `LIVE_RATES_ENABLED` in `index.html`). The marketed `api.sera.cx/v1/quote` rates API does
  **not exist yet**: the real core API is a signed on-chain orderbook at `api.sera.cx/api/v1`
  (EIP-712 auth, no public price endpoint, no CORS). To go live, build a server-side rates
  layer that computes buy/mid/sell from the **orderbook mid** and serves them CORS-enabled,
  then flip the flag and point `API_BASE` at it. See `openapi.yaml` for the target contract.
- Deploy: pushing to `main` publishes to GitHub Pages. Set DNS `fx CNAME sera-cx.github.io`
  and enable "Enforce HTTPS" once the certificate provisions.
