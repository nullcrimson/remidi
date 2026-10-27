import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import { reachable } from './reachable.ts';

/**
 * Bytes a visitor downloads, per kind: code gzipped, fonts as served (woff2 is already
 * compressed). Fonts count the latin files only: the subsets English pages load. `locale` is
 * the largest locale chunk: a visitor loads one language's messages, never all of them.
 * `page` is the script a static page loads: its language script with the chunks that script
 * imports, which `js` counts too, and the list filter.
 */
export const BUDGETS = {
  wasm: 192_000,
  js: 156_911,
  css: 12_470,
  fonts: 108_000,
  locale: 12_000,
  page: 1_700,
} as const;

type Kind = keyof typeof BUDGETS;
type FileKind = Exclude<Kind, 'page'>;

const PAGE_ENTRY = /^site-locale-.+\.js$/;
const CHUNK_IMPORT = /(?:from|import)\s*\(?\s*["'`]\.\/([^"'`]+)["'`]/g;

const gzipped = (bytes: Uint8Array): number => gzipSync(bytes, { level: 9 }).length;

/** The chunk `entry` and every chunk it imports, however deep. */
export function chunksLoadedBy(entry: string, read: (name: string) => string): string[] {
  return reachable(entry, (name) => [...read(name).matchAll(CHUNK_IMPORT)].map(([, chunk]) => chunk));
}

/** Gzipped bytes of what a static page loads: the chunks its language script loads, and `filter`. */
export function pageBytes(names: string[], read: (name: string) => Uint8Array, filter: Uint8Array): number {
  const entry = names.find((name) => PAGE_ENTRY.test(name));
  if (entry === undefined) throw new Error('the build has no language script for static pages');
  const text = new TextDecoder();
  const chunks = chunksLoadedBy(entry, (name) => text.decode(read(name)));
  return chunks.reduce((sum, name) => sum + gzipped(read(name)), gzipped(filter));
}

export function kindOf(name: string): FileKind | undefined {
  if (name.endsWith('.wasm')) return 'wasm';
  if (/^locale-.+\.js$/.test(name)) return 'locale';
  if (name.endsWith('.js')) return 'js';
  if (name.endsWith('.css')) return 'css';
  if (/-latin-(wght|\d+)-normal-[^.]+\.woff2$/.test(name)) return 'fonts';
  return undefined;
}

export function totals(assets: { name: string; bytes: Uint8Array }[]): Record<FileKind, number> {
  const sum: Record<FileKind, number> = { wasm: 0, js: 0, css: 0, fonts: 0, locale: 0 };
  for (const { name, bytes } of assets) {
    const kind = kindOf(name);
    if (!kind) continue;
    const size = kind === 'fonts' ? bytes.length : gzipped(bytes);
    sum[kind] = kind === 'locale' ? Math.max(sum.locale, size) : sum[kind] + size;
  }
  return sum;
}

export function overBudget(sizes: Record<Kind, number>): string[] {
  return (Object.keys(BUDGETS) as Kind[])
    .filter((kind) => sizes[kind] > BUDGETS[kind])
    .map((kind) => `${kind}: ${sizes[kind]} B > budget ${BUDGETS[kind]} B`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const dir = resolve(fileURLToPath(new URL('../dist/assets', import.meta.url)));
  const names = readdirSync(dir);
  const read = (name: string) => readFileSync(join(dir, name));
  const sizes = {
    ...totals(names.map((name) => ({ name, bytes: read(name) }))),
    page: pageBytes(names, read, readFileSync(resolve(dir, '../filter.js'))),
  };
  for (const kind of Object.keys(BUDGETS) as Kind[]) {
    console.log(`${kind.padEnd(6)} ${String(sizes[kind]).padStart(7)} B of ${BUDGETS[kind]} B${kind === 'locale' ? ' (largest file)' : ''}`);
  }
  const over = overBudget(sizes);
  if (over.length > 0) {
    console.error(`Over budget:\n${over.join('\n')}`);
    process.exit(1);
  }
}
