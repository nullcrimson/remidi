import { useCallback } from 'react';
import { unreadableNotice, type LoadedFile, type OnFiles } from '../lib/files';
import { parsePresetFile } from '../lib/midiremap';
import type { NoticeLine } from '../lib/notice';
import { importPresets } from '../lib/presetImport';
import type { FocusTarget } from './useFocusIntent';
import type { SavedMappings } from './useSavedMappings';
import { track } from '../lib/stats';

/**
 * Takes files picked or dropped: MIDI files join the list and focus moves to the next
 * missing step (FROM, TO, then Convert); presets are imported; unreadable files and
 * import results are reported through `notify`.
 */
export function useFileIntake({
  storeFiles,
  src,
  tgt,
  saved,
  notify,
  focus,
}: {
  storeFiles: (files: LoadedFile[], skipped: string[]) => void;
  src: string;
  tgt: string;
  saved: Pick<SavedMappings, 'mappings' | 'save'>;
  notify: (lines: NoticeLine[]) => void;
  focus: (target: FocusTarget) => void;
}): OnFiles {
  const { mappings, save } = saved;
  return useCallback<OnFiles>(
    (files, skipped, presets = [], unreadable = []) => {
      const lines: NoticeLine[] = [
        ...(unreadable.length > 0 ? [{ message: unreadableNotice(unreadable) }] : []),
        ...(presets.length > 0 ? importPresets(presets, mappings, parsePresetFile, save) : []),
      ];
      if (presets.length > 0) track('preset-imported', { files: presets.length });
      if (lines.length > 0) notify(lines);
      if (files.length === 0 && skipped.length === 0) return;
      storeFiles(files, skipped);
      if (files.length === 0) return;
      track('midi-added', { files: files.length });
      focus(!src ? 'from' : !tgt ? 'to' : 'convert');
    },
    [storeFiles, src, tgt, mappings, save, notify, focus],
  );
}
