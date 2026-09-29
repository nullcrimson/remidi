import { href } from '../content/site';
import { LOCALES, type Locale } from '../generated/i18n';
import type { Translator } from '../i18n';

export function converterPath(locale: Locale): string {
  return href({ route: 'converter' }, locale);
}

/** Puts the translator's language on `<html lang>` and its converter title on the tab. */
export function applyDocument(tr: Translator): void {
  document.documentElement.lang = LOCALES[tr.locale].langTag;
  document.title = tr.t({ id: 'converter-title' });
}
