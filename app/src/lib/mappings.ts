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

export function parseEdits(value: unknown): Edits | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  const out: Edits = {};
  for (const [canon, note] of Object.entries(value)) {
    if (!isNote(note)) return null;
    out[canon] = note;
  }
  return out;
}

export function parseSrcEdits(value: unknown): SrcEdits | null {
  if (value === undefined) return {};
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  const out: SrcEdits = {};
  for (const [note, canon] of Object.entries(value)) {
    const n = Number(note);
    if (!isNote(n) || (typeof canon !== 'string' && canon !== null)) return null;
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

export const QUARANTINE_KEY = 'midiremap:quarantine';
const STORE_VERSION = 1;

/** What storage holds: readable presets, and raw entries that could not be read. */
export interface Store {
  /** 0 for the legacy bare array, 1 for the envelope, null when absent or unreadable. */
  version: 0 | 1 | null;
  items: SavedMapping[];
  invalid: unknown[];
}

function split(entries: unknown[], version: 0 | 1): Store {
  const items: SavedMapping[] = [];
  const invalid: unknown[] = [];
  for (const entry of entries) {
    const m = parseOne(entry);
    if (m) items.push(m);
    else invalid.push(entry);
  }
  return { version, items, invalid };
}

export function readStore(raw: string | null): Store {
  if (!raw) return { version: null, items: [], invalid: [] };
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { version: null, items: [], invalid: [raw] };
  }
  if (Array.isArray(parsed)) return split(parsed, 0);
  const envelope = parsed as { version?: unknown; items?: unknown };
  if (envelope?.version === STORE_VERSION && Array.isArray(envelope.items)) {
    return split(envelope.items, 1);
  }
  return { version: null, items: [], invalid: [parsed] };
}

export function parseMappings(raw: string | null): SavedMapping[] {
  return readStore(raw).items;
}

export function serializeMappings(mappings: SavedMapping[]): string {
  return JSON.stringify({ version: STORE_VERSION, items: mappings });
}

/** Keeps entries that could not be read, so no release ever deletes them. */
export function quarantine(entries: unknown[], at = Date.now()): void {
  if (entries.length === 0) return;
  let kept: unknown[] = [];
  try {
    const prev: unknown = JSON.parse(localStorage.getItem(QUARANTINE_KEY) ?? '[]');
    if (Array.isArray(prev)) kept = prev;
  } catch {
    void 0;
  }
  localStorage.setItem(
    QUARANTINE_KEY,
    JSON.stringify([...kept, ...entries.map((raw) => ({ at, raw }))]),
  );
}

export function sortByRecent(mappings: SavedMapping[]): SavedMapping[] {
  return [...mappings].sort((a, b) => b.updatedAt - a.updatedAt);
}
