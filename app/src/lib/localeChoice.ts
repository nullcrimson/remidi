import { LOCALE_CODES, type Locale } from '../generated/i18n';
import { readStored, writeStored } from './storage';

const KEY = 'midiremap:locale';

/** The language the visitor last picked, if storage has one this site speaks. */
export function storedLocale(): Locale | null {
  const value = readStored(KEY);
  return LOCALE_CODES.find((l) => l === value) ?? null;
}

export function storeLocale(locale: Locale): void {
  writeStored(KEY, locale);
}
