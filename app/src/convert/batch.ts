import { toAppError, type AppError } from '../core/errors';
import type { EnginePair } from '../core/enginePair';
import type { LoadedFile } from '../core/files';
import type { ChannelScope, Midiremap, MissingDrums, Overrides, Report, Unrecognized } from '../core/midiremap';

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

/** Converts every file independently; one bad file never stops the batch. */
export function runBatch(
  files: LoadedFile[],
  pair: EnginePair,
  ov: Overrides | undefined,
  channel: ChannelScope,
  missing: MissingDrums,
  unrecognized: Unrecognized,
  remap: Midiremap['remap'],
): BatchResult {
  const ok: ConvertedFile[] = [];
  const failed: FailedFile[] = [];
  for (const f of files) {
    try {
      const { bytes, report } = remap(f.bytes, pair, ov, channel, missing, unrecognized);
      ok.push({ name: f.name, bytes, report });
    } catch (e) {
      failed.push({ name: f.name, error: toAppError(e) });
    }
  }
  return { ok, failed };
}
