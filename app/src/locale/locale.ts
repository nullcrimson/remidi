import { LOCALE_CODES, LOCALES, parseLocale, ROUTE_PATHS, type Locale, type SitePath } from '../generated/i18n';
import type { Translator } from './i18n';
import { readChoice, writeChoice } from './languageChoice';

/** The locale the address names; the only reader of `location.pathname`. */
export function pathLocale(): Locale {
  return parseLocale(location.pathname.split('/')[1]) ?? 'en';
}

/** The language the visitor last picked, if storage has one this site speaks. */
export function storedLocale(): Locale | null {
  const value = readChoice();
  return LOCALE_CODES.find((l) => l === value) ?? null;
}

export function storeLocale(locale: Locale): void {
  writeChoice(locale);
}

/** Puts the translator's language on `<html lang>` and its converter title on the tab. */
export function applyDocument(tr: Translator): void {
  document.documentElement.lang = LOCALES[tr.locale].langTag;
  document.title = tr.t({ id: 'converter-title' });
}

/** `path` under `locale`'s address prefix. */
export function localePath(locale: Locale, path: SitePath): SitePath {
  const { prefix } = LOCALES[locale];
  return prefix === '' ? path : `/${prefix}${path}`;
}

export function converterPath(locale: Locale): string {
  return localePath(locale, ROUTE_PATHS.converter);
}
