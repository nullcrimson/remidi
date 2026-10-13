import type { Message } from '../generated/i18n';
import { useMemo } from 'react';
import { editLines, presetMatch, previewLines, sourceDefaults, type PresetMatch } from '../lib/editSummary';
import type { SavedMapping } from '../lib/mappings';
import type { OctaveBase } from '../lib/notes';
import type { Editor } from './useEditor';

/** How many drums differ from the default mapping, a preview of them, and the open preset. */
export function useEditedSummary(
  editor: Pick<Editor, 'rows' | 'changed' | 'sourceNotes' | 'vocabulary' | 'edits' | 'srcEdits'>,
  oct: OctaveBase,
  preset: SavedMapping | undefined,
): { count: number; lines: Message[]; preset: PresetMatch } {
  const { rows, changed, sourceNotes, vocabulary, edits, srcEdits } = editor;
  const defaults = useMemo(() => sourceDefaults(sourceNotes), [sourceNotes]);
  return useMemo(
    () => ({
      count: changed.size,
      lines: previewLines(editLines(rows, changed, defaults, oct)),
      preset: presetMatch(preset, { edits, srcEdits }, vocabulary),
    }),
    [rows, changed, defaults, oct, preset, edits, srcEdits, vocabulary],
  );
}
