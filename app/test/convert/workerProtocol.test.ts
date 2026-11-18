import { describe, expect, it, vi } from 'vitest';
import { answerRequest, transferred, type AdviceRequest, type BatchRequest } from '../../src/convert/workerProtocol';
import { moduleLoader, type Part } from '../../src/core/midiremap';
import * as stub from '../stubs/wasm';
import { advisedOf, engineId, enginePair } from '../typed';

const REQUEST: BatchRequest = {
  kind: 'convert',
  id: 7,
  files: [{ name: 'a.mid', bytes: new Uint8Array([1]) }],
  pair: enginePair('ggd_invasion', 'ezdrummer'),
  channel: 'auto',
  missing: 'nearest',
  unrecognized: 'remove',
};

describe('answerRequest', () => {
  it('replies with the batch result', async () => {
    const reply = await answerRequest(moduleLoader(), REQUEST);
    expect(reply).toMatchObject({ id: 7, answer: { kind: 'convert', result: { ok: [{ input: { name: 'a.mid' } }], failed: [] } } });
  });

  it('hands the converted bytes over instead of copying them', async () => {
    const reply = await answerRequest(moduleLoader(), REQUEST);
    expect(transferred(reply)).toHaveLength(1);
  });

  const ADVICE: AdviceRequest = {
    kind: 'advice',
    id: 8,
    files: [{ name: 'a.mid', bytes: new Uint8Array([1]) }],
    channel: '10',
    source: engineId('ggd_invasion'),
    target: engineId('ezdrummer'),
  };
  const ADVISED = advisedOf('ggd_invasion', 'ezdrummer', { kind: 'fits' });

  it('replies to an advice request with the advice for the files under its channel, for its source and target', async () => {
    vi.mocked(stub.source_advice).mockReturnValue(ADVISED);
    const reply = await answerRequest(moduleLoader(), ADVICE);
    expect(reply).toEqual({ id: 8, answer: { kind: 'advice', advised: ADVISED } });
    expect(vi.mocked(stub.source_advice).mock.calls[0]).toEqual([[{ bytes: ADVICE.files[0].bytes, selection: { scope: '10' } }], 'ggd_invasion', 'ezdrummer']);
  });

  it('advises on a file with picked parts by those parts', async () => {
    vi.mocked(stub.source_advice).mockReturnValue(ADVISED);
    const parts: [Part] = [{ track: 1, channel: 2 }];
    await answerRequest(moduleLoader(), { ...ADVICE, channel: 'auto', files: [{ name: 'a.mid', bytes: new Uint8Array([1]), parts }] });
    expect(vi.mocked(stub.source_advice).mock.calls[0]).toEqual([[{ bytes: new Uint8Array([1]), selection: { parts } }], 'ggd_invasion', 'ezdrummer']);
  });

  it('hands nothing over for an advice', async () => {
    vi.mocked(stub.source_advice).mockReturnValue(ADVISED);
    expect(transferred(await answerRequest(moduleLoader(), ADVICE))).toEqual([]);
  });

  it('replies with the error when the converter cannot load', async () => {
    const reply = await answerRequest(() => Promise.reject(new Error('wasm fetch failed')), REQUEST);
    expect(reply).toEqual({ id: 7, error: { kind: 'internal', detail: 'wasm fetch failed' } });
  });
});
