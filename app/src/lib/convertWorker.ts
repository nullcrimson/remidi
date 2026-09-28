import { runBatch } from './batch';
import type { BatchReply, BatchRequest } from './converter';
import { ready, remap } from './midiremap';

self.onmessage = async (e: MessageEvent<BatchRequest>) => {
  const { id, files, src, tgt, ov, channel, missing } = e.data;
  await ready();
  const result = runBatch(files, src, tgt, ov, channel, missing, remap);
  const reply: BatchReply = { id, result };
  self.postMessage(reply, { transfer: result.ok.map((c) => c.bytes.buffer) });
};
