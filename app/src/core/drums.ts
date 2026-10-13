import type { Canon, Drum, Note } from './midiremap';
import { noteName, type OctaveBase } from './notes';

/** How the target engine's own drums are named, from one listing of them. */
export interface DrumLabels {
  /** The first drum listed on `note`, or the note's own name when none is. */
  atNote(note: Note, oct: OctaveBase): string;
  /**
   * What plays a drum the target lacks: the stand-in the converter chose, then `→` and what
   * the target has on `note` when an edit moved the stand-in there; only what is on `note`
   * when the target does not list the stand-in.
   */
  ofStandIn(standIn: Canon, note: Note, oct: OctaveBase): string;
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
      const landed = atNote(note, oct);
      const chosen = byCanon.get(standIn);
      return chosen === undefined || chosen === landed ? landed : `${chosen} → ${landed}`;
    },
  };
}
