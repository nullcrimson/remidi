import { useMemo } from 'react';
import { vocabularyOf } from '../core/canon';
import type { EnginePair } from '../core/enginePair';
import { toAppError, type AppError } from '../core/errors';
import type { Drum, Family, Midiremap, CanonEntry } from '../core/midiremap';

type Looked<T> = { data: T; error: null } | { data: null; error: AppError };

function look<T>(read: () => T): Looked<T> {
  try {
    return { data: read(), error: null };
  } catch (err) {
    return { data: null, error: toAppError(err) };
  }
}

const NO_VOCABULARY: { canonOptions: CanonEntry[]; families: Family[] } = { canonOptions: [], families: [] };
const NO_DRUMS: { targetDrums: Drum[]; sourceNotes: Drum[] } = { targetDrums: [], sourceNotes: [] };

/**
 * What the core knows about the chosen pair and its drums, read once the converter has
 * loaded (`core` is null until then): the target's playable drums, the source's notes,
 * the drum vocabulary (as a list for the pickers and by key for stored edits) and the
 * family order. When a lookup fails, the lists are empty and `error` says why.
 */
export function useEngineData(core: Midiremap | null, pair: EnginePair | null) {
  const known = useMemo(
    () => (core ? look(() => ({ canonOptions: core.canonCatalog(), families: core.familyOrder() })) : null),
    [core],
  );
  const played = useMemo(
    () =>
      core && pair
        ? look(() => ({ targetDrums: core.engineDrums(pair.tgt), sourceNotes: core.engineNotes(pair.src) }))
        : null,
    [core, pair],
  );
  const { canonOptions, families } = known?.data ?? NO_VOCABULARY;
  const { targetDrums, sourceNotes } = played?.data ?? NO_DRUMS;
  const vocabulary = useMemo(() => vocabularyOf(canonOptions), [canonOptions]);
  const error = known?.error ?? played?.error ?? null;
  return { targetDrums, sourceNotes, canonOptions, vocabulary, families, error };
}
