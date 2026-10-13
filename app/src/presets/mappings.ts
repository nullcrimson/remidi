import type { PresetName } from '../core/midiremap';
import { parseEdits, parseSrcEdits, type StoredEdits } from '../core/overrides';
import { readStored, writeStored } from '../core/storage';

function brand(text: string): PresetName {
  return text as PresetName;
}

/** The one reader of a preset name: `text` as a name when it is not blank, its spacing kept, otherwise null. */
export function parsePresetName(text: string): PresetName | null {
  return text.trim() === '' ? null : brand(text);
}

/** `name`, or the first "name copy", "name copy 2", … not in `taken`. */
export function uniqueName(name: PresetName, taken: PresetName[]): PresetName {
  const used = new Set(taken);
  if (!used.has(name)) return name;
  for (let i = 1; ; i++) {
    const candidate = brand(`${name}${i === 1 ? ' copy' : ` copy ${i}`}`);
    if (!used.has(candidate)) return candidate;
  }
}

export interface SavedMapping extends StoredEdits {
  id: string;
  name: PresetName;
  src: string;
  tgt: string;
  updatedAt: number;
}

export const MAPPINGS_CAP = 50;

function parseOne(value: unknown): SavedMapping | null {
  if (typeof value !== 'object' || value === null) return null;
  const v = value as Record<string, unknown>;
  if (
    typeof v.id !== 'string'
    || typeof v.src !== 'string'
    || typeof v.tgt !== 'string'
    || typeof v.updatedAt !== 'number'
    || !Number.isFinite(v.updatedAt)
  ) {
    return null;
  }
  const name = typeof v.name === 'string' ? parsePresetName(v.name) : null;
  if (!name) return null;
  const edits = parseEdits(v.edits);
  if (!edits) return null;
  const srcEdits = parseSrcEdits(v.srcEdits);
  if (!srcEdits) return null;
  return { id: v.id, name, src: v.src, tgt: v.tgt, edits, srcEdits, updatedAt: v.updatedAt };
}

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
export function quarantine(entries: unknown[]): boolean {
  if (entries.length === 0) return true;
  const at = Date.now();
  return writeStored('quarantine', JSON.stringify([...kept(at), ...entries.map((raw) => ({ at, raw }))]));
}

function kept(at: number): unknown[] {
  const raw = readStored('quarantine');
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
  } catch {
    void 0;
  }
  return [{ at, raw }];
}

export function sortByRecent(mappings: SavedMapping[]): SavedMapping[] {
  return [...mappings].sort((a, b) => b.updatedAt - a.updatedAt);
}
