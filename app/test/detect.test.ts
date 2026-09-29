import { detectLocale, sameLanguage } from '../src/lib/detect';

describe('detectLocale', () => {
  it('matches a region tag by its language', () => expect(detectLocale(['pl-PL'])).toBe('pl'));
  it('matches a bare tag', () => expect(detectLocale(['pl'])).toBe('pl'));
  it('ignores case', () => expect(detectLocale(['PL-pl'])).toBe('pl'));
  it('skips unsupported languages', () => expect(detectLocale(['nl-NL', 'pl'])).toBe('pl'));
  it('skips a script-and-region tag it does not speak', () => expect(detectLocale(['zh-Hant-TW', 'pl'])).toBe('pl'));
  it('keeps English when English comes first', () => expect(detectLocale(['en-US', 'pl-PL'])).toBe('en'));
  it('finds nothing for unsupported languages only', () => expect(detectLocale(['nl', 'sv'])).toBeUndefined());
  it('finds nothing in an empty list', () => expect(detectLocale([])).toBeUndefined());
});

describe('detection by language and script', () => {
  it('matches Simplified Chinese tags to 中文', () => {
    expect(detectLocale(['zh-CN'])).toBe('zh');
    expect(detectLocale(['zh'])).toBe('zh');
    expect(detectLocale(['zh-SG'])).toBe('zh');
    expect(detectLocale(['zh-Hans-HK'])).toBe('zh');
  });

  it('leaves Traditional Chinese readers on English', () => {
    expect(detectLocale(['zh-TW'])).toBeUndefined();
    expect(detectLocale(['zh-HK'])).toBeUndefined();
    expect(detectLocale(['zh-Hant'])).toBeUndefined();
  });

  it('matches regional variants that share the script', () => {
    expect(detectLocale(['pt-PT'])).toBe('pt');
    expect(detectLocale(['es-419'])).toBe('es');
    expect(detectLocale(['de-AT'])).toBe('de');
    expect(detectLocale(['ja-JP'])).toBe('ja');
    expect(detectLocale(['ko-KR'])).toBe('ko');
  });

  it('skips tags that are not valid language tags', () => {
    expect(detectLocale(['en_US', '*', 'fr-FR'])).toBe('fr');
  });

  it('compares language and script, not region', () => {
    expect(sameLanguage('pt-BR', 'pt-PT')).toBe(true);
    expect(sameLanguage('zh-Hans', 'zh-TW')).toBe(false);
    expect(sameLanguage('en', 'en_US')).toBe(false);
  });
});
