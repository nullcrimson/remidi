import { describe, expect, it } from 'vitest';
import { runBatch } from '../../src/convert/batch';
import { WasmCallError } from '../../src/core/errors';
import type { Conversion, Midiremap, Overrides } from '../../src/core/midiremap';
import { enginePair, typed } from '../typed';

const REPORT = { unmappedSource: {}, fallbackUsed: {}, dropped: {}, untouched: 0, converted: 1 };

const done = (bytes: Uint8Array<ArrayBuffer>): Conversion => ({ kind: 'done', bytes, report: REPORT, damage: [], picked: [], offers: [] });

describe('runBatch', () => {
  it('converts each file in order and collects failures by name', () => {
    const remap = (mid: Uint8Array): Conversion => {
      if (mid[0] === 0) throw new WasmCallError({ kind: 'badMidi', detail: 'bad midi' });
      return done(new Uint8Array([mid[0] + 1]));
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
      { remap },
    );
    expect(result.ok.map((c) => [c.input.name, Array.from(c.bytes)])).toEqual([
      ['a.mid', [2]],
      ['b.mid', [6]],
    ]);
    expect(result.failed).toEqual([{ name: 'broken.mid', error: { kind: 'badMidi', detail: 'bad midi' } }]);
  });

  it('passes engines, overrides, the channel as the selection, missing drums and unrecognized notes through to remap', () => {
    const calls: unknown[][] = [];
    const ov = typed<Overrides>({ edits: { 'kick.main': 35 }, srcEdits: {} });
    const remap: Midiremap['remap'] = (...args) => {
      calls.push(args.slice(1));
      return done(new Uint8Array());
    };
    runBatch([{ name: 'a.mid', bytes: new Uint8Array([1]) }], enginePair('s', 't'), ov, '10', 'drop', 'keep', { remap });
    expect(calls).toEqual([[enginePair('s', 't'), ov, { scope: '10' }, 'drop', 'keep']]);
  });

  it('converts a file with picked parts through only those parts', () => {
    const calls: unknown[] = [];
    const remap: Midiremap['remap'] = (_mid, _pair, _ov, selection) => {
      calls.push(selection);
      return done(new Uint8Array([3]));
    };
    runBatch(
      [{ name: 'a.mid', bytes: new Uint8Array([1]), parts: [{ track: 1, channel: 1 }] }],
      enginePair('s', 't'),
      undefined,
      'auto',
      'nearest',
      'remove',
      { remap },
    );
    expect(calls).toEqual([{ parts: [{ track: 1, channel: 1 }] }]);
  });

  it('lists a file the conversion asks about, apart from the converted and the failed', () => {
    const result = runBatch(
      [{ name: 'a.mid', bytes: new Uint8Array([1]) }],
      enginePair('s', 't'),
      undefined,
      'auto',
      'nearest',
      'remove',
      { remap: () => ({ kind: 'ask', parts: [{ track: 1, channel: 1 }, { track: 2, channel: 1 }], damage: [] }) },
    );
    expect(result).toEqual({ ok: [], failed: [], asked: ['a.mid'] });
  });
});
