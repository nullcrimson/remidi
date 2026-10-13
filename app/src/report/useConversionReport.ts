import { useMemo } from 'react';
import type { FileResult } from '../core/files';
import type { Drum, MissingDrums, VocabularyDrum, VoiceRow } from '../core/midiremap';
import { swappedCanons } from '../core/missing';
import type { OctaveBase } from '../core/notes';
import { buildReport } from './report';

/**
 * The report of the last conversion, and `dropMissing` when converting again with missing
 * drums left out would change it: the setting is Nearest and some hit landed on another
 * drum.
 */
export function useConversionReport({
  results,
  canonOptions,
  targetDrums,
  rows,
  oct,
  missing,
  dropMissingAndConvert,
}: {
  results: FileResult[];
  canonOptions: VocabularyDrum[];
  targetDrums: Drum[];
  rows: VoiceRow[];
  oct: OctaveBase;
  missing: MissingDrums;
  dropMissingAndConvert: () => Promise<void>;
}) {
  const view = useMemo(
    () => buildReport(results, canonOptions, targetDrums, oct),
    [results, canonOptions, targetDrums, oct],
  );
  const swapped = useMemo(() => swappedCanons(rows), [rows]);
  const canDrop
    = missing === 'nearest'
      && view.groups.approximated.some((e) => swapped.has(e.canon));
  return { view, dropMissing: canDrop ? () => void dropMissingAndConvert() : undefined };
}
