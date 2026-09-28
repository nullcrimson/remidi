import type { VoiceRow } from './midiremap';

/** What a conversion does with a drum the target lacks; the exact values the converter parses. */
export type Missing = 'nearest' | 'drop';

export const MISSING_KEY = 'midiremap:missing';

export const MISSING_OPTIONS: { value: Missing; label: string }[] = [
  { value: 'nearest', label: 'Nearest' },
  { value: 'drop', label: 'Drop' },
];

export function loadMissing(): Missing {
  try {
    return localStorage.getItem(MISSING_KEY) === 'drop' ? 'drop' : 'nearest';
  } catch {
    return 'nearest';
  }
}

export function saveMissing(missing: Missing): void {
  try {
    localStorage.setItem(MISSING_KEY, missing);
  } catch {
    void 0;
  }
}

const swaps = (rows: VoiceRow[]) => rows.filter((r) => r.otherDrum && r.srcNotes.length > 0);

/** Drums played by the source that the setting moves to another drum or drops. */
export function swappedCanons(rows: VoiceRow[]): Set<string> {
  return new Set(swaps(rows).map((r) => r.canon));
}

function drums(n: number): string {
  return `${n} ${n === 1 ? 'drum' : 'drums'}`;
}

export function missingHint(missing: Missing, rows: VoiceRow[]): string {
  if (rows.length === 0) return missing === 'nearest' ? 'play on the closest drum' : 'leave them out';
  if (missing === 'nearest') {
    const n = swaps(rows).length;
    return n === 0 ? 'no drum moves to another drum' : `${drums(n)} played on another drum`;
  }
  const n = swaps(rows).filter((r) => r.status === 'dropped').length;
  return n === 0 ? 'no drums dropped' : `${drums(n)} dropped`;
}
