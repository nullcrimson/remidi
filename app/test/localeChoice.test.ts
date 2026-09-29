import { storedLocale, storeLocale } from '../src/lib/localeChoice';

describe('the stored language choice', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('remembers a choice', () => {
    storeLocale('pl');
    expect(storedLocale()).toBe('pl');
  });

  it('ignores a stored value that is not a locale', () => {
    localStorage.setItem('midiremap:locale', 'xx');
    expect(storedLocale()).toBeNull();
  });

  it('reads nothing when storage throws', () => {
    vi.spyOn(localStorage, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(storedLocale()).toBeNull();
  });

  it('does not throw when saving fails', () => {
    vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(() => storeLocale('pl')).not.toThrow();
  });
});
