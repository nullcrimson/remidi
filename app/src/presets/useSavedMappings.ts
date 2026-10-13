import { useEffect, useRef, useState, type SetStateAction } from 'react';
import type { PresetName } from '../core/midiremap';
import type { StoredEdits } from '../core/overrides';
import { onStoredChange, readStored, readStoredStrict, writeStored } from '../core/storage';
import {
  MAPPINGS_CAP,
  parseMappings,
  quarantine,
  readStore,
  serializeMappings,
  sortByRecent,
  type SavedMapping,
} from './mappings';

export interface SavedMappings {
  mappings: SavedMapping[];
  atCap: boolean;
  /** Stores a new preset and returns its id, or null at the cap. */
  save: (input: { name: PresetName; src: string; tgt: string } & StoredEdits) => string | null;
  update: (id: string, patch: { name?: PresetName } & Partial<StoredEdits>) => void;
  rename: (id: string, name: PresetName) => void;
  remove: (id: string) => void;
  /** True after a change the browser could not store, until a later change is stored. */
  unsaved: boolean;
}

function load(): SavedMapping[] {
  return sortByRecent(parseMappings(readStored('mappings')));
}

function persist(mappings: SavedMapping[]): boolean {
  const current = readStoredStrict('mappings');
  if (current === 'blocked') return false;
  return quarantine(readStore(current.value).invalid) && writeStored('mappings', serializeMappings(mappings));
}

/**
 * Saved presets, shared with other tabs. Storage is written only after a user action, so
 * entries this version cannot read stay put until then and are quarantined, not dropped.
 * A change the browser cannot store stays in the list for this session and sets `unsaved`.
 */
export function useSavedMappings(): SavedMappings {
  const [mappings, setStored] = useState<SavedMapping[]>(() => load());
  const [unsaved, setUnsaved] = useState(false);
  const dirty = useRef(false);

  useEffect(() => {
    if (!dirty.current) return;
    dirty.current = false;
    setUnsaved(!persist(mappings));
  }, [mappings]);

  useEffect(() => onStoredChange('mappings', () => setStored(load())), []);

  const setMappings = (next: SetStateAction<SavedMapping[]>) => {
    dirty.current = true;
    setStored(next);
  };

  const save: SavedMappings['save'] = (input) => {
    if (mappings.length >= MAPPINGS_CAP) return null;
    const id = crypto.randomUUID();
    setMappings((prev) => {
      if (prev.length >= MAPPINGS_CAP) return prev;
      const created: SavedMapping = {
        id,
        name: input.name,
        src: input.src,
        tgt: input.tgt,
        edits: input.edits,
        srcEdits: input.srcEdits,
        updatedAt: Date.now(),
      };
      return sortByRecent([created, ...prev]);
    });
    return id;
  };

  const update: SavedMappings['update'] = (id, patch) =>
    setMappings((prev) =>
      sortByRecent(
        prev.map((m) =>
          m.id === id
            ? {
                ...m,
                name: patch.name ?? m.name,
                edits: patch.edits ?? m.edits,
                srcEdits: patch.srcEdits ?? m.srcEdits,
                updatedAt: Date.now(),
              }
            : m,
        ),
      ),
    );

  const rename: SavedMappings['rename'] = (id, name) =>
    setMappings((prev) => prev.map((m) => (m.id === id ? { ...m, name } : m)));

  const remove: SavedMappings['remove'] = (id) =>
    setMappings((prev) => prev.filter((m) => m.id !== id));

  return { mappings, atCap: mappings.length >= MAPPINGS_CAP, save, update, rename, remove, unsaved };
}
