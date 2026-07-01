import { describe, expect, it } from 'vitest';
import { editsToOverrides, effectiveTgt, isChanged } from '../src/lib/overrides';

const row = { canon: 'KickMain', srcNote: 24, tgtNote: 36 as number | null };

describe('overrides', () => {
  it('builds a tgt overrides doc from edits', () => {
    expect(editsToOverrides({ KickMain: 35, SnareCenter: 40 })).toEqual({
      tgt: [
        { canon: 'KickMain', note: 35 },
        { canon: 'SnareCenter', note: 40 },
      ],
    });
  });

  it('uses the edit when present, else the row target', () => {
    expect(effectiveTgt(row, {})).toBe(36);
    expect(effectiveTgt(row, { KickMain: 35 })).toBe(35);
  });

  it('flags a row changed when effective target differs from source', () => {
    expect(isChanged({ canon: 'X', srcNote: 40, tgtNote: 40 }, {})).toBe(false);
    expect(isChanged({ canon: 'X', srcNote: 40, tgtNote: 40 }, { X: 42 })).toBe(true);
  });
});
