import { useCallback } from 'react';
import { wasmUnavailable } from '../core/errors';
import { unreadableNotice, type LoadedFile, type OnFiles } from '../core/files';
import type { LoadMidiremap } from '../core/midiremap';
import type { NoticeLine } from '../core/notice';
import { importPresets } from '../presets/presetImport';
import type { FocusTarget } from '../ui/useFocusIntent';
import type { SavedMappings } from '../presets/useSavedMappings';
import { track } from '../core/stats';

/**
 * Takes files picked or dropped: MIDI files join the list and focus moves to the next
 * missing step (FROM, TO, then Convert); presets are imported once `load` has yielded the
 * converter module, so one dropped while it loads is not lost; unreadable files and
 * import results are reported through `notify`, in one notice.
 */
export function useFileIntake({
  load,
  storeFiles,
  src,
  tgt,
  saved,
  notify,
  focus,
}: {
  load: LoadMidiremap;
  storeFiles: (files: LoadedFile[], skipped: string[]) => void;
  src: string | null;
  tgt: string | null;
  saved: Pick<SavedMappings, 'mappings' | 'save'>;
  notify: (lines: NoticeLine[]) => void;
  focus: (target: FocusTarget) => void;
}): OnFiles {
  const { mappings, save } = saved;
  return useCallback<OnFiles>(
    (files, skipped, presets = [], unreadable = []) => {
      const unread: NoticeLine[] = unreadable.length > 0 ? [{ message: unreadableNotice(unreadable) }] : [];
      if (presets.length > 0) {
        track('preset-imported', { files: presets.length });
        void load()
          .then(
            (core) => importPresets(presets, mappings, core.parsePresetFile, save),
            (err: unknown) => presets.map((p): NoticeLine => ({ failed: p.name, error: wasmUnavailable(err) })),
          )
          .then((imported) => notify([...unread, ...imported]));
      } else if (unread.length > 0) {
        notify(unread);
      }
      if (files.length === 0 && skipped.length === 0) return;
      storeFiles(files, skipped);
      if (files.length === 0) return;
      track('midi-added', { files: files.length });
      focus(src === null ? 'from' : tgt === null ? 'to' : 'convert');
    },
    [load, storeFiles, src, tgt, mappings, save, notify, focus],
  );
}
