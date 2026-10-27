import type { Drum, VoicePlan } from '../core/midiremap';
import { swapList } from '../core/missing';
import type { OctaveBase } from '../core/notes';
import { isPlayed, leadNote, movesToOtherDrum, playedNote, playedOn, type PlayedOn } from '../core/outcome';

/** Every drum of the plan in exactly one group: what the conversion does to it. */
export interface PlanBreakdown {
  /** Played on a different note in the target. */
  moved: number;
  /** Already on the right note. */
  same: number;
  /** Played on a close variant of the same drum, because the target lacks an exact match. */
  variant: PlayedOn[];
  /** Played on another target drum, because the target lacks it. */
  swapped: PlayedOn[];
  /** Left out of the file. */
  dropped: string[];
  /** No source note plays it. */
  unplayed: number;
}

/** Sorts the plan's drums into the groups behind the "N of M drums remapped" summary. */
export function planBreakdown(rows: VoicePlan[], targetDrums: Drum[], oct: OctaveBase): PlanBreakdown {
  const played = rows.filter(isPlayed);
  const kept = played.filter((r) => r.outcome.status !== 'dropped' && !movesToOtherDrum(r.outcome));
  const exact = kept.filter((r) => r.outcome.status === 'direct');
  return {
    moved: exact.filter((r) => leadNote(r) !== playedNote(r.outcome)).length,
    same: exact.filter((r) => leadNote(r) === playedNote(r.outcome)).length,
    variant: playedOn(kept.filter((r) => r.outcome.status === 'fallback'), targetDrums, oct),
    swapped: swapList(played.filter((r) => r.outcome.status !== 'dropped'), targetDrums, oct),
    dropped: played.filter((r) => r.outcome.status === 'dropped').map((r) => r.label),
    unplayed: rows.length - played.length,
  };
}
