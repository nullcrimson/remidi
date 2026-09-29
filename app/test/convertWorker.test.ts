import { beforeEach, describe, expect, it, vi } from 'vitest';

const readyMock = vi.fn();
const remapMock = vi.fn();
vi.mock('../src/lib/midiremap', () => ({
  ready: () => readyMock(),
  remap: (...a: unknown[]) => remapMock(...a),
}));

const REPORT = { unmappedSource: {}, fallbackUsed: {}, dropped: {}, untouched: 0, converted: 1 };
const REQUEST = {
  id: 7,
  files: [{ name: 'a.mid', bytes: new Uint8Array([1]) }],
  src: 'ggd_invasion',
  tgt: 'ezdrummer',
  channel: 'auto',
  missing: 'nearest',
};

async function deliver(): Promise<unknown> {
  const posted = vi.spyOn(self, 'postMessage').mockImplementation(() => {});
  await import('../src/lib/convertWorker');
  await (self.onmessage as (e: MessageEvent) => Promise<void>)({ data: REQUEST } as MessageEvent);
  const reply = posted.mock.calls[0]?.[0];
  posted.mockRestore();
  return reply;
}

describe('convert worker', () => {
  beforeEach(() => {
    readyMock.mockReset();
    remapMock.mockReset().mockReturnValue({ bytes: new Uint8Array([2]), report: REPORT });
  });

  it('replies with the batch result', async () => {
    readyMock.mockResolvedValue(undefined);
    const reply = (await deliver()) as { id: number; result: { ok: unknown[] } };
    expect(reply.id).toBe(7);
    expect(reply.result.ok).toHaveLength(1);
  });

  it('replies with the error when the converter cannot load', async () => {
    readyMock.mockRejectedValue(new Error('wasm fetch failed'));
    expect(await deliver()).toEqual({ id: 7, error: { kind: 'internal', detail: 'wasm fetch failed' } });
  });
});
