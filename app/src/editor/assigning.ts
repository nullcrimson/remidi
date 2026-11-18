import type { Note } from '../core/midiremap';
import { ascending } from '../core/notes';

/**
 * The source notes the editor opens Advanced on: one note with its picker open, or a list of
 * notes, each given a row, the first of them scrolled into view with no picker open.
 */
export type Assigning
  = | { kind: 'note'; note: Note }
    | { kind: 'notes'; notes: Note[] };

/** The lowest of the listed notes `assigning` scrolls into view, or `null` for one note or none. */
export function firstListed(assigning: Assigning | null): Note | null {
  return assigning?.kind === 'notes' ? ([...assigning.notes].sort(ascending)[0] ?? null) : null;
}

/** The notes `assigning` gives rows to. */
export function assignedNotes(assigning: Assigning | null): Note[] {
  if (assigning === null) return [];
  return assigning.kind === 'note' ? [assigning.note] : assigning.notes;
}
