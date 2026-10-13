import type { EnginePair } from '../core/enginePair';
import { uniqueName, type SavedMapping } from './mappings';
import type { PresetName } from '../core/midiremap';
import type { Edits, SrcEdits } from '../core/overrides';
import type { NoticeLine } from '../core/notice';
import { skippedNotice } from './presetImport';
import type { SavedMappings } from './useSavedMappings';
import { track } from '../core/stats';

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
  const load = (m: SavedMapping) => {
    track('preset-loaded');
    const skipped = skippedNotice(m.name, loadMapping(m));
    notify(skipped && [{ message: skipped }]);
  };
  return {
    open: (id: string | null) => saved.mappings.find((m) => m.id === id),
    save: (pair: EnginePair, name: PresetName) => {
      const id = saved.save({ name, ...pair, edits, srcEdits });
      track('preset-saved');
      if (id) setPreset(id);
    },
    update: (id: string, name: PresetName) => saved.update(id, { name, edits, srcEdits }),
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
      load(m);
      openEditor();
    },
  };
}
