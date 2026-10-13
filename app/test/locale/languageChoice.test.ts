import { readChoice, writeChoice } from '../../src/locale/languageChoice';

describe('the raw stored language choice', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('reads nothing before a choice is written', () => {
    expect(readChoice()).toBeNull();
  });

  it('reads back the code that was written', () => {
    writeChoice('pl');
    expect(readChoice()).toBe('pl');
  });

  it('returns a stored code as it is, without checking it against any locale', () => {
    writeChoice('xx');
    expect(readChoice()).toBe('xx');
  });

  it('reads nothing when storage throws', () => {
    vi.spyOn(localStorage, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(readChoice()).toBeNull();
  });

  it('does not throw when saving fails', () => {
    vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(() => writeChoice('pl')).not.toThrow();
  });
});
