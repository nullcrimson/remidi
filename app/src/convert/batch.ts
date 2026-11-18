import { toAppError, type AppError } from '../core/errors';
import type { EnginePair } from '../core/enginePair';
import type { LoadedFile } from '../core/files';
import type { ChannelScope, Damage, Midiremap, MissingDrums, Overrides, Part, PartSummary, Report, Unrecognized } from '../core/midiremap';
import { selectionOf } from '../core/part';

interface ConvertedFile {
  input: LoadedFile;
  bytes: Uint8Array<ArrayBuffer>;
  report: Report;
  damage: Damage[];
  picked: Part[];
  offers: PartSummary[];
}

export interface FailedFile {
  name: string;
  error: AppError;
}

export interface BatchResult {
  ok: ConvertedFile[];
  failed: FailedFile[];
  /** The files that converted nothing: `auto` asks which parts are the drums, and none were picked. */
  asked: string[];
  /** Whether the converted files together left out a heavy share of the hits they read, as the module judges it. */
  heavy: boolean;
}

/**
 * Converts every file independently, a file with picked parts through only those; one bad file
 * never stops the batch. Whether the batch's loss is heavy is judged over every converted file.
 */
export function runBatch(
  files: LoadedFile[],
  pair: EnginePair,
  ov: Overrides | undefined,
  channel: ChannelScope,
  missing: MissingDrums,
  unrecognized: Unrecognized,
  core: Pick<Midiremap, 'remap' | 'lossIsHeavy'>,
): BatchResult {
  const result: Omit<BatchResult, 'heavy'> = { ok: [], failed: [], asked: [] };
  for (const f of files) {
    try {
      const conversion = core.remap(f.bytes, pair, ov, selectionOf(f.parts, channel), missing, unrecognized);
      if (conversion.kind === 'ask') {
        result.asked.push(f.name);
        continue;
      }
      const { bytes, report, damage, picked, offers } = conversion;
      result.ok.push({ input: f, bytes, report, damage, picked, offers });
    } catch (e) {
      result.failed.push({ name: f.name, error: toAppError(e) });
    }
  }
  return { ...result, heavy: core.lossIsHeavy(result.ok.map((file) => file.report)) };
}
