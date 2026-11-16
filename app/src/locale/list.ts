import { LOCALES, type Locale } from '../generated/i18n';

/** `items` as one list in the words of `locale`, as English writes `a, b, c`. */
export function listed(locale: Locale, items: string[]): string {
  return new Intl.ListFormat(LOCALES[locale].langTag, { style: 'short', type: 'unit' }).format(items);
}
