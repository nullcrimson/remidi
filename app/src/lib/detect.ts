import { LOCALE_CODES, LOCALES, type Locale } from '../generated/i18n';

const languageAndScript = (tag: string): string | undefined => {
  try {
    const locale = new Intl.Locale(tag).maximize();
    return `${locale.language}-${locale.script ?? ''}`;
  } catch {
    return undefined;
  }
};

/** Whether two language tags name the same language in the same script (`pt-BR` and `pt-PT` do, `zh-Hans` and `zh-TW` don't). */
export function sameLanguage(a: string, b: string): boolean {
  const x = languageAndScript(a);
  return x !== undefined && x === languageAndScript(b);
}

/** The first of the browser's languages this site speaks, matched by language and script. */
export function detectLocale(languages: readonly string[]): Locale | undefined {
  for (const tag of languages) {
    const hit = LOCALE_CODES.find((l) => sameLanguage(LOCALES[l].langTag, tag));
    if (hit) return hit;
  }
  return undefined;
}
