import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Builds the Privy-gated dashboard app into ../dashboard (served at fx.sera.cx/dashboard/).
// The marketing site + /convert SEO pages stay static — only this app is React.
export default defineConfig({
  base: '/dashboard/',
  plugins: [react()],
  build: { outDir: '../dashboard', emptyOutDir: true },
});
