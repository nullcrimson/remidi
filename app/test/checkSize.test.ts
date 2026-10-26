import { gzipSync } from 'node:zlib';
import { BUDGETS, chunksLoadedBy, kindOf, overBudget, pageBytes, totals } from '../scripts/check-size';

const gz = (n: number) => gzipSync(new Uint8Array(n).fill(7), { level: 9 }).length;
const bytes = (n: number) => new Uint8Array(n).map((_, i) => (i * 7919) % 251);

describe('asset size budgets', () => {
  it('sorts a wasm file as wasm', () => {
    expect(kindOf('midiremap_wasm_bg-Dq.wasm')).toBe('wasm');
  });

  it('sorts a script as js', () => {
    expect(kindOf('index-Bt.js')).toBe('js');
  });

  it('sorts a stylesheet as css', () => {
    expect(kindOf('index-BR.css')).toBe('css');
  });

  it('sorts the latin woff2 files as fonts', () => {
    expect(kindOf('ibm-plex-sans-latin-wght-normal-Iv.woff2')).toBe('fonts');
    expect(kindOf('ibm-plex-mono-latin-600-normal-Bg.woff2')).toBe('fonts');
  });

  it('leaves a latin-ext font unbudgeted', () => {
    expect(kindOf('ibm-plex-mono-latin-ext-600-normal-D3.woff2')).toBeUndefined();
  });

  it('leaves a woff font unbudgeted', () => {
    expect(kindOf('ibm-plex-mono-latin-600-normal-Dw.woff')).toBeUndefined();
  });

  it('counts code gzipped and fonts as they are', () => {
    const js = bytes(5000);
    const font = bytes(3000);
    expect(totals([
      { name: 'a.js', bytes: js },
      { name: 'b.js', bytes: js },
      { name: 'x-latin-400-normal-a.woff2', bytes: font },
    ])).toEqual({ wasm: 0, js: 2 * gzipSync(js, { level: 9 }).length, css: 0, fonts: 3000, locale: 0 });
  });

  const within = { wasm: BUDGETS.wasm, js: 0, css: 0, fonts: 0, locale: 0, page: 0 };

  it('names no kind that is within its budget', () => {
    expect(overBudget(within)).toEqual([]);
  });

  it('names each kind over its budget', () => {
    expect(overBudget({ ...within, css: BUDGETS.css + 1 })).toEqual([
      `css: ${BUDGETS.css + 1} B > budget ${BUDGETS.css} B`,
    ]);
  });

  it('sorts a locale chunk as locale', () => {
    expect(kindOf('locale-app-Ab12.js')).toBe('locale');
  });

  it('budgets locale chunks per file, outside the app code', () => {
    const sizes = totals([
      { name: 'index-x.js', bytes: new Uint8Array(10) },
      { name: 'locale-app-a.js', bytes: new Uint8Array(20_000).fill(7) },
      { name: 'locale-pl-b.js', bytes: new Uint8Array(30_000).fill(7) },
    ]);
    expect(sizes.js).toBeLessThan(100);
    expect(sizes.locale).toBe(Math.max(gz(20_000), gz(30_000)));
  });
});

describe('what a static page loads', () => {
  const text = (source: string) => new TextEncoder().encode(source);
  const chunks: Record<string, string> = {
    'site-locale-a.js': 'import{a}from"./language-b.js";a()',
    'language-b.js': 'import"./deep-c.js";export const a=()=>{}',
    'deep-c.js': 'export{}',
    'index-d.js': 'import"./language-b.js"',
  };
  const read = (name: string) => text(chunks[name]);
  const size = (name: string) => gzipSync(read(name), { level: 9 }).length;

  it('follows a chunk to the chunks it imports', () => {
    expect(chunksLoadedBy('site-locale-a.js', (name) => chunks[name])).toEqual(['site-locale-a.js', 'language-b.js', 'deep-c.js']);
  });

  it('lists a chunk two others import once', () => {
    const twice = { 'a.js': 'import"./b.js";import"./c.js"', 'b.js': 'import"./c.js"', 'c.js': '' };
    expect(chunksLoadedBy('a.js', (name) => twice[name as keyof typeof twice])).toEqual(['a.js', 'b.js', 'c.js']);
  });

  it('counts the language script, its chunks and the list filter, gzipped', () => {
    const filter = text('filter();');
    expect(pageBytes(Object.keys(chunks), read, filter)).toBe(
      size('site-locale-a.js') + size('language-b.js') + size('deep-c.js') + gzipSync(filter, { level: 9 }).length,
    );
  });

  it('refuses a build without the language script of static pages', () => {
    expect(() => pageBytes(['index-d.js'], read, text(''))).toThrow('no language script');
  });
});
