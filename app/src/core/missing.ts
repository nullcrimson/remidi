import type { Message } from '../generated/i18n';
import type { Canon, Drum, MissingDrums, VoiceRow } from './midiremap';
import type { OctaveBase } from './notes';
import { movesToOtherDrum, playedOn, type PlayedOn } from './outcome';

/** Where the choice was kept before it moved into the session; read once, then removed. */
export const MISSING_KEY = 'midiremap:missing';

export const MISSING_OPTIONS: { value: MissingDrums; label: Message }[] = [
  { value: 'nearest', label: { id: 'missing-nearest' } },
  { value: 'drop', label: { id: 'missing-drop' } },
];

const swaps = (rows: VoiceRow[]) => rows.filter((r) => movesToOtherDrum(r.outcome) && r.srcNotes.length > 0);

/** Drums played by the source that the setting moves to another drum or drops. */
export function swappedCanons(rows: VoiceRow[]): Set<Canon> {
  return new Set(swaps(rows).map((r) => r.canon));
}

/** The drums behind {@link missingHint}, in row order. */
export function swapList(rows: VoiceRow[], targetDrums: Drum[], oct: OctaveBase): PlayedOn[] {
  return playedOn(swaps(rows), targetDrums, oct);
}

export function missingHint(missing: MissingDrums, rows: VoiceRow[]): Message {
  if (rows.length === 0) return { id: missing === 'nearest' ? 'missing-hint-nearest' : 'missing-hint-drop' };
  if (missing === 'nearest') return { id: 'missing-hint-moved', args: { count: swaps(rows).length } };
  return { id: 'missing-hint-dropped', args: { count: swaps(rows).filter((r) => r.outcome.status === 'dropped').length } };
}
