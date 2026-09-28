import { describe, expect, it } from 'vitest';
import { runBatch } from '../src/lib/batch';
import { WasmCallError, type RemapResult } from '../src/lib/midiremap';

const REPORT = { unmappedSource: {}, fallbackUsed: {}, dropped: {}, untouched: 0, converted: 1 };

describe('runBatch', () => {
  it('converts each file in order and collects failures by name', () => {
    const remap = (mid: Uint8Array): RemapResult => {
      if (mid[0] === 0) throw new WasmCallError({ kind: 'badMidi', message: 'bad midi', id: null });
      return { bytes: new Uint8Array([mid[0] + 1]), report: REPORT };
    };
    const result = runBatch(
      [
        { name: 'a.mid', bytes: new Uint8Array([1]) },
        { name: 'broken.mid', bytes: new Uint8Array([0]) },
        { name: 'b.mid', bytes: new Uint8Array([5]) },
      ],
      'ggd_invasion',
      'ezdrummer',
      undefined,
      'auto',
      'nearest',
      remap,
    );
    expect(result.ok.map((c) => [c.name, Array.from(c.bytes)])).toEqual([
      ['a.mid', [2]],
      ['b.mid', [6]],
    ]);
    expect(result.failed).toEqual([{ name: 'broken.mid', error: 'bad midi' }]);
  });

  it('passes engines, overrides, channel and missing drums through to remap', () => {
    const calls: unknown[][] = [];
    const ov = { tgt: [{ canon: 'kick.main', note: 35 }], src: [] };
    runBatch([{ name: 'a.mid', bytes: new Uint8Array([1]) }], 's', 't', ov, '10', 'drop', (...args) => {
      calls.push(args.slice(1));
      return { bytes: new Uint8Array(), report: REPORT };
    });
    expect(calls).toEqual([['s', 't', ov, '10', 'drop']]);
  });
});
