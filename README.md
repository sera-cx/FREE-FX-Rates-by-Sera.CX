# FREE FX Rates by Sera.CX

Marketing + landing site for **Sera FX** — the free, real-time FX rates API.
Live at **[fx.sera.cx](https://fx.sera.cx)**, hosted on GitHub Pages.

Real-time buy, sell and mid-market rates across 160+ currencies, updated every 60 seconds.
Free forever — no credit card, no paid tier, commercial use allowed. Powered by Sera's
on-chain FX settlement engine. API at `api.sera.cx/v1`, docs at [docs.sera.cx](https://docs.sera.cx).

## Structure
- `index.html` — the single-page site (self-contained: inline CSS/JS, Google Fonts).
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
- The homepage converter/ticker currently uses illustrative simulated rates (as designed).
  Wire them to the live `api.sera.cx` endpoints once `/v1/quote` etc. are public + CORS-enabled.
- Deploy: pushing to `main` publishes to GitHub Pages. Set DNS `fx CNAME sera-cx.github.io`
  and enable "Enforce HTTPS" once the certificate provisions.
