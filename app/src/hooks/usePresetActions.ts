import type { SavedMapping } from '../lib/mappings';
import type { Edits, SrcEdits } from '../lib/overrides';
import { skippedNotice } from '../lib/presetImport';
import type { SavedMappings } from './useSavedMappings';

/** What the preset actions read from and change on the screen. */
export interface PresetSetup {
  src: string;
  tgt: string;
  edits: Edits;
  srcEdits: SrcEdits;
  loadMapping: (m: SavedMapping) => number;
  setPreset: (id: string | null) => void;
  setView: (view: 'convert' | 'edit') => void;
}

/**
 * Presets as the screen uses them: save and update from the open pair and its edits,
 * duplicate, load (saying which edits were skipped) and open for editing.
 */
export function usePresetActions(
  setup: PresetSetup,
  saved: SavedMappings,
  notify: (message: string | null) => void,
) {
  const { src, tgt, edits, srcEdits, loadMapping, setPreset, setView } = setup;
  const load = (m: SavedMapping) => notify(skippedNotice(m.name, loadMapping(m)));
  return {
    open: (id: string | null) => saved.mappings.find((m) => m.id === id),
    save: (name: string) => {
      const id = saved.save({ name, src, tgt, edits, srcEdits });
      if (id) setPreset(id);
    },
    update: (id: string, name: string) => saved.update(id, { name, edits, srcEdits }),
    duplicate: (m: SavedMapping) =>
      saved.save({ name: `${m.name} copy`, src: m.src, tgt: m.tgt, edits: m.edits, srcEdits: m.srcEdits }),
    load,
    edit: (m: SavedMapping) => {
      load(m);
      setView('edit');
    },
  };
}
