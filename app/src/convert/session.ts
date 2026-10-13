import { CHANNELS } from '../core/channel';
import type { ChannelScope, MissingDrums } from '../core/midiremap';
import { MISSING_OPTIONS } from '../core/missing';
import type { OctaveBase } from '../core/notes';
import { readStored, removeStored, writeStored } from '../core/storage';
import { parseEdits, parseSrcEdits, type StoredEdits } from '../core/overrides';

const SESSION_VERSION = 1;

/**
 * The setup a reload brings back: engines, settings and unsaved note edits. An engine not
 * chosen is `null`; it is stored as the empty string, as earlier versions wrote it.
 */
export interface Session extends StoredEdits {
  src: string | null;
  tgt: string | null;
  oct: OctaveBase;
  channel: ChannelScope;
  missing: MissingDrums;
  presetId: string | null;
}

export const EMPTY_SESSION: Session = {
  src: null,
  tgt: null,
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

const missingOf = (value: unknown): MissingDrums =>
  MISSING_OPTIONS.find((o) => o.value === value)?.value ?? EMPTY_SESSION.missing;

const engine = (value: unknown) => (typeof value === 'string' && value !== '' ? value : null);

export function loadSession(): Session {
  const v = stored();
  const legacyMissing = missingOf(readStored('missing'));
  if (!v) return { ...EMPTY_SESSION, missing: legacyMissing };
  return {
    src: engine(v.src),
    tgt: engine(v.tgt),
    oct: v.oct === 'c1' || v.oct === 'c2' ? v.oct : EMPTY_SESSION.oct,
    channel: CHANNELS.find((c) => c.value === v.channel)?.value ?? EMPTY_SESSION.channel,
    missing: missingOf(v.missing),
    presetId: typeof v.presetId === 'string' ? v.presetId : EMPTY_SESSION.presetId,
    edits: parseEdits(v.edits) ?? EMPTY_SESSION.edits,
    srcEdits: parseSrcEdits(v.srcEdits) ?? EMPTY_SESSION.srcEdits,
  };
}

export function saveSession(session: Session): void {
  const written = { version: SESSION_VERSION, ...session, src: session.src ?? '', tgt: session.tgt ?? '' };
  if (writeStored('session', JSON.stringify(written))) removeStored('missing');
}
