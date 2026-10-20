import { useCallback } from 'react';
import { wasmUnavailable } from '../core/errors';
import { unreadableNotice, type LoadedFile, type OnFiles } from '../core/files';
import type { LoadMidiremap } from '../core/midiremap';
import type { NoticeLine } from '../core/notice';
import { importPresets, type ImportResult } from '../presets/presetImport';
import type { FocusTarget } from '../ui/useFocusIntent';
import type { SavedMappings } from '../presets/useSavedMappings';
import { track } from '../core/stats';
import type { StatEvents } from '../core/umami';

/** Where files taken in go, and what taking them in reads and reports to. */
export interface IntakeSetup {
  load: LoadMidiremap;
  storeFiles: (files: LoadedFile[], skipped: string[]) => void;
  src: string | null;
  tgt: string | null;
  saved: Pick<SavedMappings, 'mappings' | 'save'>;
  notify: (lines: NoticeLine[]) => void;
  focus: (target: FocusTarget) => void;
}

/**
 * Takes files picked, dropped or made as a sample: MIDI files join the list and focus moves to the next
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
  via,
}: IntakeSetup & { via: StatEvents['midi-added']['via'] }): OnFiles {
  const { mappings, save } = saved;
  return useCallback<OnFiles>(
    (files, skipped, presets = [], unreadable = { mid: [], presets: [] }) => {
      const names = [...unreadable.mid, ...unreadable.presets];
      const unread: NoticeLine[] = names.length > 0 ? [{ message: unreadableNotice(names) }] : [];
      if (presets.length > 0) {
        void load()
          .then(
            (core) => importPresets(presets, mappings, core.parsePresetFile, save),
            (err: unknown): ImportResult => ({
              lines: presets.map((p): NoticeLine => ({ failed: p.name, error: wasmUnavailable(err) })),
              skipped: 0,
              failed: presets.length,
            }),
          )
          .then(({ lines, skipped, failed }) => {
            track('preset-imported', { files: presets.length, skipped, failed });
            notify([...unread, ...lines]);
          });
      } else if (unread.length > 0) {
        notify(unread);
      }
      if (files.length === 0 && skipped.length === 0) return;
      storeFiles(files, skipped);
      if (files.length === 0) return;
      track('midi-added', { files: files.length, via, unreadable: unreadable.mid.length });
      focus(src === null ? 'from' : tgt === null ? 'to' : 'convert');
    },
    [load, storeFiles, src, tgt, mappings, save, notify, focus, via],
  );
}
