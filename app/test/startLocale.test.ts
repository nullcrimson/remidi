import { ENGLISH } from '../src/i18n';
import { startAddress, startLocale, startTranslator } from '../src/lib/startLocale';

describe('the starting locale', () => {
  afterEach(() => vi.restoreAllMocks());

  it('detects on the English converter with no stored choice', () => expect(startLocale('en', null, ['pl-PL'])).toBe('pl'));
  it('keeps a stored English choice', () => expect(startLocale('en', 'en', ['pl-PL'])).toBe('en'));
  it('opens / in the stored language', () => expect(startLocale('en', 'pl', ['en-US'])).toBe('pl'));
  it('lets the address win over a stored choice', () => expect(startLocale('pl', 'en', ['en-US'])).toBe('pl'));
  it('keeps the query and hash when moving to another locale\'s converter', () => {
    expect(startAddress('pl', '?from=ggd_invasion&to=ezdrummer', '#x')).toBe('/pl/?from=ggd_invasion&to=ezdrummer#x');
  });
  it('keeps the URL\'s locale on /pl/', () => expect(startLocale('pl', null, ['en-US'])).toBe('pl'));
  it('stays English for unsupported browsers', () => expect(startLocale('en', null, ['nl'])).toBe('en'));

  it('falls back to English when the detected locale fails to load', async () => {
    const load = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(await startTranslator('en', 'pl', load)).toBe(ENGLISH);
  });

  it('fails when the URL\'s own locale fails to load', async () => {
    const load = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(startTranslator('pl', 'pl', load)).rejects.toThrow(/Failed to fetch/);
  });
});
