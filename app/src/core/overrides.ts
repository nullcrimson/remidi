import type { Vocabulary } from './canon';
import type { Note, Overrides } from './midiremap';
import { byNote, parseNote } from './notes';

export type Edits = Overrides['edits'];
/** Source note → canon it plays, or null when the note is unassigned. */
export type SrcEdits = Overrides['srcEdits'];

/**
 * Note edits as they are stored or read back from a file: the drum keys are text nobody
 * has checked against this version's vocabulary. Only `knownEdits` turns them into edits.
 */
export interface StoredEdits {
  edits: Record<string, Note>;
  srcEdits: Record<Note, string | null>;
}

/**
 * Edits whose drums were checked against the vocabulary, and how many stored edits that
 * left out. Only `knownEdits` makes one, and the note editor takes edits in no other form.
 */
export type KnownEdits = Overrides & { readonly skipped: number; readonly __brand: 'KnownEdits' };

/** The stored edits whose drums this version knows, and how many were left out. */
export function knownEdits(stored: StoredEdits, vocabulary: Vocabulary): KnownEdits {
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
  return { edits, srcEdits, skipped } as KnownEdits;
}

export function parseEdits(value: unknown): StoredEdits['edits'] | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  const out: StoredEdits['edits'] = {};
  for (const [drum, raw] of Object.entries(value)) {
    const note = parseNote(raw);
    if (note === null) return null;
    out[drum] = note;
  }
  return out;
}

export function parseSrcEdits(value: unknown): StoredEdits['srcEdits'] | null {
  if (value === undefined) return {};
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  const out: StoredEdits['srcEdits'] = {};
  for (const [key, drum] of Object.entries(value)) {
    const note = parseNote(Number(key));
    if (note === null || (typeof drum !== 'string' && drum !== null)) return null;
    out[note] = drum;
  }
  return out;
}

function sameRecord(a: Record<string, unknown>, b: Record<string, unknown>): boolean {
  const keys = Object.keys(a);
  return keys.length === Object.keys(b).length && keys.every((k) => k in b && a[k] === b[k]);
}

/** How many note edits `edits` holds, target and source together. */
export function editCount({ edits, srcEdits }: Overrides): number {
  return Object.keys(edits).length + Object.keys(srcEdits).length;
}

/** Whether two sets of note edits change the same drums the same way. */
export function sameEdits(a: Overrides, b: Overrides): boolean {
  return sameRecord(a.edits, b.edits) && sameRecord(a.srcEdits, b.srcEdits);
}
