import React from 'react';
import { createRoot } from 'react-dom/client';
import { PrivyProvider } from '@privy-io/react-auth';
import App from './App.jsx';
import './styles.css';

// Sera's Privy app (public client identifiers, from fx-old.sera.cx).
const PRIVY_APP_ID = 'cmhlmwd0a00nyl20b4m7dpgci';
const PRIVY_CLIENT_ID = 'client-WY6SV4c27aXjfYUVgVZZzZj7XQb6vUjurCKoGDQzRpbR6';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <PrivyProvider
      appId={PRIVY_APP_ID}
      clientId={PRIVY_CLIENT_ID}
      config={{
        appearance: { theme: 'light', accentColor: '#00D26A', logo: '/apple-icon-180x180.png' },
        loginMethods: ['email', 'google', 'wallet'],
        embeddedWallets: { createOnLogin: 'users-without-wallets' },
      }}
    >
      <App />
    </PrivyProvider>
  </React.StrictMode>
);
