import { toAppError, type AppError } from '../core/errors';
import type { EnginePair } from '../core/enginePair';
import type { LoadedFile } from '../core/files';
import type { ChannelScope, Damage, Midiremap, MissingDrums, Overrides, Part, Report, Unrecognized } from '../core/midiremap';

interface ConvertedFile {
  name: string;
  bytes: Uint8Array<ArrayBuffer>;
  report: Report;
  damage: Damage[];
  picked: Part[];
  offers: Part[];
}

export interface FailedFile {
  name: string;
  error: AppError;
}

export interface BatchResult {
  ok: ConvertedFile[];
  failed: FailedFile[];
  /** The files that converted nothing: several parts have notes, none on channel 10, and none were picked. */
  asked: string[];
}

/** Converts every file independently, a file with picked parts through only those; one bad file never stops the batch. */
export function runBatch(
  files: LoadedFile[],
  pair: EnginePair,
  ov: Overrides | undefined,
  channel: ChannelScope,
  missing: MissingDrums,
  unrecognized: Unrecognized,
  core: Pick<Midiremap, 'remap' | 'remapParts'>,
): BatchResult {
  const result: BatchResult = { ok: [], failed: [], asked: [] };
  for (const f of files) {
    try {
      const conversion = f.parts !== undefined && f.parts.length > 0
        ? core.remapParts(f.bytes, pair, ov, f.parts, missing, unrecognized)
        : core.remap(f.bytes, pair, ov, channel, missing, unrecognized);
      if (conversion.kind === 'ask') {
        result.asked.push(f.name);
        continue;
      }
      const { bytes, report, damage, picked, offers } = conversion;
      result.ok.push({ name: f.name, bytes, report, damage, picked, offers });
    } catch (e) {
      result.failed.push({ name: f.name, error: toAppError(e) });
    }
  }
  return result;
}
