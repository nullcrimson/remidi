import { useMemo } from 'react';
import type { FileResult } from '../lib/files';
import type { CanonInfo, Drum, VoiceRow } from '../lib/midiremap';
import { swappedCanons, type Missing } from '../lib/missing';
import type { OctaveBase } from '../lib/notes';
import { buildReport } from '../lib/report';

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
  canonOptions: CanonInfo[];
  targetDrums: Drum[];
  rows: VoiceRow[];
  oct: OctaveBase;
  missing: Missing;
  dropMissingAndConvert: () => Promise<void>;
}) {
  const view = useMemo(
    () => buildReport(results, canonOptions, targetDrums, oct),
    [results, canonOptions, targetDrums, oct],
  );
  const swapped = useMemo(() => swappedCanons(rows), [rows]);
  const canDrop
    = missing === 'nearest'
      && view.groups.approximated.some((e) => e.canon !== undefined && swapped.has(e.canon));
  return { view, dropMissing: canDrop ? () => void dropMissingAndConvert() : undefined };
}
