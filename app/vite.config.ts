import { createReadStream } from 'node:fs';
import { extname } from 'node:path';
import { fileURLToPath, URL } from 'node:url';
import type { Plugin } from 'vite';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { builtFile } from './scripts/devStatic';
import { localeChunkName } from './scripts/localeChunk';
import { siteManifest, type AnalyticsScript } from './scripts/siteManifest';
import { LOCALES } from './src/generated/i18n';

const BEACON = 'https://static.cloudflareinsights.com';
const BEACON_REPORTS = 'https://cloudflareinsights.com';
const STATS = 'https://cloud.umami.is';
const STATS_REPORTS = 'https://gateway.umami.is';

const CONTENT_SECURITY_POLICY = [
  `default-src 'self'`,
  `script-src 'self' 'wasm-unsafe-eval' ${BEACON} ${STATS}`,
  `style-src 'self'`,
  `font-src 'self'`,
  `img-src 'self' data:`,
  `connect-src 'self' ${BEACON_REPORTS} ${STATS_REPORTS}`,
  `worker-src 'self'`,
  `object-src 'none'`,
  `base-uri 'self'`,
  `form-action 'none'`,
].join('; ');

const LOCALE_ENTRY = 'site-locale';

const ANALYTICS: readonly AnalyticsScript[] = [
  { src: `${BEACON}/beacon.min.js`, attrs: { 'data-cf-beacon': '{"token": "070603e1f4af4cf3a16a08fd5255e6bc"}' } },
  { src: `${STATS}/script.js`, attrs: { 'data-website-id': '5f4e658b-ad31-4636-933b-3fb96cafa735', 'data-domains': 'drumverter.com' } },
];

function analyticsScripts(): Plugin {
  return {
    name: 'analytics-scripts',
    transformIndexHtml: () => ANALYTICS.map(({ src, attrs }) => ({
      tag: 'script',
      attrs: { defer: true, src, ...attrs },
      injectTo: 'body',
    })),
  };
}

function siteData(): Plugin {
  return {
    name: 'site-data',
    apply: 'build',
    generateBundle(_options, bundle) {
      const chunks = Object.values(bundle).filter((file) => file.type === 'chunk');
      const manifest = siteManifest(Object.keys(bundle), chunks, LOCALE_ENTRY, CONTENT_SECURITY_POLICY, ANALYTICS);
      this.emitFile({ type: 'asset', fileName: 'site.json', source: JSON.stringify(manifest, null, 2) });
    },
  };
}

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
  plugins: [react(), tailwindcss(), contentSecurityPolicy(), analyticsScripts(), siteData(), builtStaticPages()],
  worker: { format: 'es' },
  build: {
    rollupOptions: {
      input: { index: 'index.html', [LOCALE_ENTRY]: 'src/locale/staticPagesEntry.ts' },
      output: {
        chunkFileNames: (chunk) => localeChunkName(chunk.facadeModuleId) ?? 'assets/[name]-[hash].js',
      },
    },
  },
  server: { fs: { allow: ['.', '../locales', '../content'] } },
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
