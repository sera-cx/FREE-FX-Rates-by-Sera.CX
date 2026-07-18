# Show HN

**Title:**
Show HN: Sera FX – Free FX rates API (buy/sell/mid, 160+ currencies, no card)

**URL:** https://fx.sera.cx

**First comment (post immediately as OP):**

Hi HN — we run Sera, an on-chain FX settlement engine for stablecoins. Every
cross-border payment that clears through us is priced in real time by that engine,
so we're exposing those prices as a free public API.

What it is:
- Buy, sell and mid quotes on every pair (not just a reference mid)
- 160+ currencies, refreshed every 60 seconds
- Historical data included, free
- REST + JSON, SDKs for JS/Python/PHP/Go, plus an MCP server + OpenAPI 3 for agents

Why it's actually free: we earn from the FX spread on real settlement flow, not from
selling data. Opening the feed costs us nothing extra and brings builders in. No paid
tier, no credit card, commercial use allowed.

Honest caveats: it's early. The rates are live from our CLOB; if you find a pair that
looks off, tell us here — accuracy is the whole point. Docs: https://docs.sera.cx

Happy to answer anything about the settlement engine, how we source the two-way
quotes, or the agent/MCP side.
