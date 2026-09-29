import { createReadStream } from 'node:fs';
import { extname } from 'node:path';
import { fileURLToPath, URL } from 'node:url';
import type { Plugin } from 'vite';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { builtFile } from './scripts/devStatic';
import { localeChunkName } from './scripts/localeChunk';
import { LOCALES } from './src/generated/i18n';

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

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.xml': 'application/xml',
  '.txt': 'text/plain',
  '.woff2': 'font/woff2',
};

/** Lets `npm run dev` open the static pages the last `npm run build:site` wrote to `dist`. */
function builtStaticPages(): Plugin {
  const dist = fileURLToPath(new URL('./dist', import.meta.url));
  const shells = Object.values(LOCALES).map(({ prefix }) => (prefix === '' ? '/' : `/${prefix}/`));
  return {
    name: 'built-static-pages',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const file = req.url === undefined ? undefined : builtFile(dist, req.url, shells);
        if (file === undefined) return next();
        res.setHeader('Content-Type', TYPES[extname(file)] ?? 'application/octet-stream');
        createReadStream(file).pipe(res);
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), contentSecurityPolicy(), builtStaticPages()],
  worker: { format: 'es' },
  build: {
    rollupOptions: {
      output: {
        chunkFileNames: (chunk) => localeChunkName(chunk.facadeModuleId) ?? 'assets/[name]-[hash].js',
      },
    },
  },
  server: { fs: { allow: ['.', '../locales'] } },
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
