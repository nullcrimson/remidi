import { gzipSync } from 'node:zlib';
import { BUDGETS, kindOf, overBudget, totals } from '../scripts/check-size';

const gz = (n: number) => gzipSync(new Uint8Array(n).fill(7), { level: 9 }).length;
const bytes = (n: number) => new Uint8Array(n).map((_, i) => (i * 7919) % 251);

describe('asset size budgets', () => {
  it('sorts assets into the budgeted kinds', () => {
    expect(kindOf('midiremap_wasm_bg-Dq.wasm')).toBe('wasm');
    expect(kindOf('index-Bt.js')).toBe('js');
    expect(kindOf('index-BR.css')).toBe('css');
    expect(kindOf('ibm-plex-sans-latin-wght-normal-Iv.woff2')).toBe('fonts');
    expect(kindOf('ibm-plex-mono-latin-600-normal-Bg.woff2')).toBe('fonts');
    expect(kindOf('ibm-plex-mono-latin-ext-600-normal-D3.woff2')).toBeUndefined();
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

  it('names each kind over its budget', () => {
    const within = { wasm: BUDGETS.wasm, js: 0, css: 0, fonts: 0, locale: 0 };
    expect(overBudget(within)).toEqual([]);
    expect(overBudget({ ...within, css: BUDGETS.css + 1 })).toEqual([
      `css: ${BUDGETS.css + 1} B > budget ${BUDGETS.css} B`,
    ]);
  });

  it('budgets locale chunks per file, outside the app code', () => {
    expect(kindOf('locale-app-Ab12.js')).toBe('locale');
    const sizes = totals([
      { name: 'index-x.js', bytes: new Uint8Array(10) },
      { name: 'locale-app-a.js', bytes: new Uint8Array(20_000).fill(7) },
      { name: 'locale-pl-b.js', bytes: new Uint8Array(30_000).fill(7) },
    ]);
    expect(sizes.js).toBeLessThan(100);
    expect(sizes.locale).toBe(Math.max(gz(20_000), gz(30_000)));
  });
});
