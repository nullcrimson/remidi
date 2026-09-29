import { parseLocale, type Locale } from './generated/i18n';

/** The locale the address names; the only reader of `location.pathname`. */
export function pathLocale(): Locale {
  return parseLocale(location.pathname.split('/')[1] ?? '') ?? 'en';
}
