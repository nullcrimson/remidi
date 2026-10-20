import { answerRequest, transferred, type WorkerRequest } from './workerProtocol';
import { moduleLoader } from '../core/midiremap';

const load = moduleLoader();

self.onmessage = async (e: MessageEvent<WorkerRequest>) => {
  const reply = await answerRequest(load, e.data);
  self.postMessage(reply, { transfer: transferred(reply) });
};
