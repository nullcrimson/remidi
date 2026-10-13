import { convertRequest, type BatchReply, type BatchRequest, type BatchResult } from './batch';
import type { EnginePair } from '../core/enginePair';
import type { LoadedFile } from '../core/files';
import type { ChannelScope, LoadMidiremap, MissingDrums, Overrides } from '../core/midiremap';

/** Converts a batch of files, off the main thread where it can. */
export interface Converter {
  /** Rejects with `signal.reason` when `signal` aborts before the batch is delivered. */
  convert(
    files: LoadedFile[],
    pair: EnginePair,
    ov: Overrides | undefined,
    channel: ChannelScope,
    missing: MissingDrums,
    signal?: AbortSignal,
  ): Promise<BatchResult>;
}

type MakeWorker = () => Worker;

type WorkerState
  = | { kind: 'unstarted' }
    | { kind: 'running'; worker: Worker; answered: boolean }
    | { kind: 'unavailable' };

interface Pending {
  request: BatchRequest;
  resolve: (result: BatchResult) => void;
  reject: (error: unknown) => void;
}

function moduleWorker(): Worker {
  return new Worker(new URL('./convertWorker.ts', import.meta.url), { type: 'module' });
}

/**
 * Converts batches in a Web Worker so the page stays responsive, on the module `load`
 * yields when it has to use the main thread.
 *
 * A worker that dies after it has answered a batch is replaced, and the batches it left
 * go to the new worker. One that dies before answering anything, or cannot be created,
 * ends the use of workers: those batches and all later ones run on the main thread. A
 * batch the worker could not convert is rejected, since the main thread would fail the
 * same way.
 *
 * Aborting a batch ends the worker converting it, the only way to stop a conversion
 * that is running; the other pending batches move to a new worker.
 */
export function createConverter(load: LoadMidiremap, makeWorker: MakeWorker = moduleWorker): Converter {
  let state: WorkerState = { kind: 'unstarted' };
  let nextId = 0;
  const pending = new Map<number, Pending>();

  const retire = (next: WorkerState) => {
    if (state.kind === 'running') state.worker.terminate();
    state = next;
    const left = [...pending.values()];
    pending.clear();
    left.forEach(submit);
  };

  const connect = (): Worker | null => {
    if (state.kind === 'running') return state.worker;
    if (state.kind === 'unavailable') return null;
    let worker: Worker;
    try {
      worker = makeWorker();
    } catch {
      state = { kind: 'unavailable' };
      return null;
    }
    const running: WorkerState = { kind: 'running', worker, answered: false };
    const died = () => {
      if (state === running) retire(running.answered ? { kind: 'unstarted' } : { kind: 'unavailable' });
    };
    worker.onmessage = (e: MessageEvent<BatchReply>) => {
      running.answered = true;
      const reply = e.data;
      const p = pending.get(reply.id);
      pending.delete(reply.id);
      if (!p) return;
      if ('error' in reply) p.reject(reply.error);
      else p.resolve(reply.result);
    };
    worker.onerror = died;
    worker.onmessageerror = died;
    state = running;
    return worker;
  };

  function submit(p: Pending) {
    const worker = connect();
    if (!worker) {
      void convertRequest(load, p.request).then(p.resolve, p.reject);
      return;
    }
    pending.set(p.request.id, p);
    worker.postMessage(p.request);
  }

  return {
    convert(files, pair, ov, channel, missing, signal) {
      const request: BatchRequest = { id: nextId++, files, pair, ov, channel, missing };
      return new Promise((resolve, reject) => {
        if (signal?.aborted) {
          reject(signal.reason);
          return;
        }
        signal?.addEventListener(
          'abort',
          () => {
            reject(signal.reason);
            if (pending.delete(request.id)) retire({ kind: 'unstarted' });
          },
          { once: true },
        );
        submit({ request, resolve, reject });
      });
    },
  };
}
