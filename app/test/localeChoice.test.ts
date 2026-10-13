import { storedLocale, storeLocale } from '../src/lib/localeChoice';

describe('the stored language choice', () => {
  afterEach(() => {
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
});
