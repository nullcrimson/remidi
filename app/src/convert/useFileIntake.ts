import { useCallback } from 'react';
import { wasmUnavailable } from '../core/errors';
import type { LoadedFile, OnFiles } from '../core/files';
import type { LoadMidiremap } from '../core/midiremap';
import type { NoticeLine } from '../core/notice';
import type { Locale, Message } from '../generated/i18n';
import { listed } from '../locale/list';
import { useLocale } from '../locale/localeContext';
import { importPresets, type ImportResult } from '../presets/presetImport';
import type { FocusTarget } from '../ui/useFocusIntent';
import type { SavedMappings } from '../presets/useSavedMappings';
import { track } from '../core/stats';
import type { StatEvents } from '../core/umami';

/** The notice for files the browser could not read, listing them in the words of `locale`. */
function unreadableNotice(names: string[], locale: Locale): Message {
  return { id: 'files-unreadable', args: { names: listed(locale, names), count: names.length } };
}

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
  const { locale } = useLocale().translator;
  return useCallback<OnFiles>(
    (files, skipped, presets = [], unreadable = { mid: [], presets: [] }) => {
      const names = [...unreadable.mid, ...unreadable.presets];
      const unread: NoticeLine[] = names.length > 0 ? [{ message: unreadableNotice(names, locale) }] : [];
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
    [load, storeFiles, src, tgt, mappings, save, notify, focus, via, locale],
  );
}
