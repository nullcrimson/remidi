import type { Overrides } from './midiremap';

export type Edits = Record<string, number>;

interface VoiceLike {
  canon: string;
  srcNote: number;
  tgtNote: number | null;
}

export function editsToOverrides(edits: Edits): Overrides {
  return { tgt: Object.entries(edits).map(([canon, note]) => ({ canon, note })) };
}

export function effectiveTgt(row: VoiceLike, edits: Edits): number | null {
  return edits[row.canon] ?? row.tgtNote;
}

export function isChanged(row: VoiceLike, edits: Edits): boolean {
  return effectiveTgt(row, edits) !== row.srcNote;
}
