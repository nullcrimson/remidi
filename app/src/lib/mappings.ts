import type { Edits, SrcEdits } from './overrides';

export interface SavedMapping {
  id: string;
  name: string;
  src: string;
  tgt: string;
  edits: Edits;
  srcEdits: SrcEdits;
  updatedAt: number;
}

export const MAPPINGS_KEY = 'midiremap:mappings';
export const MAPPINGS_CAP = 50;

function isNote(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 127;
}

function parseEdits(value: unknown): Edits | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  const out: Edits = {};
  for (const [canon, note] of Object.entries(value)) {
    if (!isNote(note)) return null;
    out[canon] = note;
  }
  return out;
}

function parseSrcEdits(value: unknown): SrcEdits | null {
  if (value === undefined) return {};
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  const out: SrcEdits = {};
  for (const [note, canon] of Object.entries(value)) {
    const n = Number(note);
    if (!isNote(n) || typeof canon !== 'string') return null;
    out[n] = canon;
  }
  return out;
}

function parseOne(value: unknown): SavedMapping | null {
  if (typeof value !== 'object' || value === null) return null;
  const v = value as Record<string, unknown>;
  if (
    typeof v.id !== 'string'
    || typeof v.name !== 'string'
    || typeof v.src !== 'string'
    || typeof v.tgt !== 'string'
    || typeof v.updatedAt !== 'number'
    || !Number.isFinite(v.updatedAt)
  ) {
    return null;
  }
  const edits = parseEdits(v.edits);
  if (!edits) return null;
  const srcEdits = parseSrcEdits(v.srcEdits);
  if (!srcEdits) return null;
  return { id: v.id, name: v.name, src: v.src, tgt: v.tgt, edits, srcEdits, updatedAt: v.updatedAt };
}

export function parseMappings(raw: string | null): SavedMapping[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(parseOne).filter((m): m is SavedMapping => m !== null);
  } catch {
    return [];
  }
}

export function serializeMappings(mappings: SavedMapping[]): string {
  return JSON.stringify(mappings);
}

export function sortByRecent(mappings: SavedMapping[]): SavedMapping[] {
  return [...mappings].sort((a, b) => b.updatedAt - a.updatedAt);
}
