import { LOCALE_CODES, type Locale } from '../generated/localeCodes';

/** The locale whose code is `code`, or undefined for any other text. */
export function asLocale(code: string | null | undefined): Locale | undefined {
  return LOCALE_CODES.find((l) => l === code);
}
