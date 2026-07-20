import { BrowserProvider } from 'ethers';

// EIP-712 ManageApiKey — exactly per docs.sera.cx/api-reference/authentication.
const DOMAIN = {
  name: 'Sera',
  version: '1',
  chainId: 1,
  verifyingContract: '0xB5C50C5D5f038404F85970b7f5B7259C4AC0E198',
};
const TYPES = {
  ManageApiKey: [
    { name: 'owner', type: 'address' },
    { name: 'action', type: 'string' },
    { name: 'timestamp', type: 'uint256' },
  ],
};

// Where to POST the signed create payload.
// Default: the rates-layer worker proxy (server-side → core API), which sidesteps the
// core API's CORS allowlist. Set VITE_KEYS_ENDPOINT to the direct core API only once
// fx.sera.cx is allowlisted there.
export const KEYS_ENDPOINT =
  import.meta.env.VITE_KEYS_ENDPOINT || 'https://rates.sera.cx/api-keys';

/**
 * Signs ManageApiKey with the connected Privy wallet and mints a read-only key.
 * Returns { api_key, api_secret } (secret is returned once).
 */
export async function mintApiKey(wallet) {
  const eip1193 = await wallet.getEthereumProvider();
  const provider = new BrowserProvider(eip1193);
  const signer = await provider.getSigner();
  const owner = wallet.address;
  const timestamp = Math.floor(Date.now() / 1000); // must be within 5 min of server time

  const signature = await signer.signTypedData(DOMAIN, TYPES, {
    owner,
    action: 'create',
    timestamp,
  });

  const res = await fetch(KEYS_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      owner_address: owner,
      action: 'create',
      timestamp,
      signature,
      label: 'Sera FX web',
    }),
  });
  if (!res.ok) throw new Error(`Key mint failed (${res.status}): ${await res.text()}`);
  return res.json(); // { api_key, api_secret }
}
