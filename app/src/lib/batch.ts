import type { Channel } from './channel';
import { errorMessage } from './errors';
import type { LoadedFile } from './files';
import type { Overrides, RemapReport, RemapResult } from './midiremap';
import type { Missing } from './missing';

export interface ConvertedFile {
  name: string;
  bytes: Uint8Array<ArrayBuffer>;
  report: RemapReport;
}

export interface FailedFile {
  name: string;
  error: string;
}

export interface BatchResult {
  ok: ConvertedFile[];
  failed: FailedFile[];
}

export type Remap = (
  mid: Uint8Array,
  src: string,
  tgt: string,
  ov?: Overrides,
  channel?: Channel,
  missing?: Missing,
) => RemapResult;

/** Converts every file independently; one bad file never stops the batch. */
export function runBatch(
  files: LoadedFile[],
  src: string,
  tgt: string,
  ov: Overrides | undefined,
  channel: Channel,
  missing: Missing,
  remap: Remap,
): BatchResult {
  const ok: ConvertedFile[] = [];
  const failed: FailedFile[] = [];
  for (const f of files) {
    try {
      const { bytes, report } = remap(f.bytes, src, tgt, ov, channel, missing);
      ok.push({ name: f.name, bytes, report });
    } catch (e) {
      failed.push({ name: f.name, error: errorMessage(e) });
    }
  }
  return { ok, failed };
}
