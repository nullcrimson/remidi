import { gzipSync } from 'node:zlib';
import { BUDGETS, kindOf, overBudget, totals } from '../scripts/check-size';

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
    ])).toEqual({ wasm: 0, js: 2 * gzipSync(js, { level: 9 }).length, css: 0, fonts: 3000 });
  });

  it('names each kind over its budget', () => {
    const within = { wasm: BUDGETS.wasm, js: 0, css: 0, fonts: 0 };
    expect(overBudget(within)).toEqual([]);
    expect(overBudget({ ...within, css: BUDGETS.css + 1 })).toEqual([
      `css: ${BUDGETS.css + 1} B > budget ${BUDGETS.css} B`,
    ]);
  });
});
