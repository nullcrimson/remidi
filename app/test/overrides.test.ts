import { describe, expect, it } from 'vitest';
import { editsToOverrides } from '../src/lib/overrides';

describe('overrides', () => {
  it('builds a tgt overrides doc from edits', () => {
    expect(editsToOverrides({ KickMain: 35, SnareCenter: 40 })).toEqual({
      tgt: [
        { canon: 'KickMain', note: 35 },
        { canon: 'SnareCenter', note: 40 },
      ],
      src: [],
    });
  });

  it('builds src overrides (note → canon) from source edits', () => {
    expect(editsToOverrides({}, { 60: 'china.1.hit', 61: 'kick.main' })).toEqual({
      tgt: [],
      src: [
        { note: 60, canon: 'china.1.hit' },
        { note: 61, canon: 'kick.main' },
      ],
    });
  });

});
