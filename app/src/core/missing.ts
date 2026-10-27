import type { Message } from '../generated/i18n';
import type { Canon, Drum, MissingDrums, VoicePlan } from './midiremap';
import type { OctaveBase } from './notes';
import { optionsOf } from './options';
import { isPlayed, movesToOtherDrum, playedOn, type PlayedOn } from './outcome';

/** The name of each missing-drums choice. */
export const MISSING_LABEL: Record<MissingDrums, Message> = {
  nearest: { id: 'missing-nearest' },
  drop: { id: 'missing-drop' },
};

export const MISSING_OPTIONS = optionsOf(MISSING_LABEL);

const swaps = (rows: VoicePlan[]) => rows.filter((r) => movesToOtherDrum(r.outcome) && isPlayed(r));

/** Drums played by the source that the setting moves to another drum or drops. */
export function swappedCanons(rows: VoicePlan[]): Set<Canon> {
  return new Set(swaps(rows).map((r) => r.canon));
}

/** The drums behind {@link missingHint}, in row order. */
export function swapList(rows: VoicePlan[], targetDrums: Drum[], oct: OctaveBase): PlayedOn[] {
  return playedOn(swaps(rows), targetDrums, oct);
}

export function missingHint(missing: MissingDrums, rows: VoicePlan[]): Message {
  if (rows.length === 0) return { id: missing === 'nearest' ? 'missing-hint-nearest' : 'missing-hint-drop' };
  if (missing === 'nearest') return { id: 'missing-hint-moved', args: { count: swaps(rows).length } };
  return { id: 'missing-hint-dropped', args: { count: swaps(rows).filter((r) => r.outcome.status === 'dropped').length } };
}
