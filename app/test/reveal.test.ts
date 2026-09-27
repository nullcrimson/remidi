import { describe, expect, it } from 'vitest';
import { revealScrollTop } from '../src/lib/reveal';

describe('revealScrollTop', () => {
  it('leaves a fully visible row alone', () => {
    expect(revealScrollTop({ top: 40, height: 30 }, { scrollTop: 0, height: 240 })).toBeNull();
  });

  it('centres a row below the visible area', () => {
    expect(revealScrollTop({ top: 600, height: 30 }, { scrollTop: 0, height: 240 })).toBe(495);
  });

  it('centres a row above the visible area', () => {
    expect(revealScrollTop({ top: 60, height: 30 }, { scrollTop: 300, height: 240 })).toBe(0);
  });

  it('centres a partly hidden row', () => {
    expect(revealScrollTop({ top: 225, height: 30 }, { scrollTop: 0, height: 240 })).toBe(120);
  });
});
