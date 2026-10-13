import type { Canon, Drum, Note } from './midiremap';
import { noteName, type OctaveBase } from './notes';

/** How the target engine's own drums are named, from one listing of them. */
export interface DrumLabels {
  /** The first drum listed on `note`, or the note's own name when none is. */
  atNote(note: Note, oct: OctaveBase): string;
  /** The target's own drum for `standIn`, or the name of `note`, where the converter played it, when the target lists none. */
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
  return {
    atNote: (note, oct) => byNote.get(note) ?? noteName(note, oct),
    ofStandIn: (standIn, note, oct) => byCanon.get(standIn) ?? noteName(note, oct),
  };
}
