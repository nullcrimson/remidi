import { readStored, writeStored } from './storage';

/** Where the tip ask keeps its counts and times, shared by every tab. */
export const TIP_KEY = 'midiremap:tip';

const FIRST_ASK = 3;
const DAY = 24 * 60 * 60 * 1000;
const GAP = DAY;
const AFTER_TIP = 90 * DAY;

interface TipRecord {
  downloads: number;
  shownAt: number | null;
  tippedAt: number | null;
}

const time = (value: unknown) => (typeof value === 'number' && Number.isFinite(value) ? value : null);

function load(): TipRecord {
  try {
    const v = JSON.parse(readStored(TIP_KEY) ?? '{}') as Record<string, unknown>;
    const downloads = typeof v.downloads === 'number' && v.downloads >= 0 ? Math.floor(v.downloads) : 0;
    return { downloads, shownAt: time(v.shownAt), tippedAt: time(v.tippedAt) };
  } catch {
    return { downloads: 0, shownAt: null, tippedAt: null };
  }
}

const since = (then: number | null, now: number, wait: number) => then === null || now - then >= wait;

/**
 * Counts a saved file and says whether to ask for a tip now: never on a visitor's first
 * two files, then at most once a day, and not for 90 days after a tip. Asking marks the time.
 */
export function askAfterDownload(now = Date.now()): boolean {
  const r = load();
  const downloads = r.downloads + 1;
  const ask = downloads >= FIRST_ASK && since(r.shownAt, now, GAP) && since(r.tippedAt, now, AFTER_TIP);
  writeStored(TIP_KEY, JSON.stringify({ ...r, downloads, shownAt: ask ? now : r.shownAt }));
  return ask;
}

/** Remembers a tip, pausing the ask for 90 days. */
export function rememberTip(now = Date.now()): void {
  writeStored(TIP_KEY, JSON.stringify({ ...load(), tippedAt: now }));
}
