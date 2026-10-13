import { drumLabels, standInText, type DrumLabels, type StandInName } from './drums';
import type { Drum, Note, PlanOutcome, VoiceRow } from './midiremap';
import type { OctaveBase } from './notes';

/** The note a drum plays on, or `null` when it is dropped. */
export const playedNote = (outcome: PlanOutcome): Note | null =>
  outcome.status === 'dropped' ? null : outcome.tgtNote;

/** Whether some source note plays the drum. */
export const isPlayed = (row: Pick<VoiceRow, 'srcNotes'>): boolean => row.srcNotes.length > 0;

/** The source note the drum is shown under, or `null` when no note plays it. */
export const leadNote = (row: Pick<VoiceRow, 'srcNotes'>): Note | null => row.srcNotes[0] ?? null;

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
  const labels = drumLabels(targetDrums);
  return rows.map((r) => ({ drum: r.label, now: r.outcome.status === 'dropped' ? null : playingDrum(r.outcome, labels, oct).text }));
}

/** What plays a drum that is not dropped: as text, and as a stand-in's parts when a stand-in plays it. */
export interface Playing {
  text: string;
  standIn: StandInName | null;
}

/** The target drum that plays a drum that is not dropped: the stand-in the converter chose, or the drum on its note. */
export function playingDrum(outcome: Exclude<PlanOutcome, { status: 'dropped' }>, labels: DrumLabels, oct: OctaveBase): Playing {
  if (outcome.status === 'direct') return { text: labels.atNote(outcome.tgtNote, oct), standIn: null };
  const standIn = labels.ofStandIn(outcome.standIn, outcome.tgtNote, oct);
  return { text: standInText(standIn), standIn };
}
