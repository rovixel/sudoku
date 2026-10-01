import { defineConfig } from 'vite';

export default defineConfig({
  // Relative base so dist/ works from any static host or sub-path.
  base: './',
  build: {
    target: 'es2020',
    assetsInlineLimit: 0,
    chunkSizeWarningLimit: 2000,
  },
  server: { port: 5173 },
});
