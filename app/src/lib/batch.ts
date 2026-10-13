import type { Channel } from './channel';
import { toAppError, type AppError } from './errors';
import type { LoadedFile } from './files';
import type { MissingDrums, Overrides, RemapOutput, Report } from './midiremap';

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

type Remap = (
  mid: Uint8Array,
  src: string,
  tgt: string,
  ov?: Overrides,
  channel?: Channel,
  missing?: MissingDrums,
) => RemapOutput;

/** Converts every file independently; one bad file never stops the batch. */
export function runBatch(
  files: LoadedFile[],
  src: string,
  tgt: string,
  ov: Overrides | undefined,
  channel: Channel,
  missing: MissingDrums,
  remap: Remap,
): BatchResult {
  const ok: ConvertedFile[] = [];
  const failed: FailedFile[] = [];
  for (const f of files) {
    try {
      const { bytes, report } = remap(f.bytes, src, tgt, ov, channel, missing);
      ok.push({ name: f.name, bytes, report });
    } catch (e) {
      failed.push({ name: f.name, error: toAppError(e) });
    }
  }
  return { ok, failed };
}
