import type { Drum, Note } from './midiremap';

/** A target drum's name for each note, the first drum listed on a note winning. */
export function labelByNote(drums: Drum[]): Map<Note, string> {
  const labels = new Map<Note, string>();
  for (const d of drums) if (!labels.has(d.note)) labels.set(d.note, d.label);
  return labels;
}
