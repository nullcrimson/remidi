import { argsOf, generate, parseSources } from '../scripts/gen-i18n';

const ftl = 'plain = Hello\nwith-var = { $count } files from { $name }\n';
const locales = [{ code: 'en', prefix: '', langTag: 'en', nativeName: 'English', fonts: null }];
const structure = {
  routes: { converter: '/', noteMaps: '/engines/' },
  sections: [{ key: 'faq', slug: 'faq' }],
  nav: [{ route: 'converter' as const }, { section: 'faq' }],
  footer: [{ section: 'faq' }],
};

describe('gen-i18n', () => {
  it('lists every message id with its variables', () => {
    expect(argsOf(ftl)).toEqual({ plain: [], 'with-var': ['count', 'name'] });
  });

  const emitted = () => generate(parseSources({ locales, structure, ftl })).ts;

  it('emits the Locale type', () => {
    const ts = emitted();
    expect(ts).toContain(`export type Locale = 'en';`);
  });

  it('emits the SectionKey type', () => {
    const ts = emitted();
    expect(ts).toContain(`export type SectionKey = 'faq';`);
  });

  it('emits the Message type with its variables', () => {
    const ts = emitted();
    expect(ts).toContain(`'with-var': { count: FluentVariable; name: FluentVariable }`);
  });

  it('emits the NavTarget list', () => {
    const ts = emitted();
    expect(ts).toContain(`export const NAV: NavTarget[] = [{"route":"converter"},{"section":"faq"}];`);
  });

  it('rejects a nav target naming an unknown section', () => {
    expect(() => parseSources({ locales, structure: { ...structure, footer: [{ section: 'nope' }] }, ftl })).toThrow(/unknown section 'nope'/);
  });

  it('rejects an ftl with syntax errors', () => {
    expect(() => parseSources({ locales, structure, ftl: 'broken = { $\n' })).toThrow(/app\.ftl/);
  });

  it('writes :lang rules only for locales with fonts', () => {
    const withFonts = [...locales, { code: 'ja', prefix: 'ja', langTag: 'ja', nativeName: '日本語', fonts: '"Hiragino Sans", "Yu Gothic", "Noto Sans JP", sans-serif' }];
    const { css } = generate(parseSources({ locales: withFonts, structure, ftl }));
    expect(css).toBe(':lang(ja) {\n  --font-sans: "Hiragino Sans", "Yu Gothic", "Noto Sans JP", sans-serif;\n  --font-display: var(--font-sans);\n  --font-mono: \'IBM Plex Mono\', "Hiragino Sans", "Yu Gothic", "Noto Sans JP", sans-serif;\n}\n');
  });

  const withDocs = () => generate(parseSources({
    locales: [...locales, { code: 'pl', prefix: 'pl', langTag: 'pl', nativeName: 'Polski', fonts: null }],
    structure: { ...structure, sections: ['guide', 'faq', 'terms'].map((key) => ({ key, slug: key })) },
    ftl: 'a = x\n',
    docs: { en: ['guide', 'faq', 'terms'], pl: ['guide', 'faq'] },
  }));

  it('lists each locale\'s translated sections from its documents', () => {
    const out = withDocs();
    expect(out.ts).toContain('export const TRANSLATED_SECTIONS: Record<Locale, readonly SectionKey[]> = {"en":["guide","faq","terms"],"pl":["guide","faq"]};');
  });

  it('lists the locale codes', () => {
    const out = withDocs();
    expect(out.ts).toContain('export const LOCALE_CODES: readonly Locale[] = ["en","pl"];');
  });

  it('carries each locale\'s native name', () => {
    const out = withDocs();
    expect(out.ts).toContain('"nativeName":"Polski"');
  });

  it('rejects documents for a section the structure does not know', () => {
    expect(() => parseSources({ locales, structure, ftl: 'a = x\n', docs: { en: ['nope'] } })).toThrow(/docs\/en\.json: unknown section 'nope'/);
  });
});
