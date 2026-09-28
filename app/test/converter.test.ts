import { beforeEach, describe, expect, it, vi } from 'vitest';

const remapMock = vi.fn();
const readyMock = vi.fn();
vi.mock('../src/lib/midiremap', () => ({
  ready: () => readyMock(),
  remap: (...a: unknown[]) => remapMock(...a),
}));

import { createConverter, type BatchRequest } from '../src/lib/converter';

const REPORT = { unmappedSource: {}, fallbackUsed: {}, dropped: {}, untouched: 0, converted: 1 };
const FILES = [{ name: 'a.mid', bytes: new Uint8Array([1]) }];

class FakeWorker {
  sent: BatchRequest[] = [];
  onmessage: ((e: MessageEvent) => void) | null = null;
  onerror: ((e: Event) => void) | null = null;
  onmessageerror: ((e: MessageEvent) => void) | null = null;
  terminated = false;
  postMessage(msg: BatchRequest) {
    this.sent.push(msg);
  }

  terminate() {
    this.terminated = true;
  }

  fail(id: number, error: string) {
    this.onmessage?.({ data: { id, error } } as MessageEvent);
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
    readyMock.mockReset().mockResolvedValue(undefined);
  });

  it('rejects a batch the worker could not convert, without retrying on the main thread', async () => {
    const worker = new FakeWorker();
    const { convert } = createConverter(() => worker as unknown as Worker);
    const pending = convert(FILES, 'ggd_invasion', 'ezdrummer', undefined, 'auto', 'nearest');
    worker.fail(worker.sent[0].id, 'Error: wasm fetch failed');
    await expect(pending).rejects.toThrow('wasm fetch failed');
    expect(remapMock).not.toHaveBeenCalled();
    expect(worker.terminated).toBe(false);
  });

  it('finishes on the main thread when a worker reply cannot be read', async () => {
    const worker = new FakeWorker();
    const { convert } = createConverter(() => worker as unknown as Worker);
    const pending = convert(FILES, 'ggd_invasion', 'ezdrummer', undefined, 'auto', 'nearest');
    worker.onmessageerror?.(new MessageEvent('messageerror'));
    expect(Array.from((await pending).ok[0].bytes)).toEqual([7]);
    expect(worker.terminated).toBe(true);
  });

  it('rejects when the main-thread fallback cannot load the converter', async () => {
    readyMock.mockRejectedValue(new Error('no wasm'));
    const { convert } = createConverter(() => {
      throw new ReferenceError('Worker is not defined');
    });
    await expect(convert(FILES, 'ggd_invasion', 'ezdrummer', undefined, 'auto', 'nearest')).rejects.toThrow(
      'no wasm',
    );
  });

  it('rejects a stranded batch when the fallback after a worker crash fails too', async () => {
    const worker = new FakeWorker();
    const { convert } = createConverter(() => worker as unknown as Worker);
    readyMock.mockRejectedValue(new Error('no wasm'));
    const pending = convert(FILES, 'ggd_invasion', 'ezdrummer', undefined, 'auto', 'nearest');
    worker.onerror?.(new Event('error'));
    await expect(pending).rejects.toThrow('no wasm');
  });

  it('sends each batch to one lazily created worker', async () => {
    const worker = new FakeWorker();
    const make = vi.fn(() => worker as unknown as Worker);
    const { convert } = createConverter(make);
    expect(make).not.toHaveBeenCalled();

    const first = convert(FILES, 'ggd_invasion', 'ezdrummer', undefined, 'auto', 'nearest');
    const second = convert(FILES, 'ggd_invasion', 'superior_drummer3', undefined, '10', 'drop');
    expect(make).toHaveBeenCalledOnce();
    expect(worker.sent.map((m) => m.tgt)).toEqual(['ezdrummer', 'superior_drummer3']);
    expect(worker.sent[0].files).toEqual(FILES);
    expect(worker.sent.map((m) => m.channel)).toEqual(['auto', '10']);
    expect(worker.sent.map((m) => m.missing)).toEqual(['nearest', 'drop']);

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
    const result = await convert(FILES, 'ggd_invasion', 'ezdrummer', undefined, 'all', 'nearest');
    expect(Array.from(result.ok[0].bytes)).toEqual([7]);
    expect(remapMock).toHaveBeenCalledOnce();
    expect(remapMock.mock.calls[0][4]).toBe('all');
    expect(remapMock.mock.calls[0][5]).toBe('nearest');
  });

  it('finishes pending and later batches on the main thread after a worker error', async () => {
    const worker = new FakeWorker();
    const make = vi.fn(() => worker as unknown as Worker);
    const { convert } = createConverter(make);

    const pending = convert(FILES, 'ggd_invasion', 'ezdrummer', undefined, '3', 'nearest');
    worker.onerror?.(new Event('error'));
    expect(Array.from((await pending).ok[0].bytes)).toEqual([7]);
    expect(remapMock.mock.calls[0][4]).toBe('3');
    expect(worker.terminated).toBe(true);

    await convert(FILES, 'ggd_invasion', 'ezdrummer', undefined, 'auto', 'nearest');
    expect(make).toHaveBeenCalledOnce();
    expect(remapMock).toHaveBeenCalledTimes(2);
  });
});
