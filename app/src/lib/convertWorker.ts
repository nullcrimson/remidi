import { answerRequest, type BatchRequest } from './batch';
import { moduleLoader } from './midiremap';

const load = moduleLoader();

self.onmessage = async (e: MessageEvent<BatchRequest>) => {
  const reply = await answerRequest(load, e.data);
  self.postMessage(reply, { transfer: 'result' in reply ? reply.result.ok.map((c) => c.bytes.buffer) : [] });
};
