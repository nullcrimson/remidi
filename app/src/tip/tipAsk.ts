import { readStored, writeStored } from '../core/storage';
import type { StatEvents } from '../core/umami';

/** What a tip amount is called in the events. */
export type TipAmount = Exclude<StatEvents['tip-answered']['answer'], 'closed'>;

/** What a tip amount is called in the events: the euros, or `other` for any amount not listed. */
export function amountAnswer(euros: number): TipAmount {
  switch (euros) {
    case 3: return '3';
    case 5: return '5';
    case 10: return '10';
    default: return 'other';
  }
}

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
    const v = JSON.parse(readStored('tip') ?? '{}') as Record<string, unknown>;
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
  writeStored('tip', JSON.stringify({ ...r, downloads, shownAt: ask ? now : r.shownAt }));
  return ask;
}

/** Remembers a tip, pausing the ask for 90 days. */
export function rememberTip(now = Date.now()): void {
  writeStored('tip', JSON.stringify({ ...load(), tippedAt: now }));
}
