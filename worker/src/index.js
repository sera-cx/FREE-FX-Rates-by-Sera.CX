/**
 * Sera FX — Rates Layer (Cloudflare Worker)
 * -----------------------------------------
 * Serves the public, CORS-enabled rates API the static site + agents consume:
 *   GET /health
 *   GET /quote?from=EUR&to=USD            -> { buy, mid, sell, asOf }
 *   GET /latest?base=EUR                  -> { base, asOf, rates: { USD: ..., ... } }
 *   GET /convert?amount=1000&from=EUR&to=USD -> { amount_out, rate, asOf }
 *
 * Today it returns SIMULATED rates so the whole stack runs end-to-end with no key.
 * To go live: implement loadRates() against Sera's orderbook mid (best bid/ask).
 * The Sera core API needs an API key (server-side secret) and has no CORS — which is
 * exactly why this layer exists. See ../HANDOVER.md and src/sera.js.
 */

const SPREAD_BPS = 2; // half-spread applied each side for buy/sell around mid

// ISO code -> display name (extend freely; drives /latest coverage)
const CURRENCIES = {
  USD: 'US Dollar', EUR: 'Euro', GBP: 'British Pound', JPY: 'Japanese Yen',
  CHF: 'Swiss Franc', AUD: 'Australian Dollar', CAD: 'Canadian Dollar',
  NZD: 'New Zealand Dollar', CNY: 'Chinese Yuan', HKD: 'Hong Kong Dollar',
  SGD: 'Singapore Dollar', INR: 'Indian Rupee', BRL: 'Brazilian Real',
  MXN: 'Mexican Peso', ZAR: 'South African Rand', SEK: 'Swedish Krona',
  NOK: 'Norwegian Krone', DKK: 'Danish Krone', PLN: 'Polish Zloty',
  TRY: 'Turkish Lira', AED: 'UAE Dirham', SAR: 'Saudi Riyal',
  KRW: 'South Korean Won', THB: 'Thai Baht', IDR: 'Indonesian Rupiah',
  PHP: 'Philippine Peso', MYR: 'Malaysian Ringgit', NGN: 'Nigerian Naira',
};

// Reference table: units of each currency per 1 USD (approx; simulation only).
const PER_USD = {
  USD: 1, EUR: 0.9231, GBP: 0.7842, JPY: 157.2, CHF: 0.8912, AUD: 1.499,
  CAD: 1.369, NZD: 1.639, CNY: 7.242, HKD: 7.81, SGD: 1.341, INR: 83.52,
  BRL: 4.972, MXN: 17.05, ZAR: 18.32, SEK: 10.62, NOK: 10.73, DKK: 6.89,
  PLN: 3.96, TRY: 32.9, AED: 3.673, SAR: 3.751, KRW: 1361, THB: 36.1,
  IDR: 16250, PHP: 58.3, MYR: 4.69, NGN: 1490,
};

/**
 * Returns { asOf, perUSD } — units of each currency per 1 USD.
 * SIMULATED: applies a slow deterministic oscillation so rates "move".
 * TODO(live): replace with Sera orderbook mid via ./sera.js (loadRatesFromSera(env)).
 */
async function loadRates(env) {
  const now = Date.now();
  const wobble = (code, base) => {
    // ±0.15% slow sine, phase-shifted per currency; USD stays the anchor at 1.
    if (code === 'USD') return 1;
    const seed = [...code].reduce((a, c) => a + c.charCodeAt(0), 0);
    const osc = Math.sin(now / 60000 + seed) * 0.0015;
    return base * (1 + osc);
  };
  const perUSD = {};
  for (const [code, base] of Object.entries(PER_USD)) perUSD[code] = wobble(code, base);
  return { asOf: new Date(now).toISOString(), perUSD };

  // --- LIVE version (sketch) ---
  // return await loadRatesFromSera(env); // reads /orders best bid/ask, builds perUSD via USDC hub
}

function midRate(perUSD, from, to) {
  if (!(from in perUSD) || !(to in perUSD)) return null;
  return perUSD[to] / perUSD[from]; // 1 `from` = N `to`
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
  'Cache-Control': 'public, max-age=30',
};

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json', ...CORS } });

function round(n, dp = 6) { return Number(n.toFixed(dp)); }

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });
    const url = new URL(request.url);
    const p = url.searchParams;
    const up = (s) => (s || '').trim().toUpperCase();

    try {
      // Proxy key minting to the core API server-side (the browser can't POST there due to
      // the core API's CORS allowlist). The client signs ManageApiKey (EIP-712) and posts the
      // signed payload here; we forward it and return the result with CORS.
      if (url.pathname === '/api-keys' && request.method === 'POST') {
        const upstream = await fetch('https://api.sera.cx/api/v1/api-keys', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: await request.text(),
        });
        return new Response(await upstream.text(), {
          status: upstream.status,
          headers: { 'Content-Type': 'application/json', ...CORS },
        });
      }

      if (url.pathname === '/health') {
        return json({ status: 'healthy', mode: 'simulated', asOf: new Date().toISOString() });
      }

      const { asOf, perUSD } = await loadRates(env);

      if (url.pathname === '/quote') {
        const from = up(p.get('from')), to = up(p.get('to'));
        const mid = midRate(perUSD, from, to);
        if (mid == null) return json({ error: 'unknown_currency', from, to }, 400);
        const half = SPREAD_BPS / 2 / 10000;
        return json({ pair: `${from}/${to}`, buy: round(mid * (1 + half)), mid: round(mid), sell: round(mid * (1 - half)), asOf });
      }

      if (url.pathname === '/latest') {
        const base = up(p.get('base')) || 'USD';
        if (!(base in perUSD)) return json({ error: 'unknown_currency', base }, 400);
        const rates = {};
        for (const code of Object.keys(perUSD)) if (code !== base) rates[code] = round(midRate(perUSD, base, code));
        return json({ base, asOf, rates });
      }

      if (url.pathname === '/convert') {
        const from = up(p.get('from')), to = up(p.get('to'));
        const amount = Number(p.get('amount'));
        const mid = midRate(perUSD, from, to);
        if (mid == null) return json({ error: 'unknown_currency', from, to }, 400);
        if (!isFinite(amount)) return json({ error: 'bad_amount' }, 400);
        return json({ amount_out: round(amount * mid, 2), rate: round(mid), from, to, asOf });
      }

      if (url.pathname === '/currencies') {
        return json({ currencies: CURRENCIES, asOf });
      }

      return json({ error: 'not_found', routes: ['/health', '/quote', '/latest', '/convert', '/currencies'] }, 404);
    } catch (e) {
      return json({ error: 'internal', detail: String(e && e.message || e) }, 500);
    }
  },
};
