import { toAppError, type AppError } from '../core/errors';
import type { EnginePair } from '../core/enginePair';
import type { LoadedFile } from '../core/files';
import type { ChannelScope, LoadMidiremap, Midiremap, MissingDrums, Overrides, Report } from '../core/midiremap';

interface ConvertedFile {
  name: string;
  bytes: Uint8Array<ArrayBuffer>;
  report: Report;
}

export interface FailedFile {
  name: string;
  error: AppError;
}

export interface BatchResult {
  ok: ConvertedFile[];
  failed: FailedFile[];
}

/** A batch as the converter hands it to its worker. */
export interface BatchRequest {
  id: number;
  files: LoadedFile[];
  pair: EnginePair;
  ov?: Overrides;
  channel: ChannelScope;
  missing: MissingDrums;
}

/** A converted batch, or why the worker could not convert it. */
export type BatchReply = { id: number; result: BatchResult } | { id: number; error: AppError };

/** Converts every file independently; one bad file never stops the batch. */
export function runBatch(
  files: LoadedFile[],
  pair: EnginePair,
  ov: Overrides | undefined,
  channel: ChannelScope,
  missing: MissingDrums,
  remap: Midiremap['remap'],
): BatchResult {
  const ok: ConvertedFile[] = [];
  const failed: FailedFile[] = [];
  for (const f of files) {
    try {
      const { bytes, report } = remap(f.bytes, pair, ov, channel, missing);
      ok.push({ name: f.name, bytes, report });
    } catch (e) {
      failed.push({ name: f.name, error: toAppError(e) });
    }
  }
  return { ok, failed };
}

/** Converts a request's files on the module `load` yields; rejects when it cannot load. */
export async function convertRequest(
  load: LoadMidiremap,
  { files, pair, ov, channel, missing }: BatchRequest,
): Promise<BatchResult> {
  const core = await load();
  return runBatch(files, pair, ov, channel, missing, core.remap);
}

/** What a worker answers a request with. */
export async function answerRequest(load: LoadMidiremap, request: BatchRequest): Promise<BatchReply> {
  try {
    return { id: request.id, result: await convertRequest(load, request) };
  } catch (err) {
    return { id: request.id, error: toAppError(err) };
  }
}
