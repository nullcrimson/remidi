import { labelByNote } from './drums';
import type { Drum, Note, PlanOutcome, VoiceRow } from './midiremap';
import { noteName, type OctaveBase } from './notes';

/** The note a drum plays on, or `null` when it is dropped. */
export const playedNote = (outcome: PlanOutcome): Note | null =>
  outcome.status === 'dropped' ? null : outcome.tgtNote;

/** Whether the target lacks the drum and its nearest stand-in is another drum. */
export const movesToOtherDrum = (outcome: PlanOutcome): boolean =>
  outcome.status !== 'direct' && outcome.otherDrum;

/** A drum's name and the target drum that plays it now, or `null` when dropped. */
export interface PlayedOn {
  drum: string;
  now: string | null;
}

/** Each row's drum and the target drum that plays it now, in row order. */
export function playedOn(rows: VoiceRow[], targetDrums: Drum[], oct: OctaveBase): PlayedOn[] {
  const labels = labelByNote(targetDrums);
  return rows.map((r) => ({
    drum: r.label,
    now: r.outcome.status === 'dropped' ? null : (labels.get(r.outcome.tgtNote) ?? noteName(r.outcome.tgtNote, oct)),
  }));
}
