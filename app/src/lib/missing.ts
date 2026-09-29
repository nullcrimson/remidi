import type { Message } from '../generated/i18n';
import type { MissingDrums, VoiceRow } from './midiremap';

/** What a conversion does with a drum the target lacks, as the converter defines it. */
export type Missing = MissingDrums;

/** Where the choice was kept before it moved into the session; read once, then removed. */
export const MISSING_KEY = 'midiremap:missing';

export const MISSING_OPTIONS: { value: Missing; label: Message }[] = [
  { value: 'nearest', label: { id: 'missing-nearest' } },
  { value: 'drop', label: { id: 'missing-drop' } },
];

const swaps = (rows: VoiceRow[]) => rows.filter((r) => r.otherDrum && r.srcNotes.length > 0);

/** Drums played by the source that the setting moves to another drum or drops. */
export function swappedCanons(rows: VoiceRow[]): Set<string> {
  return new Set(swaps(rows).map((r) => r.canon));
}

export function missingHint(missing: Missing, rows: VoiceRow[]): Message {
  if (rows.length === 0) return { id: missing === 'nearest' ? 'missing-hint-nearest' : 'missing-hint-drop' };
  if (missing === 'nearest') return { id: 'missing-hint-moved', args: { count: swaps(rows).length } };
  return { id: 'missing-hint-dropped', args: { count: swaps(rows).filter((r) => r.status === 'dropped').length } };
}
