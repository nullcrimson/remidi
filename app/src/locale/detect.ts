import { LOCALE_CODES, LOCALES, type Locale } from '../generated/i18n';
import { sameLanguage } from './language';

/** The first of the browser's languages this site speaks, matched by language and script. */
export function detectLocale(languages: readonly string[]): Locale | undefined {
  for (const tag of languages) {
    const hit = LOCALE_CODES.find((l) => sameLanguage(LOCALES[l].langTag, tag));
    if (hit) return hit;
  }
  return undefined;
}
