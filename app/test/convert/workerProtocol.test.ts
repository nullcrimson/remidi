import { describe, expect, it, vi } from 'vitest';
import { answerRequest, transferred, type BatchRequest, type FitRequest } from '../../src/convert/workerProtocol';
import { moduleLoader, type SourceFits } from '../../src/core/midiremap';
import * as stub from '../stubs/wasm';
import { enginePair, typed } from '../typed';

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
    expect(reply).toMatchObject({ id: 7, answer: { kind: 'convert', result: { ok: [{ name: 'a.mid' }], failed: [] } } });
  });

  it('hands the converted bytes over instead of copying them', async () => {
    const reply = await answerRequest(moduleLoader(), REQUEST);
    expect(transferred(reply)).toHaveLength(1);
  });

  const FIT: FitRequest = { kind: 'fit', id: 8, files: [{ name: 'a.mid', bytes: new Uint8Array([1]) }], channel: '10' };
  const FITS = typed<SourceFits>({ hits: 4, ranked: [{ engine: 'ezdrummer', recognized: 3 }] });

  it('replies to a fit request with every engine fitted to the files under its channel', async () => {
    vi.mocked(stub.source_fits).mockReturnValue(FITS);
    const reply = await answerRequest(moduleLoader(), FIT);
    expect(reply).toEqual({ id: 8, answer: { kind: 'fit', fits: FITS } });
    expect(vi.mocked(stub.source_fits).mock.calls[0]).toEqual([[FIT.files[0].bytes], '10']);
  });

  it('hands nothing over for a fit', async () => {
    vi.mocked(stub.source_fits).mockReturnValue(FITS);
    expect(transferred(await answerRequest(moduleLoader(), FIT))).toEqual([]);
  });

  it('replies with the error when the converter cannot load', async () => {
    const reply = await answerRequest(() => Promise.reject(new Error('wasm fetch failed')), REQUEST);
    expect(reply).toEqual({ id: 7, error: { kind: 'internal', detail: 'wasm fetch failed' } });
  });
});
