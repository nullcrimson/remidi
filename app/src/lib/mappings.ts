import { parseNote } from './notes';
import type { StoredEdits } from './overrides';

export interface SavedMapping extends StoredEdits {
  id: string;
  name: string;
  src: string;
  tgt: string;
  updatedAt: number;
}

export const MAPPINGS_KEY = 'midiremap:mappings';
export const MAPPINGS_CAP = 50;

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

interface Store {
  items: SavedMapping[];
  invalid: unknown[];
}

function split(entries: unknown[]): Store {
  const items: SavedMapping[] = [];
  const invalid: unknown[] = [];
  for (const entry of entries) {
    const m = parseOne(entry);
    if (m) items.push(m);
    else invalid.push(entry);
  }
  return { items, invalid };
}

export function readStore(raw: string | null): Store {
  if (!raw) return { items: [], invalid: [] };
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { items: [], invalid: [raw] };
  }
  if (Array.isArray(parsed)) return split(parsed);
  const envelope = parsed as { version?: unknown; items?: unknown };
  if (envelope?.version === STORE_VERSION && Array.isArray(envelope.items)) {
    return split(envelope.items);
  }
  return { items: [], invalid: [parsed] };
}

export function parseMappings(raw: string | null): SavedMapping[] {
  return readStore(raw).items;
}

export function serializeMappings(mappings: SavedMapping[]): string {
  return JSON.stringify({ version: STORE_VERSION, items: mappings });
}

/** Keeps entries that could not be read, so no release ever deletes them. */
export function quarantine(entries: unknown[]): void {
  if (entries.length === 0) return;
  const at = Date.now();
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
