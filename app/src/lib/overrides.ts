import { byCanon, type Vocabulary } from './canon';
import type { Canon, Note, Overrides } from './midiremap';
import { byNote } from './notes';

export type Edits = Record<Canon, Note>;
/** Source note → canon it plays, or null when the note is unassigned. */
export type SrcEdits = Record<Note, Canon | null>;

/**
 * Note edits as they are stored or read back from a file: the drum keys are text nobody
 * has checked against this version's vocabulary. Only `knownEdits` turns them into edits.
 */
export interface StoredEdits {
  edits: Record<string, Note>;
  srcEdits: Record<Note, string | null>;
}

export function editsToOverrides(edits: Edits, srcEdits: SrcEdits = {}): Overrides {
  return {
    tgt: byCanon(edits).map(([canon, note]) => ({ canon, note })),
    src: byNote(srcEdits).map(([note, canon]) => ({ note, canon })),
  };
}

/** The stored edits whose drums this version knows, and how many were left out. */
export function knownEdits(
  stored: StoredEdits,
  vocabulary: Vocabulary,
): { edits: Edits; srcEdits: SrcEdits; skipped: number } {
  const edits: Edits = {};
  const srcEdits: SrcEdits = {};
  let skipped = 0;
  for (const [key, note] of Object.entries(stored.edits)) {
    const canon = vocabulary.get(key);
    if (canon === undefined) skipped += 1;
    else edits[canon] = note;
  }
  for (const [note, key] of byNote(stored.srcEdits)) {
    const canon = key === null ? null : vocabulary.get(key);
    if (canon === undefined) skipped += 1;
    else srcEdits[note] = canon;
  }
  return { edits, srcEdits, skipped };
}
