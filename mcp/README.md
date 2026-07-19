# Sera FX — MCP server

Exposes Sera's FX rates to AI agents as three tools:
- **`get_rate`** — live buy/sell/mid for a pair (free, no key)
- **`convert`** — amount conversion at mid (free, no key)
- **`settle`** — route an on-chain settlement through Sera (needs a Sera wallet + key)

`get_rate` and `convert` call the rates layer (`../worker`), so agents get real numbers with
zero credentials — the frictionless top of the funnel. `settle` is the economic action that
turns a reader into a Sera network participant.

## Run
```bash
cd mcp
npm install
# point at your rates layer (defaults to http://localhost:8787 for local worker dev):
export SERA_RATES_BASE="https://sera-fx-rates.<account>.workers.dev"
npm start
```

## Add to Claude Desktop / Code
```jsonc
// claude_desktop_config.json → "mcpServers"
{
  "sera-fx": {
    "command": "node",
    "args": ["/absolute/path/to/mcp/src/index.js"],
    "env": {
      "SERA_RATES_BASE": "https://rates.sera.cx",
      "SERA_API_KEY": "sera_pk_…",      // optional, enables settle
      "SERA_API_SECRET": "…"
    }
  }
}
```

## Distribution
Publish to the MCP registries so any agent framework can add Sera in one line — the highest-
leverage agentic-growth move (see `../AGENTS.md` §9). `settle` needs the wallet/key flow
(`../HANDOVER.md`, `../AGENTS.md`).
