import { useMemo } from 'react';
import { editLines, presetMatch, previewLines, sourceDefaults, type PresetMatch } from '../lib/editSummary';
import type { SavedMapping } from '../lib/mappings';
import type { OctaveBase } from '../lib/notes';
import type { Editor } from './useEditor';

/** How many drums differ from the default mapping, a preview of them, and the open preset. */
export function useEditedSummary(
  editor: Editor,
  oct: OctaveBase,
  preset: SavedMapping | undefined,
): { count: number; lines: string[]; preset: PresetMatch } {
  const { rows, changed, sourceNotes, canonOptions, edits, srcEdits } = editor;
  const defaults = useMemo(() => sourceDefaults(sourceNotes), [sourceNotes]);
  const canons = useMemo(() => new Set(canonOptions.map((c) => c.canon)), [canonOptions]);
  return useMemo(
    () => ({
      count: changed.size,
      lines: previewLines(editLines(rows, changed, defaults, oct)),
      preset: presetMatch(preset, { edits, srcEdits }, canons),
    }),
    [rows, changed, defaults, oct, preset, edits, srcEdits, canons],
  );
}
