import { toAppError, type AppError } from '../core/errors';
import type { EnginePair } from '../core/enginePair';
import type { LoadedFile } from '../core/files';
import type { ChannelScope, LoadMidiremap, MissingDrums, Overrides, SourceFits } from '../core/midiremap';
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
}

/** Files whose hits the worker fits to every engine's layout. */
export interface FitRequest {
  kind: 'fit';
  id: number;
  files: LoadedFile[];
  channel: ChannelScope;
}

/** Everything the converter hands its worker. */
export type WorkerRequest = BatchRequest | FitRequest;

/** What a request comes to, of the same kind as the request. */
export type Answer = { kind: 'convert'; result: BatchResult } | { kind: 'fit'; fits: SourceFits };

/** An answered request, or why the worker could not answer it. */
export type WorkerReply = { id: number; answer: Answer } | { id: number; error: AppError };

/** Answers a request on the module `load` yields; rejects when it cannot load. */
export async function answerHere(load: LoadMidiremap, request: WorkerRequest): Promise<Answer> {
  const core = await load();
  switch (request.kind) {
    case 'convert': {
      const { files, pair, ov, channel, missing } = request;
      return { kind: 'convert', result: runBatch(files, pair, ov, channel, missing, core.remap) };
    }
    case 'fit':
      return { kind: 'fit', fits: core.sourceFits(request.files.map((f) => f.bytes), request.channel) };
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
