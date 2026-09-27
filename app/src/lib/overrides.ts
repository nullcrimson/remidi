import type { Overrides } from './midiremap';

export type Edits = Record<string, number>;
/** Source note → canon it plays, or null when the note is unassigned. */
export type SrcEdits = Record<number, string | null>;

export function editsToOverrides(edits: Edits, srcEdits: SrcEdits = {}): Overrides {
  return {
    tgt: Object.entries(edits).map(([canon, note]) => ({ canon, note })),
    src: Object.entries(srcEdits).map(([note, canon]) => ({ note: Number(note), canon })),
  };
}
