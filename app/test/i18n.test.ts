import { ENGLISH, loadTranslator, makeTranslator } from '../src/i18n';
import { href } from '../src/content/site';

describe('translators', () => {
  it('formats a message with its arguments', () => {
    const tr = makeTranslator('en', 'greet = { $count } files\n', {}, ['greet']);
    expect(tr.t({ id: 'greet', args: { count: 3 } } as never)).toBe('3 files');
  });

  it('refuses a language file that lacks an English message', () => {
    expect(() => makeTranslator('pl', 'only-this = x\n', {})).toThrow(/missing messages: brand-tagline/);
  });

  it('reports a message formatted without its arguments', () => {
    const logged = vi.spyOn(console, 'error').mockImplementation(() => {});
    const tr = makeTranslator('en', 'greet = { $count } files\n', {}, ['greet']);
    expect(tr.t({ id: 'greet' } as never)).toBe('{$count} files');
    expect(logged).toHaveBeenCalledWith('greet', expect.anything());
    logged.mockRestore();
  });

  it('gives English without loading anything', async () => {
    expect(await loadTranslator('en')).toBe(ENGLISH);
  });

  it('loads Polish messages and documents together', async () => {
    const pl = await loadTranslator('pl');
    expect(pl.locale).toBe('pl');
    expect(pl.t({ id: 'nav-converter' })).not.toBe(ENGLISH.t({ id: 'nav-converter' }));
    expect(pl.docs.faq?.length).toBeGreaterThan(0);
    expect(pl.docs.terms?.length).toBeGreaterThan(0);
  });
});

describe('links', () => {
  it('resolves routes and links sections by slug for English', () => {
    expect(href({ route: 'converter' })).toBe('/');
    expect(href({ route: 'noteMaps' })).toBe('/engines/');
    expect(href({ section: 'guide' })).toBe('/how-it-works/');
  });
});
