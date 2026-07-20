import React, { useMemo, useState } from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { mintApiKey, KEYS_ENDPOINT } from './sera.js';

const RATES_BASE = import.meta.env.VITE_RATES_BASE || 'https://rates.sera.cx';

function Snippets({ apiKey, apiSecret }) {
  const [lang, setLang] = useState('curl');
  const snippets = useMemo(() => ({
    curl: `curl -H "Authorization: Bearer ${apiKey}:${apiSecret}" \\\n  "${RATES_BASE}/quote?from=EUR&to=USD"`,
    js: `const res = await fetch("${RATES_BASE}/quote?from=EUR&to=USD", {\n  headers: { Authorization: "Bearer ${apiKey}:${apiSecret}" }\n});\nconst { buy, mid, sell } = await res.json();`,
    py: `import requests\nr = requests.get("${RATES_BASE}/quote",\n  params={"from":"EUR","to":"USD"},\n  headers={"Authorization": "Bearer ${apiKey}:${apiSecret}"})\nprint(r.json()["mid"])`,
    mcp: `{\n  "sera-fx": {\n    "command": "node",\n    "args": ["/path/to/mcp/src/index.js"],\n    "env": {\n      "SERA_RATES_BASE": "${RATES_BASE}",\n      "SERA_API_KEY": "${apiKey}",\n      "SERA_API_SECRET": "${apiSecret}"\n    }\n  }\n}`,
  }), [apiKey, apiSecret]);
  return (
    <>
      <div className="tabs">
        {['curl', 'js', 'py', 'mcp'].map((l) => (
          <span key={l} className={'tab' + (l === lang ? ' active' : '')} onClick={() => setLang(l)}>
            {l === 'js' ? 'JavaScript' : l === 'py' ? 'Python' : l.toUpperCase()}
          </span>
        ))}
      </div>
      <pre>{snippets[lang]}</pre>
    </>
  );
}

function CopyRow({ label, value }) {
  const [done, setDone] = useState(false);
  return (
    <div className="keyrow">
      <span className="lbl">{label}</span>
      <code>{value}</code>
      <button className={'copy' + (done ? ' done' : '')} onClick={() => {
        navigator.clipboard.writeText(value); setDone(true); setTimeout(() => setDone(false), 1500);
      }}>{done ? 'Copied' : 'Copy'}</button>
    </div>
  );
}

export default function App() {
  const { ready, authenticated, user, login, logout } = usePrivy();
  const { wallets } = useWallets();
  const [key, setKey] = useState(null);
  const [minting, setMinting] = useState(false);
  const [err, setErr] = useState('');

  const wallet = wallets?.[0];
  const addr = wallet?.address || user?.wallet?.address || '';

  async function onMint() {
    setErr(''); setMinting(true);
    try {
      if (!wallet) throw new Error('No wallet available yet — try again in a moment.');
      setKey(await mintApiKey(wallet));
    } catch (e) {
      setErr(e.message || String(e));
    } finally {
      setMinting(false);
    }
  }

  return (
    <>
      <header><div className="bar">
        <a className="logo" href="/"><img src="/assets/sera-mark.png" alt="Sera" /> Sera <span>FX</span></a>
        <div className="nav-right">
          {authenticated && <button className="btn-ghost" onClick={logout}>Sign out</button>}
          <a className="nav-back" href="/">← site</a>
        </div>
      </div></header>

      <main className="wrap">
        <div className="card">
          {!ready && <p className="sub">Loading…</p>}

          {ready && !authenticated && (
            <>
              <div className="eyebrow">Free API key</div>
              <h1>Connect once, <em>call forever.</em></h1>
              <p className="sub">Sign in with Privy — email, social, or wallet. We create a wallet if you don't have one, so getting a key is two clicks and no forms.</p>
              <button className="btn" onClick={login}>Connect with Privy</button>
              <ol className="steps">
                <li><span className="n">1</span><div>Sign in (email / social / wallet).</div></li>
                <li><span className="n">2</span><div>Sign once to mint a read-only key — gasless, no funds.</div></li>
                <li><span className="n">3</span><div>Copy your key + a snippet. Start calling rates.</div></li>
              </ol>
            </>
          )}

          {ready && authenticated && !key && (
            <>
              <div className="eyebrow">Connected</div>
              <h1>Mint your <em>read-only</em> key.</h1>
              <div className="conn"><span className="dot" /> {addr ? addr.slice(0, 6) + '…' + addr.slice(-4) : 'preparing wallet…'} · via Privy</div>
              <p className="sub">One signature (EIP-712, gasless) creates a read-only key. It can read rates — it can't trade or move funds.</p>
              <button className="btn" onClick={onMint} disabled={minting}>{minting ? 'Signing…' : 'Generate API key'}</button>
              {err && <p className="err">{err}</p>}
            </>
          )}

          {ready && authenticated && key && (
            <>
              <div className="eyebrow">Your key</div>
              <h1>You're <em>in.</em></h1>
              <p className="sub">Send it as <code className="inl">Authorization: Bearer key:secret</code>. Keep the secret server-side — it's shown once.</p>
              <CopyRow label="key" value={key.api_key} />
              <CopyRow label="secret" value={key.api_secret} />
              <Snippets apiKey={key.api_key} apiSecret={key.api_secret} />
              <p className="hint">Rates base: {RATES_BASE} · keyless calls work too (lower limits) · Docs: docs.sera.cx</p>
            </>
          )}
        </div>
        <p className="foot">Endpoint: {KEYS_ENDPOINT}</p>
      </main>
    </>
  );
}
