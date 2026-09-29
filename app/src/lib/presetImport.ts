import type { Message } from '../generated/i18n';
import { toAppError } from './errors';
import type { PresetText } from './files';
import { MAPPINGS_CAP, type SavedMapping } from './mappings';
import type { ImportedPreset } from './midiremap';
import type { NoticeLine } from './notice';
import { uniqueName, type PresetContent } from './presetFile';

const atCap = (file: string): NoticeLine => ({ message: { id: 'import-at-cap', args: { file, cap: MAPPINGS_CAP } } });

/** Why a loaded preset lost edits, or null when it kept them all. */
export function skippedNotice(name: string, skipped: number): Message | null {
  if (skipped === 0) return null;
  return { id: 'preset-skipped', args: { name, count: skipped } };
}

/**
 * Imports preset files through `parse` and `save`, returning one line per file for the
 * notice. Names are made unique against `existing` and earlier files in the batch.
 */
export function importPresets(
  files: PresetText[],
  existing: SavedMapping[],
  parse: (json: string) => ImportedPreset,
  save: (p: PresetContent) => string | null,
): NoticeLine[] {
  const taken = existing.map((m) => m.name);
  let count = existing.length;
  return files.map((file): NoticeLine => {
    let preset: ImportedPreset;
    try {
      preset = parse(file.text);
    } catch (err) {
      return { failed: file.name, error: toAppError(err) };
    }
    if (count >= MAPPINGS_CAP) return atCap(file.name);
    const name = uniqueName(preset.name, taken);
    if (!save({ name, src: preset.src, tgt: preset.tgt, edits: preset.edits, srcEdits: preset.srcEdits })) {
      return atCap(file.name);
    }
    taken.push(name);
    count += 1;
    const skipped = preset.skipped.length;
    return {
      message: skipped > 0
        ? { id: 'import-done-skipped', args: { name, count: skipped } }
        : { id: 'import-done', args: { name } },
    };
  });
}
