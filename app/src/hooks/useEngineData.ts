import { useMemo } from 'react';
import { vocabularyOf } from '../lib/canon';
import type { Drum, Family, Midiremap, VocabularyDrum } from '../lib/midiremap';

function orEmpty<T>(read: () => T[]): T[] {
  try {
    return read();
  } catch {
    return [];
  }
}

/**
 * What the core knows about the chosen pair and its drums, read once the converter has
 * loaded (`core` is null until then): the target's playable drums, the source's notes,
 * the drum vocabulary (as a list for the pickers and by key for stored edits) and the
 * family order. A lookup that fails reads as empty.
 */
export function useEngineData(core: Midiremap | null, src: string, tgt: string) {
  const targetDrums = useMemo<Drum[]>(
    () => (core && tgt ? orEmpty(() => core.engineDrums(tgt)) : []),
    [core, tgt],
  );
  const sourceNotes = useMemo<Drum[]>(
    () => (core && src ? orEmpty(() => core.engineNotes(src)) : []),
    [core, src],
  );
  const canonOptions = useMemo<VocabularyDrum[]>(() => (core ? orEmpty(() => core.canonCatalog()) : []), [core]);
  const families = useMemo<Family[]>(() => (core ? orEmpty(() => core.familyOrder()) : []), [core]);
  const vocabulary = useMemo(() => vocabularyOf(canonOptions), [canonOptions]);
  return { targetDrums, sourceNotes, canonOptions, vocabulary, families };
}
