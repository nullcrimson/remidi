import { readStored, writeStored } from '../core/storage';
import { asLocale } from './localeCode';
import type { Locale } from '../generated/localeCodes';

/** Where the static pages' language offer stands: shown on a page and not yet answered, or answered. */
export type LocaleOffer = { kind: 'shown'; to: Locale; page: string } | { kind: 'answered' };

const ANSWERED = 'answered';
const DISMISSED_BEFORE_IGNORING_COUNTED = 'dismissed';

function shown(value: string): LocaleOffer | null {
  try {
    const parsed: unknown = JSON.parse(value);
    if (typeof parsed !== 'object' || parsed === null || !('to' in parsed) || !('page' in parsed)) return null;
    const to = asLocale(typeof parsed.to === 'string' ? parsed.to : undefined);
    return to !== undefined && typeof parsed.page === 'string' ? { kind: 'shown', to, page: parsed.page } : null;
  } catch {
    return null;
  }
}

/** The stored offer, or null when it was never shown, storage is blocked, or the value cannot be decoded. */
export function readOffer(): LocaleOffer | null {
  const value = readStored('locale-offer');
  if (value === null) return null;
  if (value === ANSWERED || value === DISMISSED_BEFORE_IGNORING_COUNTED) return { kind: 'answered' };
  return shown(value);
}

/** Remembers where the offer stands; blocked storage leaves it unsaved. */
export function writeOffer(offer: LocaleOffer): void {
  writeStored('locale-offer', offer.kind === 'answered' ? ANSWERED : JSON.stringify({ to: offer.to, page: offer.page }));
}
