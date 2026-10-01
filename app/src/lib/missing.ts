import type { Message } from '../generated/i18n';
import type { Drum, MissingDrums, VoiceRow } from './midiremap';
import { noteName, type OctaveBase } from './notes';
import { movesToOtherDrum } from './outcome';

/** What a conversion does with a drum the target lacks, as the converter defines it. */
export type Missing = MissingDrums;

/** Where the choice was kept before it moved into the session; read once, then removed. */
export const MISSING_KEY = 'midiremap:missing';

export const MISSING_OPTIONS: { value: Missing; label: Message }[] = [
  { value: 'nearest', label: { id: 'missing-nearest' } },
  { value: 'drop', label: { id: 'missing-drop' } },
];

const swaps = (rows: VoiceRow[]) => rows.filter((r) => movesToOtherDrum(r.outcome) && r.srcNotes.length > 0);

/** Drums played by the source that the setting moves to another drum or drops. */
export function swappedCanons(rows: VoiceRow[]): Set<string> {
  return new Set(swaps(rows).map((r) => r.canon));
}

/** A target drum's name for each note, the first drum listed on a note winning. */
export function labelByNote(drums: Drum[]): Map<number, string> {
  const labels = new Map<number, string>();
  for (const d of drums) if (!labels.has(d.note)) labels.set(d.note, d.label);
  return labels;
}

/** A drum the setting moves: its name and the target drum that plays it now, or `null` when dropped. */
export interface Swap {
  drum: string;
  now: string | null;
}

/** Each row's drum and the target drum that plays it now, in row order. */
export function playedOn(rows: VoiceRow[], targetDrums: Drum[], oct: OctaveBase): Swap[] {
  const labels = labelByNote(targetDrums);
  return rows.map((r) => ({
    drum: r.label,
    now: r.outcome.status === 'dropped' ? null : (labels.get(r.outcome.tgtNote) ?? noteName(r.outcome.tgtNote, oct)),
  }));
}

/** The drums behind {@link missingHint}, in row order. */
export function swapList(rows: VoiceRow[], targetDrums: Drum[], oct: OctaveBase): Swap[] {
  return playedOn(swaps(rows), targetDrums, oct);
}

export function missingHint(missing: Missing, rows: VoiceRow[]): Message {
  if (rows.length === 0) return { id: missing === 'nearest' ? 'missing-hint-nearest' : 'missing-hint-drop' };
  if (missing === 'nearest') return { id: 'missing-hint-moved', args: { count: swaps(rows).length } };
  return { id: 'missing-hint-dropped', args: { count: swaps(rows).filter((r) => r.outcome.status === 'dropped').length } };
}
