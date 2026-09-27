import { beforeEach, describe, expect, it, vi } from 'vitest';

const remapMock = vi.fn();
vi.mock('../src/lib/midiremap', () => ({
  ready: () => Promise.resolve(),
  remap: (...a: unknown[]) => remapMock(...a),
}));

import { createConverter, type BatchRequest } from '../src/lib/converter';

const REPORT = { unmappedSource: {}, fallbackUsed: {}, dropped: {}, untouched: 0, converted: 1 };
const FILES = [{ name: 'a.mid', bytes: new Uint8Array([1]) }];

class FakeWorker {
  sent: BatchRequest[] = [];
  onmessage: ((e: MessageEvent) => void) | null = null;
  onerror: ((e: Event) => void) | null = null;
  terminated = false;
  postMessage(msg: BatchRequest) {
    this.sent.push(msg);
  }

  terminate() {
    this.terminated = true;
  }

  reply(id: number, name: string) {
    this.onmessage?.({
      data: { id, result: { ok: [{ name, bytes: new Uint8Array([9]), report: REPORT }], failed: [] } },
    } as MessageEvent);
  }
}

describe('createConverter', () => {
  beforeEach(() => {
    remapMock.mockReset().mockReturnValue({ bytes: new Uint8Array([7]), report: REPORT });
  });

  it('sends each batch to one lazily created worker', async () => {
    const worker = new FakeWorker();
    const make = vi.fn(() => worker as unknown as Worker);
    const { convert } = createConverter(make);
    expect(make).not.toHaveBeenCalled();

    const first = convert(FILES, 'ggd_invasion', 'ezdrummer', undefined, 'auto');
    const second = convert(FILES, 'ggd_invasion', 'superior_drummer3', undefined, '10');
    expect(make).toHaveBeenCalledOnce();
    expect(worker.sent.map((m) => m.tgt)).toEqual(['ezdrummer', 'superior_drummer3']);
    expect(worker.sent[0].files).toEqual(FILES);
    expect(worker.sent.map((m) => m.channel)).toEqual(['auto', '10']);

    worker.reply(worker.sent[1].id, 'second');
    worker.reply(worker.sent[0].id, 'first');
    expect((await first).ok[0].name).toBe('first');
    expect((await second).ok[0].name).toBe('second');
    expect(remapMock).not.toHaveBeenCalled();
  });

  it('runs on the main thread when no worker can be created', async () => {
    const { convert } = createConverter(() => {
      throw new ReferenceError('Worker is not defined');
    });
    const result = await convert(FILES, 'ggd_invasion', 'ezdrummer', undefined, 'all');
    expect(Array.from(result.ok[0].bytes)).toEqual([7]);
    expect(remapMock).toHaveBeenCalledOnce();
    expect(remapMock.mock.calls[0][4]).toBe('all');
  });

  it('finishes pending and later batches on the main thread after a worker error', async () => {
    const worker = new FakeWorker();
    const make = vi.fn(() => worker as unknown as Worker);
    const { convert } = createConverter(make);

    const pending = convert(FILES, 'ggd_invasion', 'ezdrummer', undefined, '3');
    worker.onerror?.(new Event('error'));
    expect(Array.from((await pending).ok[0].bytes)).toEqual([7]);
    expect(remapMock.mock.calls[0][4]).toBe('3');
    expect(worker.terminated).toBe(true);

    await convert(FILES, 'ggd_invasion', 'ezdrummer', undefined, 'auto');
    expect(make).toHaveBeenCalledOnce();
    expect(remapMock).toHaveBeenCalledTimes(2);
  });
});
