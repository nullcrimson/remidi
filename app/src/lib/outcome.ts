import type { PlanOutcome } from './midiremap';

/** The note a drum plays on, or `null` when it is dropped. */
export const playedNote = (outcome: PlanOutcome): number | null =>
  outcome.status === 'dropped' ? null : outcome.tgtNote;

/** Whether the target lacks the drum and its nearest stand-in is another drum. */
export const movesToOtherDrum = (outcome: PlanOutcome): boolean =>
  outcome.status !== 'direct' && outcome.otherDrum;
