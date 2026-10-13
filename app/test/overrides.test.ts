import { describe, expect, it } from 'vitest';
import { editsToOverrides, type Edits, type SrcEdits } from '../src/lib/overrides';
import { typed } from './typed';

describe('overrides', () => {
  it('builds a tgt overrides doc from edits', () => {
    expect(editsToOverrides(typed<Edits>({ KickMain: 35, SnareCenter: 40 }))).toEqual({
      tgt: [
        { canon: 'KickMain', note: 35 },
        { canon: 'SnareCenter', note: 40 },
      ],
      src: [],
    });
  });

  it('passes unassigned source notes as null', () => {
    expect(editsToOverrides({}, typed<SrcEdits>({ 38: null, 41: 'tom.floor3.hit' })).src).toEqual([
      { note: 38, canon: null },
      { note: 41, canon: 'tom.floor3.hit' },
    ]);
  });

  it('builds src overrides (note → canon) from source edits', () => {
    expect(editsToOverrides({}, typed<SrcEdits>({ 60: 'china.1.hit', 61: 'kick.main' }))).toEqual({
      tgt: [],
      src: [
        { note: 60, canon: 'china.1.hit' },
        { note: 61, canon: 'kick.main' },
      ],
    });
  });
});
