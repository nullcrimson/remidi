import { drumLabels, standInText, type DrumLabels, type StandInName } from './drums';
import type { Canon, Drum, Note, Outcome, VoicePlan } from './midiremap';
import type { OctaveBase } from './notes';

/** The note a drum plays on, or `null` when it is dropped. */
export const playedNote = (outcome: Outcome): Note | null =>
  outcome.status === 'dropped' ? null : outcome.note;

/** Whether some source note plays the drum. */
export const isPlayed = (row: Pick<VoicePlan, 'srcNotes'>): boolean => row.srcNotes.length > 0;

/** The source note the drum is shown under, or `null` when no note plays it. */
export const leadNote = (row: Pick<VoicePlan, 'srcNotes'>): Note | null => row.srcNotes[0] ?? null;

/** Whether the target lacks the drum and its nearest stand-in is another drum. */
export const movesToOtherDrum = (outcome: Outcome): boolean =>
  outcome.status !== 'direct' && outcome.otherDrum;

/** A drum's name and the target drum that plays it now, or `null` when dropped. */
export interface PlayedOn {
  drum: string;
  now: string | null;
}

/** Each row's drum and the target drum that plays it now, in row order. */
export function playedOn(rows: VoicePlan[], targetDrums: Drum[], oct: OctaveBase): PlayedOn[] {
  const labels = drumLabels(targetDrums);
  return rows.map((r) => ({ drum: r.label, now: r.outcome.status === 'dropped' ? null : playingText(playingDrum(r.outcome, labels, oct)) }));
}

/** What plays a drum that is not dropped: the drum on its note, or the stand-in `canon` by the parts of its name. */
export type Playing
  = | { kind: 'direct'; text: string }
    | { kind: 'standIn'; canon: Canon; name: StandInName };

/** The target drum that plays a drum that is not dropped: the stand-in the converter chose, or the drum on its note. */
export function playingDrum(outcome: Exclude<Outcome, { status: 'dropped' }>, labels: DrumLabels, oct: OctaveBase): Playing {
  if (outcome.status === 'direct') return { kind: 'direct', text: labels.atNote(outcome.note, oct) };
  return { kind: 'standIn', canon: outcome.standIn, name: labels.ofStandIn(outcome.standIn, outcome.note, oct) };
}

/** What plays a drum as one text. */
export const playingText = (playing: Playing): string =>
  playing.kind === 'direct' ? playing.text : standInText(playing.name);
