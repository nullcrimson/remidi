import { describe, expect, it } from 'vitest';
import { answerRequest, runBatch, type BatchRequest } from '../src/lib/batch';
import { WasmCallError } from '../src/lib/errors';
import { moduleLoader, type Overrides, type RemapOutput } from '../src/lib/midiremap';
import { typed } from './typed';

const REPORT = { unmappedSource: {}, fallbackUsed: {}, dropped: {}, untouched: 0, converted: 1 };

describe('runBatch', () => {
  it('converts each file in order and collects failures by name', () => {
    const remap = (mid: Uint8Array): RemapOutput => {
      if (mid[0] === 0) throw new WasmCallError({ kind: 'badMidi', detail: 'bad midi' });
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
    expect(result.failed).toEqual([{ name: 'broken.mid', error: { kind: 'badMidi', detail: 'bad midi' } }]);
  });

  it('passes engines, overrides, channel and missing drums through to remap', () => {
    const calls: unknown[][] = [];
    const ov = typed<Overrides>({ tgt: [{ canon: 'kick.main', note: 35 }], src: [] });
    runBatch([{ name: 'a.mid', bytes: new Uint8Array([1]) }], 's', 't', ov, '10', 'drop', (...args) => {
      calls.push(args.slice(1));
      return { bytes: new Uint8Array(), report: REPORT };
    });
    expect(calls).toEqual([['s', 't', ov, '10', 'drop']]);
  });
});

const REQUEST: BatchRequest = {
  id: 7,
  files: [{ name: 'a.mid', bytes: new Uint8Array([1]) }],
  src: 'ggd_invasion',
  tgt: 'ezdrummer',
  channel: 'auto',
  missing: 'nearest',
};

describe('answerRequest', () => {
  it('replies with the batch result', async () => {
    const reply = await answerRequest(moduleLoader(), REQUEST);
    expect(reply).toMatchObject({ id: 7, result: { ok: [{ name: 'a.mid' }], failed: [] } });
  });

  it('replies with the error when the converter cannot load', async () => {
    const reply = await answerRequest(() => Promise.reject(new Error('wasm fetch failed')), REQUEST);
    expect(reply).toEqual({ id: 7, error: { kind: 'internal', detail: 'wasm fetch failed' } });
  });
});
