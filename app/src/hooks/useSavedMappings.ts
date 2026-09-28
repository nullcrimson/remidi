import { useEffect, useRef, useState, type SetStateAction } from 'react';
import type { Edits, SrcEdits } from '../lib/overrides';
import {
  MAPPINGS_CAP,
  MAPPINGS_KEY,
  parseMappings,
  quarantine,
  readStore,
  serializeMappings,
  sortByRecent,
  type SavedMapping,
} from '../lib/mappings';

export interface SavedMappings {
  mappings: SavedMapping[];
  atCap: boolean;
  /** Stores a new preset and returns its id, or null at the cap. */
  save: (input: { name: string; src: string; tgt: string; edits: Edits; srcEdits: SrcEdits }) => string | null;
  update: (id: string, patch: { name?: string; edits?: Edits; srcEdits?: SrcEdits }) => void;
  rename: (id: string, name: string) => void;
  remove: (id: string) => void;
}

function load(): SavedMapping[] {
  try {
    return sortByRecent(parseMappings(localStorage.getItem(MAPPINGS_KEY)));
  } catch {
    return [];
  }
}

function persist(mappings: SavedMapping[]) {
  try {
    quarantine(readStore(localStorage.getItem(MAPPINGS_KEY)).invalid);
    localStorage.setItem(MAPPINGS_KEY, serializeMappings(mappings));
  } catch {
    void 0;
  }
}

/**
 * Saved presets, shared with other tabs. Storage is written only after a user action, so
 * entries this version cannot read stay put until then and are quarantined, not dropped.
 */
export function useSavedMappings(): SavedMappings {
  const [mappings, setStored] = useState<SavedMapping[]>(() => load());
  const dirty = useRef(false);

  useEffect(() => {
    if (!dirty.current) return;
    dirty.current = false;
    persist(mappings);
  }, [mappings]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === MAPPINGS_KEY || e.key === null) setStored(load());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

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

  return { mappings, atCap: mappings.length >= MAPPINGS_CAP, save, update, rename, remove };
}
