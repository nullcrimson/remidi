import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Answer, BatchRequest, FitRequest, WorkerRequest } from '../../src/convert/workerProtocol';
import { createConverter } from '../../src/convert/converter';
import type { AppError } from '../../src/core/errors';
import { moduleLoader, type LoadMidiremap, type Report, type SourceFits } from '../../src/core/midiremap';
import * as stub from '../stubs/wasm';
import { enginePair, typed } from '../typed';

const REPORT = typed<Report>({ unmappedSource: {}, fallbackUsed: {}, dropped: {}, untouched: 0, converted: 1 });
const noWasm: LoadMidiremap = () => Promise.reject(new Error('no wasm'));
const remapMock = vi.mocked(stub.remap);
const FILES = [{ name: 'a.mid', bytes: new Uint8Array([1]) }];

class FakeWorker {
  sent: BatchRequest[] = [];
  fitsSent: FitRequest[] = [];
  onmessage: ((e: MessageEvent) => void) | null = null;
  onerror: ((e: Event) => void) | null = null;
  onmessageerror: ((e: MessageEvent) => void) | null = null;
  terminated = false;
  postMessage(msg: WorkerRequest) {
    if (msg.kind === 'convert') this.sent.push(msg);
    else this.fitsSent.push(msg);
  }

  terminate() {
    this.terminated = true;
  }

  fail(id: number, error: AppError) {
    this.onmessage?.({ data: { id, error } } as MessageEvent);
  }

  reply(id: number, name: string) {
    this.answer(id, { kind: 'convert', result: { ok: [{ name, bytes: new Uint8Array([9]), report: REPORT }], failed: [] } });
  }

  answer(id: number, answer: Answer) {
    this.onmessage?.({ data: { id, answer } } as MessageEvent);
  }
}

describe('createConverter', () => {
  beforeEach(() => {
    remapMock.mockReturnValue({ bytes: new Uint8Array([7]), report: REPORT });
  });

  it('rejects a batch the worker could not convert, without retrying on the main thread', async () => {
    const worker = new FakeWorker();
    const { convert } = createConverter(moduleLoader(), () => worker as unknown as Worker);
    const pending = convert(FILES, enginePair('ggd_invasion', 'ezdrummer'), undefined, 'auto', 'nearest', 'remove');
    worker.fail(worker.sent[0].id, { kind: 'internal', detail: 'wasm fetch failed' });
    await expect(pending).rejects.toEqual({ kind: 'internal', detail: 'wasm fetch failed' });
    expect(remapMock).not.toHaveBeenCalled();
    expect(worker.terminated).toBe(false);
  });

  it('finishes on the main thread when a worker reply cannot be read', async () => {
    const worker = new FakeWorker();
    const { convert } = createConverter(moduleLoader(), () => worker as unknown as Worker);
    const pending = convert(FILES, enginePair('ggd_invasion', 'ezdrummer'), undefined, 'auto', 'nearest', 'remove');
    worker.onmessageerror?.(new MessageEvent('messageerror'));
    expect(Array.from((await pending).ok[0].bytes)).toEqual([7]);
    expect(worker.terminated).toBe(true);
  });

  it('rejects when the main-thread fallback cannot load the converter', async () => {
    const { convert } = createConverter(noWasm, () => {
      throw new ReferenceError('Worker is not defined');
    });
    await expect(convert(FILES, enginePair('ggd_invasion', 'ezdrummer'), undefined, 'auto', 'nearest', 'remove')).rejects.toThrow(
      'no wasm',
    );
  });

  it('rejects a stranded batch when the fallback after a worker crash fails too', async () => {
    const worker = new FakeWorker();
    const { convert } = createConverter(noWasm, () => worker as unknown as Worker);
    const pending = convert(FILES, enginePair('ggd_invasion', 'ezdrummer'), undefined, 'auto', 'nearest', 'remove');
    worker.onerror?.(new Event('error'));
    await expect(pending).rejects.toThrow('no wasm');
  });

  function twoBatches() {
    const worker = new FakeWorker();
    const { convert } = createConverter(moduleLoader(), () => worker as unknown as Worker);
    const first = convert(FILES, enginePair('ggd_invasion', 'ezdrummer'), undefined, 'auto', 'nearest', 'remove');
    const second = convert(FILES, enginePair('ggd_invasion', 'superior_drummer3'), undefined, '10', 'drop', 'keep');
    return { worker, first, second };
  }

  it('creates its worker lazily, once for all batches', () => {
    const worker = new FakeWorker();
    const make = vi.fn(() => worker as unknown as Worker);
    const { convert } = createConverter(moduleLoader(), make);
    expect(make).not.toHaveBeenCalled();

    void convert(FILES, enginePair('ggd_invasion', 'ezdrummer'), undefined, 'auto', 'nearest', 'remove');
    void convert(FILES, enginePair('ggd_invasion', 'superior_drummer3'), undefined, '10', 'drop', 'remove');
    expect(make).toHaveBeenCalledOnce();
  });

  it('sends each batch to the worker with its own settings', () => {
    const { worker } = twoBatches();
    expect(worker.sent.map((m) => m.pair.tgt)).toEqual(['ezdrummer', 'superior_drummer3']);
    expect(worker.sent[0].files).toEqual(FILES);
    expect(worker.sent.map((m) => m.channel)).toEqual(['auto', '10']);
    expect(worker.sent.map((m) => m.missing)).toEqual(['nearest', 'drop']);
    expect(worker.sent.map((m) => m.unrecognized)).toEqual(['remove', 'keep']);
  });

  it('hands each worker reply to the batch that asked', async () => {
    const { worker, first, second } = twoBatches();
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
    const result = await convert(FILES, enginePair('ggd_invasion', 'ezdrummer'), undefined, 'all', 'nearest', 'remove');
    expect(Array.from(result.ok[0].bytes)).toEqual([7]);
    expect(remapMock).toHaveBeenCalledOnce();
    expect(remapMock.mock.calls[0][4]).toBe('all');
    expect(remapMock.mock.calls[0][5]).toBe('nearest');
  });

  it('finishes the pending batch on the main thread after a worker error', async () => {
    const worker = new FakeWorker();
    const make = vi.fn(() => worker as unknown as Worker);
    const { convert } = createConverter(moduleLoader(), make);

    const pending = convert(FILES, enginePair('ggd_invasion', 'ezdrummer'), undefined, '3', 'nearest', 'remove');
    worker.onerror?.(new Event('error'));
    expect(Array.from((await pending).ok[0].bytes)).toEqual([7]);
    expect(remapMock.mock.calls[0][4]).toBe('3');
    expect(worker.terminated).toBe(true);
  });

  it('runs later batches on the main thread after a worker error', async () => {
    const worker = new FakeWorker();
    const make = vi.fn(() => worker as unknown as Worker);
    const { convert } = createConverter(moduleLoader(), make);

    const pending = convert(FILES, enginePair('ggd_invasion', 'ezdrummer'), undefined, '3', 'nearest', 'remove');
    worker.onerror?.(new Event('error'));
    await pending;

    await convert(FILES, enginePair('ggd_invasion', 'ezdrummer'), undefined, 'auto', 'nearest', 'remove');
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
  const first = convert(FILES, enginePair('ggd_invasion', 'ezdrummer'), undefined, 'auto', 'nearest', 'remove');
  made[0].reply(made[0].sent[0].id, 'first');
  await first;
  return { made, convert };
}

describe('a converter whose worker died after answering', () => {
  it('sends the stranded batch to a new worker', async () => {
    const { made, convert } = await converterWithAnAnsweredWorker();
    const stranded = convert(FILES, enginePair('ggd_invasion', 'ezdrummer'), undefined, '3', 'nearest', 'remove');
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
    void convert(FILES, enginePair('ggd_invasion', 'ezdrummer'), undefined, 'auto', 'nearest', 'remove');
    expect(made).toHaveLength(2);
  });

  it('finishes on the main thread when the new worker dies before answering', async () => {
    const { made, convert } = await converterWithAnAnsweredWorker();
    const stranded = convert(FILES, enginePair('ggd_invasion', 'ezdrummer'), undefined, '3', 'nearest', 'remove');
    made[0].onerror?.(new Event('error'));
    made[1].onerror?.(new Event('error'));
    expect((await stranded).ok[0].name).toBe('a.mid');
    expect(remapMock.mock.calls[0][4]).toBe('3');
  });

  it('starts no third worker once the new one died before answering', async () => {
    const { made, convert } = await converterWithAnAnsweredWorker();
    const stranded = convert(FILES, enginePair('ggd_invasion', 'ezdrummer'), undefined, '3', 'nearest', 'remove');
    made[0].onerror?.(new Event('error'));
    made[1].onerror?.(new Event('error'));
    await stranded;
    await convert(FILES, enginePair('ggd_invasion', 'ezdrummer'), undefined, 'auto', 'nearest', 'remove');
    expect(made).toHaveLength(2);
  });

  it('ignores a late error from the worker it already ended', async () => {
    const { made, convert } = await converterWithAnAnsweredWorker();
    made[0].onerror?.(new Event('error'));
    const next = convert(FILES, enginePair('ggd_invasion', 'ezdrummer'), undefined, 'auto', 'nearest', 'remove');
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
    const batch = convert(FILES, enginePair('ggd_invasion', 'ezdrummer'), undefined, 'auto', 'nearest', 'remove', stop.signal);
    stop.abort();
    await expect(batch).rejects.toBe(stop.signal.reason);
  });

  it('ends the worker that was converting it', async () => {
    const { made, make } = workers();
    const { convert } = createConverter(moduleLoader(), make);
    const stop = new AbortController();
    const batch = convert(FILES, enginePair('ggd_invasion', 'ezdrummer'), undefined, 'auto', 'nearest', 'remove', stop.signal);
    stop.abort();
    await expect(batch).rejects.toBeDefined();
    expect(made[0].terminated).toBe(true);
  });

  it('leaves the next batch to a new worker', async () => {
    const { made, make } = workers();
    const { convert } = createConverter(moduleLoader(), make);
    const stop = new AbortController();
    const batch = convert(FILES, enginePair('ggd_invasion', 'ezdrummer'), undefined, 'auto', 'nearest', 'remove', stop.signal);
    stop.abort();
    await expect(batch).rejects.toBeDefined();
    const next = convert(FILES, enginePair('ggd_invasion', 'ezdrummer'), undefined, '10', 'nearest', 'remove');
    expect(made[1].sent.map((m) => m.channel)).toEqual(['10']);
    made[1].reply(made[1].sent[0].id, 'next');
    expect((await next).ok[0].name).toBe('next');
  });

  it('moves the other pending batches to the new worker', async () => {
    const { made, make } = workers();
    const { convert } = createConverter(moduleLoader(), make);
    const stop = new AbortController();
    const aborted = convert(FILES, enginePair('ggd_invasion', 'ezdrummer'), undefined, 'auto', 'nearest', 'remove', stop.signal);
    const kept = convert(FILES, enginePair('ggd_invasion', 'ezdrummer'), undefined, '5', 'nearest', 'remove');
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
      convert(FILES, enginePair('ggd_invasion', 'ezdrummer'), undefined, 'auto', 'nearest', 'remove', stop.signal),
    ).rejects.toBe(stop.signal.reason);
    expect(made).toHaveLength(0);
  });

  it('is rejected when it ran on the main thread and could not be stopped', async () => {
    const { convert } = createConverter(moduleLoader(), () => {
      throw new ReferenceError('Worker is not defined');
    });
    const stop = new AbortController();
    const batch = convert(FILES, enginePair('ggd_invasion', 'ezdrummer'), undefined, 'auto', 'nearest', 'remove', stop.signal);
    stop.abort();
    await expect(batch).rejects.toBe(stop.signal.reason);
  });

  it('leaves its worker running when the batch had already finished', async () => {
    const { made, make } = workers();
    const { convert } = createConverter(moduleLoader(), make);
    const stop = new AbortController();
    const batch = convert(FILES, enginePair('ggd_invasion', 'ezdrummer'), undefined, 'auto', 'nearest', 'remove', stop.signal);
    made[0].reply(made[0].sent[0].id, 'done');
    await batch;
    stop.abort();
    expect(made[0].terminated).toBe(false);
  });
});

const FITS = typed<SourceFits>({ hits: 2, ranked: [{ engine: 'ezdrummer', recognized: 2 }] });

describe('a fit', () => {
  it('goes to the worker with its files and channel', async () => {
    const { made, make } = workers();
    const { fits } = createConverter(moduleLoader(), make);
    const fitted = fits(FILES, '10');
    expect(made[0].fitsSent.map((m) => [m.files, m.channel])).toEqual([[FILES, '10']]);
    made[0].answer(made[0].fitsSent[0].id, { kind: 'fit', fits: FITS });
    expect(await fitted).toEqual(FITS);
  });

  it('runs on the main thread when no worker can be created', async () => {
    vi.mocked(stub.source_fits).mockReturnValue(FITS);
    const { fits } = createConverter(moduleLoader(), () => {
      throw new ReferenceError('Worker is not defined');
    });
    expect(await fits(FILES, 'auto')).toEqual(FITS);
  });

  it('is rejected when the worker answers it as another kind of request', async () => {
    const { made, make } = workers();
    const { fits } = createConverter(moduleLoader(), make);
    const fitted = fits(FILES, 'auto');
    made[0].reply(made[0].fitsSent[0].id, 'a.mid');
    await expect(fitted).rejects.toThrow('a fit request was answered as convert');
  });

  it('shares the worker with conversions, each reply going to its own request', async () => {
    const { made, make } = workers();
    const { convert, fits } = createConverter(moduleLoader(), make);
    const fitted = fits(FILES, 'auto');
    const converted = convert(FILES, enginePair('ggd_invasion', 'ezdrummer'), undefined, 'auto', 'nearest', 'remove');
    made[0].reply(made[0].sent[0].id, 'done');
    made[0].answer(made[0].fitsSent[0].id, { kind: 'fit', fits: FITS });
    expect(made).toHaveLength(1);
    expect((await converted).ok[0].name).toBe('done');
    expect(await fitted).toEqual(FITS);
  });
});
