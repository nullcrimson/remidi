import enFtl from '../../locales/en/app.ftl?raw';
import { initForTests, loadMessages, t } from '../src/i18n';
import { href } from '../src/content/site';

describe('messages', () => {
  it('formats a message with its arguments', () => {
    initForTests('greet = { $count } files\n');
    expect(t({ id: 'greet' as never, args: { count: 3 } } as never)).toBe('3 files');
  });

  it('reports a message formatted without its arguments', () => {
    const logged = vi.spyOn(console, 'error').mockImplementation(() => {});
    initForTests('greet = { $count } files\n');
    expect(t({ id: 'greet' } as never)).toBe('{$count} files');
    expect(logged).toHaveBeenCalledWith('greet', expect.anything());
    logged.mockRestore();
  });

  it('refuses a language file that lacks an English message', async () => {
    await expect(loadMessages('en', async () => 'only-this = x\n')).rejects.toThrow(/missing messages: brand-tagline/);
  });

  it('refuses to start when the language file cannot load', async () => {
    await expect(loadMessages('en', async () => {
      throw new TypeError('Failed to fetch');
    })).rejects.toThrow(/Failed to fetch/);
  });
});

describe('links', () => {
  it('resolves routes and links sections by slug for English', () => {
    expect(href({ route: 'converter' })).toBe('/');
    expect(href({ route: 'noteMaps' })).toBe('/engines/');
    expect(href({ section: 'guide' })).toBe('/how-it-works/');
  });
});

afterAll(() => initForTests(enFtl));
