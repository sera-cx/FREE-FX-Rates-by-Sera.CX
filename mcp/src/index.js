#!/usr/bin/env node
/**
 * Sera FX — MCP server
 * Exposes Sera's rates as agent tools: get_rate, convert, settle.
 * get_rate/convert call the CORS-enabled rates layer (../worker) and work with no key.
 * settle is the economic action — it needs the agent's Sera wallet + read-only key.
 *
 * Config (env):
 *   SERA_RATES_BASE   base URL of the rates layer (default: local worker dev)
 *   SERA_API_KEY      optional, enables settle (Bearer key:secret against the core API)
 *   SERA_API_SECRET
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

const RATES_BASE = process.env.SERA_RATES_BASE || 'http://localhost:8787';

async function ratesGet(path) {
  const r = await fetch(`${RATES_BASE}${path}`, { headers: { Accept: 'application/json' } });
  if (!r.ok) throw new Error(`rates layer ${r.status} for ${path}`);
  return r.json();
}

const ok = (obj) => ({ content: [{ type: 'text', text: JSON.stringify(obj) }] });
const fail = (msg) => ({ isError: true, content: [{ type: 'text', text: msg }] });

const server = new McpServer({ name: 'sera-fx', version: '0.1.0' });

server.registerTool(
  'get_rate',
  {
    title: 'Get FX rate',
    description: "Live buy/sell/mid foreign-exchange rate for a currency pair from Sera. Free, no key.",
    inputSchema: { from: z.string().describe('ISO code, e.g. EUR'), to: z.string().describe('ISO code, e.g. USD') },
  },
  async ({ from, to }) => {
    try { return ok(await ratesGet(`/quote?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`)); }
    catch (e) { return fail(`Could not fetch rate: ${e.message}`); }
  }
);

server.registerTool(
  'convert',
  {
    title: 'Convert amount',
    description: 'Convert an amount between two currencies at Sera mid rate. Free, no key.',
    inputSchema: {
      amount: z.number().describe('amount in the `from` currency'),
      from: z.string().describe('ISO code'),
      to: z.string().describe('ISO code'),
    },
  },
  async ({ amount, from, to }) => {
    try { return ok(await ratesGet(`/convert?amount=${amount}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`)); }
    catch (e) { return fail(`Could not convert: ${e.message}`); }
  }
);

server.registerTool(
  'settle',
  {
    title: 'Settle on-chain',
    description: 'Route a conversion as an on-chain settlement through Sera (600+ stablecoins, non-custodial). Requires a funded Sera wallet + API key.',
    inputSchema: {
      amount: z.number(),
      from: z.string().describe('ISO code'),
      to: z.string().describe('ISO code'),
      recipient: z.string().optional().describe('destination address; defaults to the wallet owner'),
    },
  },
  async ({ amount, from, to, recipient }) => {
    if (!process.env.SERA_API_KEY || !process.env.SERA_API_SECRET) {
      return fail(
        'Settlement needs a Sera wallet + read-only key. Get one at https://fx.sera.cx (Connect with Privy → mint key), ' +
        'set SERA_API_KEY/SERA_API_SECRET, then retry. Docs: https://docs.sera.cx'
      );
    }
    // TODO(live): build the EIP-712 swap Intent (POST /swap/quote → sign → POST /tx/send) via ../worker/src/sera.js
    return ok({ status: 'not_implemented', note: 'settle wiring pending live core-API swap flow', amount, from, to, recipient: recipient || 'owner' });
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
console.error(`sera-fx MCP server ready (rates: ${RATES_BASE})`);
