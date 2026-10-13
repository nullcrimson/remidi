import { beforeEach, describe, expect, it, vi } from 'vitest';
import { clearStored, readStored, readStoredStrict, removeStored, storedName, writeStored } from '../../src/core/storage';

describe('the stored names', () => {
  it('keeps the session under midiremap:session', () => {
    expect(storedName('session')).toBe('midiremap:session');
  });

  it('keeps the legacy missing-drums choice under midiremap:missing', () => {
    expect(storedName('missing')).toBe('midiremap:missing');
  });

  it('keeps the presets under midiremap:mappings', () => {
    expect(storedName('mappings')).toBe('midiremap:mappings');
  });

  it('keeps the unreadable presets under midiremap:quarantine', () => {
    expect(storedName('quarantine')).toBe('midiremap:quarantine');
  });

  it('keeps the language choice under midiremap:locale', () => {
    expect(storedName('locale')).toBe('midiremap:locale');
  });

  it('keeps the dismissed language offer under midiremap:locale-offer', () => {
    expect(storedName('locale-offer')).toBe('midiremap:locale-offer');
  });

  it('keeps the tip record under midiremap:tip', () => {
    expect(storedName('tip')).toBe('midiremap:tip');
  });

  it('keeps the source favourites under midiremap:favorites:from', () => {
    expect(storedName('favorites:from')).toBe('midiremap:favorites:from');
  });

  it('keeps the target favourites under midiremap:favorites:to', () => {
    expect(storedName('favorites:to')).toBe('midiremap:favorites:to');
  });
});

describe('stored values', () => {
  beforeEach(() => localStorage.clear());

  it('reads back what was written, under the stored name', () => {
    writeStored('tip', 'x');
    expect(localStorage.getItem('midiremap:tip')).toBe('x');
    expect(readStored('tip')).toBe('x');
  });

  it('removes one value and leaves the others', () => {
    writeStored('tip', 'x');
    writeStored('locale', 'pl');
    removeStored('tip');
    expect(readStored('tip')).toBeNull();
    expect(readStored('locale')).toBe('pl');
  });

  it('clears everything of ours and nothing else', () => {
    writeStored('tip', 'x');
    writeStored('favorites:from', '[]');
    localStorage.setItem('other-app', 'keep');
    clearStored();
    expect(readStored('tip')).toBeNull();
    expect(readStored('favorites:from')).toBeNull();
    expect(localStorage.getItem('other-app')).toBe('keep');
  });
});

describe('reading storage that may be blocked', () => {
  beforeEach(() => localStorage.clear());

  it('says nothing is stored apart from a blocked read', () => {
    expect(readStoredStrict('tip')).toEqual({ value: null });
  });

  it('says a read the browser refused is blocked', () => {
    const get = vi.spyOn(localStorage, 'getItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError');
    });
    try {
      expect(readStoredStrict('tip')).toBe('blocked');
    } finally {
      get.mockRestore();
    }
  });

  it('reads a blocked storage as nothing stored', () => {
    const get = vi.spyOn(localStorage, 'getItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError');
    });
    try {
      expect(readStored('tip')).toBeNull();
    } finally {
      get.mockRestore();
    }
  });
});
