import { LOCALE_CODES, type Locale } from '../generated/i18n';
import { readChoice, writeChoice } from './languageChoice';

/** The language the visitor last picked, if storage has one this site speaks. */
export function storedLocale(): Locale | null {
  const value = readChoice();
  return LOCALE_CODES.find((l) => l === value) ?? null;
}

export function storeLocale(locale: Locale): void {
  writeChoice(locale);
}
