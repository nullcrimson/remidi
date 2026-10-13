import { CHANNELS } from '../core/channel';
import type { ChannelScope, MissingDrums } from '../core/midiremap';
import type { OctaveBase } from '../core/notes';
import { readStored, removeStored, writeStored } from '../core/storage';
import { parseEdits, parseSrcEdits, type StoredEdits } from '../core/overrides';

const SESSION_VERSION = 1;

/** The setup a reload brings back: engines, settings and unsaved note edits. */
export interface Session extends StoredEdits {
  src: string;
  tgt: string;
  oct: OctaveBase;
  channel: ChannelScope;
  missing: MissingDrums;
  presetId: string | null;
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

function stored(): Record<string, unknown> | null {
  const raw = readStored('session');
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
  const legacyMissing = readStored('missing') === 'drop' ? 'drop' : 'nearest';
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
  if (writeStored('session', JSON.stringify({ version: SESSION_VERSION, ...session }))) removeStored('missing');
}
