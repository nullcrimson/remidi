import { runBatch, type BatchResult } from './batch';
import type { Channel } from './channel';
import type { LoadedFile } from './files';
import { ready, remap, type Overrides } from './midiremap';

export interface BatchRequest {
  id: number;
  files: LoadedFile[];
  src: string;
  tgt: string;
  ov?: Overrides;
  channel: Channel;
}

export interface BatchReply {
  id: number;
  result: BatchResult;
}

type MakeWorker = () => Worker;

interface Pending {
  request: BatchRequest;
  resolve: (result: BatchResult) => void;
}

async function onMainThread({ files, src, tgt, ov, channel }: BatchRequest): Promise<BatchResult> {
  await ready();
  return runBatch(files, src, tgt, ov, channel, remap);
}

function moduleWorker(): Worker {
  return new Worker(new URL('./convertWorker.ts', import.meta.url), { type: 'module' });
}

/**
 * Converts batches in a Web Worker so the page stays responsive. Falls back to the main
 * thread when no worker can be created or the worker fails.
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
    for (const p of stranded) void onMainThread(p.request).then(p.resolve);
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
      const p = pending.get(e.data.id);
      pending.delete(e.data.id);
      p?.resolve(e.data.result);
    };
    worker.onerror = fail;
    return worker;
  };

  const convert = (
    files: LoadedFile[],
    src: string,
    tgt: string,
    ov: Overrides | undefined,
    channel: Channel,
  ): Promise<BatchResult> => {
    const request: BatchRequest = { id: nextId++, files, src, tgt, ov, channel };
    const w = connect();
    if (!w) return onMainThread(request);
    return new Promise((resolve) => {
      pending.set(request.id, { request, resolve });
      w.postMessage(request);
    });
  };

  return { convert };
}

export const convertBatch = createConverter().convert;
