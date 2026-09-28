import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

/**
 * Bytes a visitor downloads, per kind: code gzipped, fonts as served (woff2 is already
 * compressed). Fonts count the latin files only: the subsets English pages load.
 */
export const BUDGETS = {
  wasm: 166_000,
  js: 136_000,
  css: 10_100,
  fonts: 108_000,
} as const;

export type Kind = keyof typeof BUDGETS;

export function kindOf(name: string): Kind | undefined {
  if (name.endsWith('.wasm')) return 'wasm';
  if (name.endsWith('.js')) return 'js';
  if (name.endsWith('.css')) return 'css';
  if (/-latin-(wght|\d+)-normal-[^.]+\.woff2$/.test(name)) return 'fonts';
  return undefined;
}

export function totals(assets: { name: string; bytes: Uint8Array }[]): Record<Kind, number> {
  const sum: Record<Kind, number> = { wasm: 0, js: 0, css: 0, fonts: 0 };
  for (const { name, bytes } of assets) {
    const kind = kindOf(name);
    if (!kind) continue;
    sum[kind] += kind === 'fonts' ? bytes.length : gzipSync(bytes, { level: 9 }).length;
  }
  return sum;
}

export function overBudget(sizes: Record<Kind, number>, budgets: Record<Kind, number> = BUDGETS): string[] {
  return (Object.keys(budgets) as Kind[])
    .filter((kind) => sizes[kind] > budgets[kind])
    .map((kind) => `${kind}: ${sizes[kind]} B > budget ${budgets[kind]} B`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const dir = resolve(fileURLToPath(new URL('../dist/assets', import.meta.url)));
  const sizes = totals(readdirSync(dir).map((name) => ({ name, bytes: readFileSync(join(dir, name)) })));
  for (const kind of Object.keys(BUDGETS) as Kind[]) {
    console.log(`${kind.padEnd(5)} ${String(sizes[kind]).padStart(7)} B of ${BUDGETS[kind]} B`);
  }
  const over = overBudget(sizes);
  if (over.length > 0) {
    console.error(`Over budget:\n${over.join('\n')}`);
    process.exit(1);
  }
}
