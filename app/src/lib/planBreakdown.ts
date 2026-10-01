import type { Drum, VoiceRow } from './midiremap';
import { playedOn, swapList, type Swap } from './missing';
import type { OctaveBase } from './notes';
import { movesToOtherDrum, playedNote } from './outcome';

/** Every drum of the plan in exactly one group: what the conversion does to it. */
export interface PlanBreakdown {
  /** Played on a different note in the target. */
  moved: number;
  /** Already on the right note. */
  same: number;
  /** Played on a close variant of the same drum, because the target lacks an exact match. */
  variant: Swap[];
  /** Played on another target drum, because the target lacks it. */
  swapped: Swap[];
  /** Left out of the file. */
  dropped: string[];
  /** No source note plays it. */
  unplayed: number;
}

/** Sorts the plan's drums into the groups behind the "N of M drums remapped" summary. */
export function planBreakdown(rows: VoiceRow[], targetDrums: Drum[], oct: OctaveBase): PlanBreakdown {
  const played = rows.filter((r) => r.srcNotes.length > 0);
  const kept = played.filter((r) => r.outcome.status !== 'dropped' && !movesToOtherDrum(r.outcome));
  const exact = kept.filter((r) => r.outcome.status === 'direct');
  return {
    moved: exact.filter((r) => r.srcNotes[0] !== playedNote(r.outcome)).length,
    same: exact.filter((r) => r.srcNotes[0] === playedNote(r.outcome)).length,
    variant: playedOn(kept.filter((r) => r.outcome.status === 'fallback'), targetDrums, oct),
    swapped: swapList(played.filter((r) => r.outcome.status !== 'dropped'), targetDrums, oct),
    dropped: played.filter((r) => r.outcome.status === 'dropped').map((r) => r.label),
    unplayed: rows.length - played.length,
  };
}
