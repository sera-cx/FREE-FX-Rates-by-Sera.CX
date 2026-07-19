/**
 * Sera core-API adapter (LIVE path) — sketch to implement.
 *
 * The core API (https://api.sera.cx/api/v1) is a signed on-chain orderbook:
 *   - public: /health /system/time /tokens /markets /config, POST /swap/quote
 *   - key-required (read-only key): /orders /fills /balances
 *     auth header: `Authorization: Bearer ${API_KEY}:${API_SECRET}`
 * There is NO price endpoint and NO CORS — so we read the book server-side here and
 * compute mids, then index.js serves them CORS-enabled.
 *
 * Product decision: rate = orderbook mid = (best_bid + best_ask) / 2.
 * Env secrets (set via `wrangler secret put`): SERA_API_KEY, SERA_API_SECRET.
 */

const CORE = 'https://api.sera.cx/api/v1';

function authHeaders(env) {
  return { Authorization: `Bearer ${env.SERA_API_KEY}:${env.SERA_API_SECRET}` };
}

/** ISO currency -> canonical token symbol. CONFIRM canonical picks (e.g. EUR: EURC vs EUR0). */
const ISO_TO_TOKEN = { USD: 'USDC', EUR: 'EURC', /* extend from GET /tokens */ };

/** Build a symbol->address map from the public token registry. */
async function tokenMap() {
  const r = await fetch(`${CORE}/tokens`);
  const { tokens } = await r.json();
  const bySymbol = {};
  for (const t of tokens) bySymbol[t.symbol] = t;
  return bySymbol;
}

/**
 * Best bid/ask for a market from the authenticated orderbook.
 * TODO: confirm GET /orders response shape + whether a top-of-book/depth variant exists.
 * Returns { bid, ask } in quote-per-base, or null if the book is empty (illiquid).
 */
async function topOfBook(env, baseSym, quoteSym) {
  const r = await fetch(`${CORE}/orders?symbol=${baseSym}/${quoteSym}`, { headers: authHeaders(env) });
  if (!r.ok) return null;
  const book = await r.json();
  // const bid = max(book.bids[*].price); const ask = min(book.asks[*].price);
  // return { bid, ask };
  return null; // implement against real shape
}

/**
 * Returns { asOf, perUSD } — units of each currency per 1 USD — via the USDC hub.
 * For each ISO currency X: mid(X, USD) from market X-token/USDC (or cross via USDC).
 * Fall back to last-known / omit on illiquid pairs (see HANDOVER §4).
 */
export async function loadRatesFromSera(env) {
  const tokens = await tokenMap();               // eslint-disable-line no-unused-vars
  const perUSD = { USD: 1 };
  // for (const [iso, sym] of Object.entries(ISO_TO_TOKEN)) {
  //   if (iso === 'USD') continue;
  //   const tob = await topOfBook(env, sym, 'USDC');
  //   if (tob) perUSD[iso] = (tob.bid + tob.ask) / 2; // USDC per 1 token ≈ per USD
  // }
  void ISO_TO_TOKEN; void topOfBook;
  return { asOf: new Date().toISOString(), perUSD };
}
