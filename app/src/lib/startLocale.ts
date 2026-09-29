import type { Locale } from '../generated/i18n';
import { ENGLISH, loadTranslator, type Translator } from '../i18n';
import { detectLocale } from './detect';
import { converterPath } from './documentLocale';

/** The language to start in: the address's; on `/`, the stored choice, else the browser's. */
export function startLocale(path: Locale, stored: Locale | null, languages: readonly string[]): Locale {
  if (path !== 'en') return path;
  return stored ?? detectLocale(languages) ?? 'en';
}

/** The converter's address in `locale`, keeping the query and hash the page opened with. */
export function startAddress(locale: Locale, search: string, hash: string): string {
  return `${converterPath(locale)}${search}${hash}`;
}

/** The starting translator; a detected language that fails to load falls back to English. */
export async function startTranslator(path: Locale, start: Locale, load = loadTranslator): Promise<Translator> {
  try {
    return await load(start);
  } catch (err) {
    if (start === path) throw err;
    console.error(err);
    return ENGLISH;
  }
}
