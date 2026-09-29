import { runBatch, type BatchResult } from './batch';
import type { Channel } from './channel';
import type { AppError } from './errors';
import type { LoadedFile } from './files';
import { ready, remap, type Overrides } from './midiremap';
import type { Missing } from './missing';

export interface BatchRequest {
  id: number;
  files: LoadedFile[];
  src: string;
  tgt: string;
  ov?: Overrides;
  channel: Channel;
  missing: Missing;
}

/** A converted batch, or why the worker could not convert it. */
export type BatchReply = { id: number; result: BatchResult } | { id: number; error: AppError };

type MakeWorker = () => Worker;

interface Pending {
  request: BatchRequest;
  resolve: (result: BatchResult) => void;
  reject: (error: unknown) => void;
}

async function onMainThread({
  files,
  src,
  tgt,
  ov,
  channel,
  missing,
}: BatchRequest): Promise<BatchResult> {
  await ready();
  return runBatch(files, src, tgt, ov, channel, missing, remap);
}

function moduleWorker(): Worker {
  return new Worker(new URL('./convertWorker.ts', import.meta.url), { type: 'module' });
}

/**
 * Converts batches in a Web Worker so the page stays responsive. Falls back to the main
 * thread when no worker can be created or the worker dies; a batch the worker could not
 * convert is rejected, since the main thread would fail the same way.
 */
export function createConverter(makeWorker: MakeWorker = moduleWorker) {
  let worker: Worker | null = null;
  let broken = false;
  let nextId = 0;
  const pending = new Map<number, Pending>();

  const fail = () => {
    broken = true;
    worker?.terminate();
    worker = null;
    const stranded = [...pending.values()];
    pending.clear();
    for (const p of stranded) void onMainThread(p.request).then(p.resolve, p.reject);
  };

  const connect = (): Worker | null => {
    if (worker || broken) return worker;
    try {
      worker = makeWorker();
    } catch {
      broken = true;
      return null;
    }
    worker.onmessage = (e: MessageEvent<BatchReply>) => {
      const reply = e.data;
      const p = pending.get(reply.id);
      pending.delete(reply.id);
      if (!p) return;
      if ('error' in reply) p.reject(reply.error);
      else p.resolve(reply.result);
    };
    worker.onerror = fail;
    worker.onmessageerror = fail;
    return worker;
  };

  const convert = (
    files: LoadedFile[],
    src: string,
    tgt: string,
    ov: Overrides | undefined,
    channel: Channel,
    missing: Missing,
  ): Promise<BatchResult> => {
    const request: BatchRequest = { id: nextId++, files, src, tgt, ov, channel, missing };
    const w = connect();
    if (!w) return onMainThread(request);
    return new Promise((resolve, reject) => {
      pending.set(request.id, { request, resolve, reject });
      w.postMessage(request);
    });
  };

  return { convert };
}

export const convertBatch = createConverter().convert;
