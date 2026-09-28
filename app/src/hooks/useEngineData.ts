import { useMemo } from 'react';
import {
  canonCatalog,
  engineDrums,
  engineNotes,
  familyOrder,
  type CanonInfo,
  type Drum,
  type Family,
} from '../lib/midiremap';
import type { CatalogStatus } from './useEngineCatalog';

function orEmpty<T>(read: () => T[]): T[] {
  try {
    return read();
  } catch {
    return [];
  }
}

/**
 * What the core knows about the chosen pair and its drums, read once the converter has
 * loaded: the target's playable drums, the source's notes, the drum vocabulary and the
 * family order. A lookup that fails reads as empty.
 */
export function useEngineData(status: CatalogStatus, src: string, tgt: string) {
  const ready = status === 'ready';
  const targetDrums = useMemo<Drum[]>(
    () => (ready && tgt ? orEmpty(() => engineDrums(tgt)) : []),
    [ready, tgt],
  );
  const sourceNotes = useMemo<Drum[]>(
    () => (ready && src ? orEmpty(() => engineNotes(src)) : []),
    [ready, src],
  );
  const canonOptions = useMemo<CanonInfo[]>(() => (ready ? orEmpty(() => canonCatalog()) : []), [ready]);
  const families = useMemo<Family[]>(() => (ready ? orEmpty(() => familyOrder()) : []), [ready]);
  return { targetDrums, sourceNotes, canonOptions, families };
}
