import type { Message } from '../generated/i18n';
import { toAppError } from '../core/errors';
import type { PresetText } from '../core/files';
import { MAPPINGS_CAP, uniqueName, type SavedMapping } from './mappings';
import type { LoadedPreset } from '../core/midiremap';
import type { NoticeLine } from '../core/notice';
import type { PresetContent } from './presetFile';

const atCap = (file: string): NoticeLine => ({ message: { id: 'import-at-cap', args: { file, cap: MAPPINGS_CAP } } });

/** Why a loaded preset lost edits, or null when it kept them all. */
export function skippedNotice(name: string, skipped: number): Message | null {
  if (skipped === 0) return null;
  return { id: 'preset-skipped', args: { name, count: skipped } };
}

/** What importing one preset file left: its notice line, the edits it skipped and whether it was refused. */
interface FileOutcome {
  line: NoticeLine;
  skipped: number;
  refused: 0 | 1;
}

/** What importing preset files left: one notice line per file, the edits skipped and the files refused. */
export interface ImportResult {
  lines: NoticeLine[];
  skipped: number;
  failed: number;
}

/**
 * Imports preset files through `parse` and `save`, returning one line per file for the
 * notice. Names are made unique against `existing` and earlier files in the batch.
 */
export function importPresets(
  files: PresetText[],
  existing: SavedMapping[],
  parse: (json: string) => LoadedPreset,
  save: (p: PresetContent) => string | null,
): ImportResult {
  const taken = existing.map((m) => m.name);
  let count = existing.length;
  const outcomes = files.map((file): FileOutcome => {
    let preset: LoadedPreset;
    try {
      preset = parse(file.text);
    } catch (err) {
      return { line: { failed: file.name, error: toAppError(err) }, skipped: 0, refused: 1 };
    }
    if (count >= MAPPINGS_CAP) {
      return { line: atCap(file.name), skipped: 0, refused: 1 };
    }
    const name = uniqueName(preset.name, taken);
    if (!save({ name, src: preset.src, tgt: preset.tgt, edits: preset.edits, srcEdits: preset.srcEdits })) {
      return { line: atCap(file.name), skipped: 0, refused: 1 };
    }
    taken.push(name);
    count += 1;
    const skipped = preset.skipped.length;
    const message: Message = skipped > 0
      ? { id: 'import-done-skipped', args: { name, count: skipped } }
      : { id: 'import-done', args: { name } };
    return { line: { message }, skipped, refused: 0 };
  });
  return {
    lines: outcomes.map((o) => o.line),
    skipped: outcomes.reduce((sum, o) => sum + o.skipped, 0),
    failed: outcomes.reduce((sum, o) => sum + o.refused, 0),
  };
}
