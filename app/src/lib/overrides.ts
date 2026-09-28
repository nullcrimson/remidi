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

/** Edits whose drums this version knows, and how many were left out. */
export function knownEdits(
  edits: Edits,
  srcEdits: SrcEdits,
  canons: ReadonlySet<string>,
): { edits: Edits; srcEdits: SrcEdits; skipped: number } {
  const keptEdits = Object.fromEntries(Object.entries(edits).filter(([canon]) => canons.has(canon)));
  const keptSrc: SrcEdits = Object.fromEntries(
    Object.entries(srcEdits).filter(([, canon]) => canon === null || canons.has(canon)),
  );
  const skipped
    = Object.keys(edits).length - Object.keys(keptEdits).length
      + Object.keys(srcEdits).length - Object.keys(keptSrc).length;
  return { edits: keptEdits, srcEdits: keptSrc, skipped };
}
