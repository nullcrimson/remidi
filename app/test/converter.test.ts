import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { BatchRequest } from '../src/lib/batch';
import { createConverter } from '../src/lib/converter';
import type { AppError } from '../src/lib/errors';
import { moduleLoader, type LoadMidiremap, type Report } from '../src/lib/midiremap';
import * as stub from './stubs/wasm';
import { typed } from './typed';

const REPORT = typed<Report>({ unmappedSource: {}, fallbackUsed: {}, dropped: {}, untouched: 0, converted: 1 });
const noWasm: LoadMidiremap = () => Promise.reject(new Error('no wasm'));
const remapMock = vi.mocked(stub.remap);
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

  fail(id: number, error: AppError) {
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
    remapMock.mockReturnValue({ bytes: new Uint8Array([7]), report: REPORT });
  });

  it('rejects a batch the worker could not convert, without retrying on the main thread', async () => {
    const worker = new FakeWorker();
    const { convert } = createConverter(moduleLoader(), () => worker as unknown as Worker);
    const pending = convert(FILES, 'ggd_invasion', 'ezdrummer', undefined, 'auto', 'nearest');
    worker.fail(worker.sent[0].id, { kind: 'internal', detail: 'wasm fetch failed' });
    await expect(pending).rejects.toEqual({ kind: 'internal', detail: 'wasm fetch failed' });
    expect(remapMock).not.toHaveBeenCalled();
    expect(worker.terminated).toBe(false);
  });

  it('finishes on the main thread when a worker reply cannot be read', async () => {
    const worker = new FakeWorker();
    const { convert } = createConverter(moduleLoader(), () => worker as unknown as Worker);
    const pending = convert(FILES, 'ggd_invasion', 'ezdrummer', undefined, 'auto', 'nearest');
    worker.onmessageerror?.(new MessageEvent('messageerror'));
    expect(Array.from((await pending).ok[0].bytes)).toEqual([7]);
    expect(worker.terminated).toBe(true);
  });

  it('rejects when the main-thread fallback cannot load the converter', async () => {
    const { convert } = createConverter(noWasm, () => {
      throw new ReferenceError('Worker is not defined');
    });
    await expect(convert(FILES, 'ggd_invasion', 'ezdrummer', undefined, 'auto', 'nearest')).rejects.toThrow(
      'no wasm',
    );
  });

  it('rejects a stranded batch when the fallback after a worker crash fails too', async () => {
    const worker = new FakeWorker();
    const { convert } = createConverter(noWasm, () => worker as unknown as Worker);
    const pending = convert(FILES, 'ggd_invasion', 'ezdrummer', undefined, 'auto', 'nearest');
    worker.onerror?.(new Event('error'));
    await expect(pending).rejects.toThrow('no wasm');
  });

  it('sends each batch to one lazily created worker', async () => {
    const worker = new FakeWorker();
    const make = vi.fn(() => worker as unknown as Worker);
    const { convert } = createConverter(moduleLoader(), make);
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
    const { convert } = createConverter(moduleLoader(), () => {
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
    const { convert } = createConverter(moduleLoader(), make);

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

function workers() {
  const made: FakeWorker[] = [];
  const make = () => {
    const worker = new FakeWorker();
    made.push(worker);
    return worker as unknown as Worker;
  };
  return { made, make };
}

async function converterWithAnAnsweredWorker() {
  const { made, make } = workers();
  const { convert } = createConverter(moduleLoader(), make);
  const first = convert(FILES, 'ggd_invasion', 'ezdrummer', undefined, 'auto', 'nearest');
  made[0].reply(made[0].sent[0].id, 'first');
  await first;
  return { made, convert };
}

describe('a converter whose worker died after answering', () => {
  it('sends the stranded batch to a new worker', async () => {
    const { made, convert } = await converterWithAnAnsweredWorker();
    const stranded = convert(FILES, 'ggd_invasion', 'ezdrummer', undefined, '3', 'nearest');
    made[0].onerror?.(new Event('error'));
    expect(made).toHaveLength(2);
    expect(made[1].sent.map((m) => m.channel)).toEqual(['3']);
    made[1].reply(made[1].sent[0].id, 'again');
    expect((await stranded).ok[0].name).toBe('again');
    expect(remapMock).not.toHaveBeenCalled();
  });

  it('ends the dead worker', async () => {
    const { made } = await converterWithAnAnsweredWorker();
    made[0].onerror?.(new Event('error'));
    expect(made[0].terminated).toBe(true);
  });

  it('starts the new worker only when a batch needs it', async () => {
    const { made, convert } = await converterWithAnAnsweredWorker();
    made[0].onerror?.(new Event('error'));
    expect(made).toHaveLength(1);
    void convert(FILES, 'ggd_invasion', 'ezdrummer', undefined, 'auto', 'nearest');
    expect(made).toHaveLength(2);
  });

  it('finishes on the main thread when the new worker dies before answering', async () => {
    const { made, convert } = await converterWithAnAnsweredWorker();
    const stranded = convert(FILES, 'ggd_invasion', 'ezdrummer', undefined, '3', 'nearest');
    made[0].onerror?.(new Event('error'));
    made[1].onerror?.(new Event('error'));
    expect((await stranded).ok[0].name).toBe('a.mid');
    expect(remapMock.mock.calls[0][4]).toBe('3');
  });

  it('starts no third worker once the new one died before answering', async () => {
    const { made, convert } = await converterWithAnAnsweredWorker();
    const stranded = convert(FILES, 'ggd_invasion', 'ezdrummer', undefined, '3', 'nearest');
    made[0].onerror?.(new Event('error'));
    made[1].onerror?.(new Event('error'));
    await stranded;
    await convert(FILES, 'ggd_invasion', 'ezdrummer', undefined, 'auto', 'nearest');
    expect(made).toHaveLength(2);
  });

  it('ignores a late error from the worker it already ended', async () => {
    const { made, convert } = await converterWithAnAnsweredWorker();
    made[0].onerror?.(new Event('error'));
    const next = convert(FILES, 'ggd_invasion', 'ezdrummer', undefined, 'auto', 'nearest');
    made[0].onerror?.(new Event('error'));
    made[1].reply(made[1].sent[0].id, 'next');
    expect((await next).ok[0].name).toBe('next');
    expect(made[1].terminated).toBe(false);
  });
});

describe('a batch whose signal aborts', () => {
  it('rejects with the reason it was aborted for', async () => {
    const { make } = workers();
    const { convert } = createConverter(moduleLoader(), make);
    const stop = new AbortController();
    const batch = convert(FILES, 'ggd_invasion', 'ezdrummer', undefined, 'auto', 'nearest', stop.signal);
    stop.abort();
    await expect(batch).rejects.toBe(stop.signal.reason);
  });

  it('ends the worker that was converting it', async () => {
    const { made, make } = workers();
    const { convert } = createConverter(moduleLoader(), make);
    const stop = new AbortController();
    const batch = convert(FILES, 'ggd_invasion', 'ezdrummer', undefined, 'auto', 'nearest', stop.signal);
    stop.abort();
    await expect(batch).rejects.toBeDefined();
    expect(made[0].terminated).toBe(true);
  });

  it('leaves the next batch to a new worker', async () => {
    const { made, make } = workers();
    const { convert } = createConverter(moduleLoader(), make);
    const stop = new AbortController();
    const batch = convert(FILES, 'ggd_invasion', 'ezdrummer', undefined, 'auto', 'nearest', stop.signal);
    stop.abort();
    await expect(batch).rejects.toBeDefined();
    const next = convert(FILES, 'ggd_invasion', 'ezdrummer', undefined, '10', 'nearest');
    expect(made[1].sent.map((m) => m.channel)).toEqual(['10']);
    made[1].reply(made[1].sent[0].id, 'next');
    expect((await next).ok[0].name).toBe('next');
  });

  it('moves the other pending batches to the new worker', async () => {
    const { made, make } = workers();
    const { convert } = createConverter(moduleLoader(), make);
    const stop = new AbortController();
    const aborted = convert(FILES, 'ggd_invasion', 'ezdrummer', undefined, 'auto', 'nearest', stop.signal);
    const kept = convert(FILES, 'ggd_invasion', 'ezdrummer', undefined, '5', 'nearest');
    stop.abort();
    await expect(aborted).rejects.toBeDefined();
    expect(made[1].sent.map((m) => m.channel)).toEqual(['5']);
    made[1].reply(made[1].sent[0].id, 'kept');
    expect((await kept).ok[0].name).toBe('kept');
  });

  it('is rejected without starting a worker when it was aborted beforehand', async () => {
    const { made, make } = workers();
    const { convert } = createConverter(moduleLoader(), make);
    const stop = new AbortController();
    stop.abort();
    await expect(
      convert(FILES, 'ggd_invasion', 'ezdrummer', undefined, 'auto', 'nearest', stop.signal),
    ).rejects.toBe(stop.signal.reason);
    expect(made).toHaveLength(0);
  });

  it('is rejected when it ran on the main thread and could not be stopped', async () => {
    const { convert } = createConverter(moduleLoader(), () => {
      throw new ReferenceError('Worker is not defined');
    });
    const stop = new AbortController();
    const batch = convert(FILES, 'ggd_invasion', 'ezdrummer', undefined, 'auto', 'nearest', stop.signal);
    stop.abort();
    await expect(batch).rejects.toBe(stop.signal.reason);
  });

  it('leaves its worker running when the batch had already finished', async () => {
    const { made, make } = workers();
    const { convert } = createConverter(moduleLoader(), make);
    const stop = new AbortController();
    const batch = convert(FILES, 'ggd_invasion', 'ezdrummer', undefined, 'auto', 'nearest', stop.signal);
    made[0].reply(made[0].sent[0].id, 'done');
    await batch;
    stop.abort();
    expect(made[0].terminated).toBe(false);
  });
});
