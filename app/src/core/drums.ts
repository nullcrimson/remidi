import type { Canon, Drum, Note } from './midiremap';
import { noteName, type OctaveBase } from './notes';

/**
 * What plays a drum the target lacks: the stand-in the converter chose, and what the target
 * has on the note it landed on when an edit moved it there, otherwise null.
 */
export interface StandInName {
  standIn: string;
  landed: string | null;
}

/** A stand-in as one text: its name, then `→` and where an edit landed it. */
export const standInText = ({ standIn, landed }: StandInName): string =>
  landed === null ? standIn : `${standIn} → ${landed}`;

/** How the target engine's own drums are named, from one listing of them. */
export interface DrumLabels {
  /** The first drum listed on `note`, or the note's own name when none is. */
  atNote(note: Note, oct: OctaveBase): string;
  /** The stand-in played on `note`; a stand-in the target does not list is named by what is on `note`. */
  ofStandIn(standIn: Canon, note: Note, oct: OctaveBase): StandInName;
}

/** The labels of a target's drums by note and by canon, the first drum listed winning in both. */
export function drumLabels(drums: Drum[]): DrumLabels {
  const byNote = new Map<Note, string>();
  const byCanon = new Map<Canon, string>();
  for (const d of drums) {
    if (!byNote.has(d.note)) byNote.set(d.note, d.label);
    if (!byCanon.has(d.canon)) byCanon.set(d.canon, d.label);
  }
  const atNote = (note: Note, oct: OctaveBase) => byNote.get(note) ?? noteName(note, oct);
  return {
    atNote,
    ofStandIn: (standIn, note, oct) => {
      const onNote = atNote(note, oct);
      const chosen = byCanon.get(standIn);
      return chosen === undefined || chosen === onNote ? { standIn: onNote, landed: null } : { standIn: chosen, landed: onNote };
    },
  };
}
