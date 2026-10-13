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
