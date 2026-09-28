import { CHANNELS, type Channel } from './channel';
import { parseEdits, parseSrcEdits } from './mappings';
import { MISSING_KEY, type Missing } from './missing';
import type { OctaveBase } from './notes';
import type { Edits, SrcEdits } from './overrides';

export const SESSION_KEY = 'midiremap:session';
const SESSION_VERSION = 1;

/** The setup a reload brings back: engines, settings and unsaved note edits. */
export interface Session {
  src: string;
  tgt: string;
  oct: OctaveBase;
  channel: Channel;
  missing: Missing;
  presetId: string | null;
  edits: Edits;
  srcEdits: SrcEdits;
}

export const EMPTY_SESSION: Session = {
  src: '',
  tgt: '',
  oct: 'c1',
  channel: 'auto',
  missing: 'nearest',
  presetId: null,
  edits: {},
  srcEdits: {},
};

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function stored(): Record<string, unknown> | null {
  const raw = read(SESSION_KEY);
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return null;
    const v = parsed as Record<string, unknown>;
    return v.version === SESSION_VERSION ? v : null;
  } catch {
    return null;
  }
}

const text = (value: unknown) => (typeof value === 'string' ? value : '');

export function loadSession(): Session {
  const v = stored();
  const legacyMissing = read(MISSING_KEY) === 'drop' ? 'drop' : 'nearest';
  if (!v) return { ...EMPTY_SESSION, missing: legacyMissing };
  return {
    src: text(v.src),
    tgt: text(v.tgt),
    oct: v.oct === 'c2' ? 'c2' : 'c1',
    channel: CHANNELS.find((c) => c.value === v.channel)?.value ?? 'auto',
    missing: v.missing === 'drop' ? 'drop' : 'nearest',
    presetId: typeof v.presetId === 'string' ? v.presetId : null,
    edits: parseEdits(v.edits) ?? {},
    srcEdits: parseSrcEdits(v.srcEdits) ?? {},
  };
}

export function saveSession(session: Session): void {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify({ version: SESSION_VERSION, ...session }));
    localStorage.removeItem(MISSING_KEY);
  } catch {
    void 0;
  }
}
