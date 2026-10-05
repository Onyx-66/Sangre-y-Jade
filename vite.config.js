import { defineConfig } from 'vite';
import { audioCatalogPlugin } from './scripts/audio-catalog.mjs';

export default defineConfig({
  base: './',
  plugins: [audioCatalogPlugin()],
  build: {
    target: 'es2020',
    assetsInlineLimit: 4096,
    sourcemap: false,
  },
});

