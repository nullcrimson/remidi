import { toAppError, type AppError } from '../core/errors';
import type { EnginePair } from '../core/enginePair';
import type { LoadedFile } from '../core/files';
import type { Advised, ChannelScope, EngineId, LoadMidiremap, MissingDrums, Overrides, Unrecognized } from '../core/midiremap';
import { selectionOf } from '../core/part';
import { runBatch, type BatchResult } from './batch';

/** A batch as the converter hands it to its worker. */
export interface BatchRequest {
  kind: 'convert';
  id: number;
  files: LoadedFile[];
  pair: EnginePair;
  ov?: Overrides;
  channel: ChannelScope;
  missing: MissingDrums;
  unrecognized: Unrecognized;
}

/** Files whose hits the worker advises on, for the conversion from `source` to `target` when one is chosen. */
export interface AdviceRequest {
  kind: 'advice';
  id: number;
  files: LoadedFile[];
  channel: ChannelScope;
  source: EngineId;
  target: EngineId | null;
}

/** Everything the converter hands its worker. */
export type WorkerRequest = BatchRequest | AdviceRequest;

/** What a request comes to, of the same kind as the request. */
export type Answer = { kind: 'convert'; result: BatchResult } | { kind: 'advice'; advised: Advised };

/** An answered request, or why the worker could not answer it. */
export type WorkerReply = { id: number; answer: Answer } | { id: number; error: AppError };

/** Answers a request on the module `load` yields; rejects when it cannot load. */
export async function answerHere(load: LoadMidiremap, request: WorkerRequest): Promise<Answer> {
  const core = await load();
  switch (request.kind) {
    case 'convert': {
      const { files, pair, ov, channel, missing, unrecognized } = request;
      return { kind: 'convert', result: runBatch(files, pair, ov, channel, missing, unrecognized, core) };
    }
    case 'advice':
      return {
        kind: 'advice',
        advised: core.sourceAdvice(
          request.files.map((f) => ({ bytes: f.bytes, selection: selectionOf(f.parts, request.channel) })),
          request.source,
          request.target,
        ),
      };
  }
}

/** What a worker answers a request with. */
export async function answerRequest(load: LoadMidiremap, request: WorkerRequest): Promise<WorkerReply> {
  try {
    return { id: request.id, answer: await answerHere(load, request) };
  } catch (err) {
    return { id: request.id, error: toAppError(err) };
  }
}

/** The buffers a reply hands over to the page instead of copying. */
export function transferred(reply: WorkerReply): ArrayBuffer[] {
  return 'answer' in reply && reply.answer.kind === 'convert' ? reply.answer.result.ok.map((c) => c.bytes.buffer) : [];
}
