import type { EnginePair } from '../core/enginePair';
import { uniqueName, type SavedMapping } from './mappings';
import type { PresetName } from '../core/midiremap';
import { editCount, type Edits, type SrcEdits } from '../core/overrides';
import type { NoticeLine } from '../core/notice';
import { skippedNotice } from './presetImport';
import type { SavedMappings } from './useSavedMappings';
import { track } from '../core/stats';
import type { StatEvents } from '../core/umami';

/** What the preset actions read from and change on the screen. */
export interface PresetSetup {
  edits: Edits;
  srcEdits: SrcEdits;
  loadMapping: (m: SavedMapping) => number;
  setPreset: (id: string | null) => void;
  openEditor: () => void;
}

/**
 * Presets as the screen uses them: save and update from the open pair and its edits,
 * duplicate, load (saying which edits were skipped) and open for editing.
 */
export function usePresetActions(
  setup: PresetSetup,
  saved: SavedMappings,
  notify: (lines: NoticeLine[] | null) => void,
) {
  const { edits, srcEdits, loadMapping, setPreset, openEditor } = setup;
  const apply = (m: SavedMapping) => {
    const skipped = skippedNotice(m.name, loadMapping(m));
    notify(skipped && [{ message: skipped }]);
  };
  const load = (m: SavedMapping) => {
    track('preset-loaded');
    apply(m);
  };
  const reportSaved = (how: StatEvents['preset-saved']['how']) => (stored: boolean) =>
    track('preset-saved', { how, stored, edits: editCount({ edits, srcEdits }) });
  return {
    open: (id: string | null) => saved.mappings.find((m) => m.id === id),
    save: (pair: EnginePair, name: PresetName) => {
      const id = saved.save({ name, ...pair, edits, srcEdits }, reportSaved('new'));
      if (id) setPreset(id);
    },
    update: (id: string, name: PresetName) => saved.update(id, { name, edits, srcEdits }, reportSaved('update')),
    duplicate: (m: SavedMapping) =>
      saved.save({
        name: uniqueName(m.name, saved.mappings.map((other) => other.name)),
        src: m.src,
        tgt: m.tgt,
        edits: m.edits,
        srcEdits: m.srcEdits,
      }),
    load,
    edit: (m: SavedMapping) => {
      apply(m);
      openEditor();
    },
  };
}
