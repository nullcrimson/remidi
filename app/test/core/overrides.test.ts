import { describe, expect, it } from 'vitest';
import { editsToOverrides, sameEdits, type Edits, type SrcEdits } from '../../src/core/overrides';
import { typed } from '../typed';

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

describe('sameEdits', () => {
  const a = typed<{ edits: Edits; srcEdits: SrcEdits }>({ edits: { 'kick.main': 35, 'china.1.hit': 52 }, srcEdits: { 24: 'snare1.hit', 60: null } });
  const b = typed<{ edits: Edits; srcEdits: SrcEdits }>({ edits: { 'china.1.hit': 52, 'kick.main': 35 }, srcEdits: { 60: null, 24: 'snare1.hit' } });

  it('compares target and source edits regardless of key order', () => {
    expect(sameEdits(a, b)).toBe(true);
  });

  it('tells apart target edits that differ', () => {
    expect(sameEdits(a, { ...b, edits: typed<Edits>({ 'kick.main': 35 }) })).toBe(false);
  });

  it('tells apart a source edit that differs', () => {
    expect(sameEdits(a, { ...b, srcEdits: typed<SrcEdits>({ 24: 'snare1.hit', 60: 'kick.main' }) })).toBe(false);
  });

  it('tells apart a missing source edit', () => {
    expect(sameEdits(a, { ...b, srcEdits: typed<SrcEdits>({ 24: 'snare1.hit' }) })).toBe(false);
  });
});
