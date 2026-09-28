import { fileURLToPath, URL } from 'node:url';
import type { Plugin } from 'vite';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const BEACON = 'https://static.cloudflareinsights.com';
const BEACON_REPORTS = 'https://cloudflareinsights.com';

/** The site's content security policy; the static pages copy it from the built index.html. */
const CONTENT_SECURITY_POLICY = [
  `default-src 'self'`,
  `script-src 'self' 'wasm-unsafe-eval' ${BEACON}`,
  `style-src 'self'`,
  `font-src 'self'`,
  `img-src 'self' data:`,
  `connect-src 'self' ${BEACON_REPORTS}`,
  `worker-src 'self'`,
  `object-src 'none'`,
  `base-uri 'self'`,
  `form-action 'none'`,
].join('; ');

/** Adds the policy to the built page only: the dev server injects inline scripts. */
function contentSecurityPolicy(): Plugin {
  return {
    name: 'content-security-policy',
    apply: 'build',
    transformIndexHtml: () => [
      {
        tag: 'meta',
        attrs: { 'http-equiv': 'Content-Security-Policy', content: CONTENT_SECURITY_POLICY },
        injectTo: 'head-prepend',
      },
    ],
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), contentSecurityPolicy()],
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
