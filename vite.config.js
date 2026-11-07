import { defineConfig } from 'vite';

export default defineConfig({
  root: 'public',
  // Keep .env.local and .env.example at the repository root, not inside public/.
  envDir: process.cwd(),
  publicDir: '../static',
  base: '/',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    assetsDir: 'assets'
  }
});
