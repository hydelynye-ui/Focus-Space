import { defineConfig } from 'vite';

export default defineConfig({
  root: 'public',
  publicDir: '../static',
  base: '/',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    assetsDir: 'assets'
  }
});
