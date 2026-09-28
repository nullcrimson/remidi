import type { PresetText } from './files';
import { MAPPINGS_CAP, type SavedMapping } from './mappings';
import type { ImportedPreset } from './midiremap';
import { uniqueName, type PresetContent } from './presetFile';

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

/** Why a loaded preset lost edits, or null when it kept them all. */
export function skippedNotice(name: string, skipped: number): string | null {
  if (skipped === 0) return null;
  return skipped === 1
    ? `1 edit in '${name}' uses a drum this version doesn't know; skipped.`
    : `${skipped} edits in '${name}' use drums this version doesn't know; skipped.`;
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
): string {
  const taken = existing.map((m) => m.name);
  let count = existing.length;
  const lines = files.map((file) => {
    let preset: ImportedPreset;
    try {
      preset = parse(file.text);
    } catch (err) {
      return `Couldn't import ${file.name}: ${err instanceof Error ? err.message : String(err)}`;
    }
    if (count >= MAPPINGS_CAP) return `Couldn't import ${file.name}: preset limit reached (${MAPPINGS_CAP})`;
    const name = uniqueName(preset.name, taken);
    if (!save({ name, src: preset.src, tgt: preset.tgt, edits: preset.edits, srcEdits: preset.srcEdits })) {
      return `Couldn't import ${file.name}: preset limit reached (${MAPPINGS_CAP})`;
    }
    taken.push(name);
    count += 1;
    const skipped = preset.skipped.length;
    return skipped > 0 ? `Imported '${name}' (${plural(skipped, 'edit', 'edits')} skipped).` : `Imported '${name}'.`;
  });
  return lines.join(' ');
}
