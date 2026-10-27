import { describe, expect, it } from 'vitest';
import { runBatch } from '../../src/convert/batch';
import { WasmCallError } from '../../src/core/errors';
import type { Overrides, Converted } from '../../src/core/midiremap';
import { enginePair, typed } from '../typed';

const REPORT = { unmappedSource: {}, fallbackUsed: {}, dropped: {}, untouched: 0, converted: 1 };

describe('runBatch', () => {
  it('converts each file in order and collects failures by name', () => {
    const remap = (mid: Uint8Array): Converted => {
      if (mid[0] === 0) throw new WasmCallError({ kind: 'badMidi', detail: 'bad midi' });
      return { bytes: new Uint8Array([mid[0] + 1]), report: REPORT };
    };
    const result = runBatch(
      [
        { name: 'a.mid', bytes: new Uint8Array([1]) },
        { name: 'broken.mid', bytes: new Uint8Array([0]) },
        { name: 'b.mid', bytes: new Uint8Array([5]) },
      ],
      enginePair('ggd_invasion', 'ezdrummer'),
      undefined,
      'auto',
      'nearest',
      'remove',
      remap,
    );
    expect(result.ok.map((c) => [c.name, Array.from(c.bytes)])).toEqual([
      ['a.mid', [2]],
      ['b.mid', [6]],
    ]);
    expect(result.failed).toEqual([{ name: 'broken.mid', error: { kind: 'badMidi', detail: 'bad midi' } }]);
  });

  it('passes engines, overrides, channel, missing drums and unrecognized notes through to remap', () => {
    const calls: unknown[][] = [];
    const ov = typed<Overrides>({ edits: { 'kick.main': 35 }, srcEdits: {} });
    runBatch([{ name: 'a.mid', bytes: new Uint8Array([1]) }], enginePair('s', 't'), ov, '10', 'drop', 'keep', (...args) => {
      calls.push(args.slice(1));
      return { bytes: new Uint8Array(), report: REPORT };
    });
    expect(calls).toEqual([[enginePair('s', 't'), ov, '10', 'drop', 'keep']]);
  });
});
