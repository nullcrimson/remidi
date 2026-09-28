/// <reference types="vitest" />
import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  base: process.env.VITE_BASE ?? '/',
  plugins: [react(), tailwindcss()],
  worker: { format: 'es' },
  resolve: {
    alias: {
      '@wasm': fileURLToPath(new URL('./src/wasm/midiremap_wasm.js', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./test/setup.ts'],
    include: ['test/**/*.test.{ts,tsx}'],
    css: { include: [/src\/index\.css/] },
    alias: {
      '@wasm': fileURLToPath(new URL('./test/stubs/wasm.ts', import.meta.url)),
    },
  },
});
