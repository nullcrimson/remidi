import { readStored, writeStored } from '../core/storage';
import type { StatEvents, TipSite } from '../core/umami';

/** A tip ask's answer as the events name it: an amount, or `closed`. */
export type TipAnswer = StatEvents['tip-answered']['answer'];

/** What a tip amount is called in the events. */
export type TipAmount = Exclude<TipAnswer, 'closed'>;

/** The tip amounts in euros, whole, in the reader's language: the one format of every tip ask. */
export const tipEuros = (langTag: string) =>
  new Intl.NumberFormat(langTag, { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });

/** Takes the tip ask's answer on `site`, remembering a tip when it is an amount, and returns the `tip-answered` event's properties. */
export function answerTip(answer: TipAnswer, site: TipSite): StatEvents['tip-answered'] {
  if (answer !== 'closed') rememberTip();
  return { answer, where: 'toast', site };
}

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
 * Counts a saved file and says whether to ask for a tip now: from the visitor's
 * `FIRST_ASK`th file, at most once per `GAP`, and not within `AFTER_TIP` of a tip. Asking
 * marks the time; a count that cannot be saved never asks, so a storage that reads but does
 * not write cannot ask on every file.
 */
export function askAfterDownload(now = Date.now()): boolean {
  const r = load();
  const downloads = r.downloads + 1;
  const ask = downloads >= FIRST_ASK && since(r.shownAt, now, GAP) && since(r.tippedAt, now, AFTER_TIP);
  const saved = writeStored('tip', JSON.stringify({ ...r, downloads, shownAt: ask ? now : r.shownAt }));
  return ask && saved;
}

/** Remembers a tip, pausing the ask for `AFTER_TIP`. */
export function rememberTip(now = Date.now()): void {
  writeStored('tip', JSON.stringify({ ...load(), tippedAt: now }));
}
