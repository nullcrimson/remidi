import { argsOf, generate, parseSources } from '../scripts/gen-i18n';

const ftl = 'plain = Hello\nwith-var = { $count } files from { $name }\n';
const locales = [{ code: 'en', prefix: '', langTag: 'en', nativeName: 'English', fonts: null }];
const structure = {
  sections: [{ key: 'faq', slug: 'faq' }],
  nav: [{ route: 'converter' as const }, { section: 'faq' }],
  footer: [{ section: 'faq' }],
};

describe('gen-i18n', () => {
  it('lists every message id with its variables', () => {
    expect(argsOf(ftl)).toEqual({ plain: [], 'with-var': ['count', 'name'] });
  });

  it('emits Locale, SectionKey, NavTarget and Message types', () => {
    const { ts } = generate(parseSources({ locales, structure, ftl }));
    expect(ts).toContain(`export type Locale = 'en';`);
    expect(ts).toContain(`export type SectionKey = 'faq';`);
    expect(ts).toContain(`'with-var': { count: FluentVariable; name: FluentVariable }`);
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
    expect(css).toBe(':lang(ja) {\n  --font-sans: "Hiragino Sans", "Yu Gothic", "Noto Sans JP", sans-serif;\n  --font-display: var(--font-sans);\n}\n');
  });
});
