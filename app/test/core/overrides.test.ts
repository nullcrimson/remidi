import { describe, expect, it } from 'vitest';
import { sameEdits, type Edits, type SrcEdits } from '../../src/core/overrides';
import { typed } from '../typed';

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
