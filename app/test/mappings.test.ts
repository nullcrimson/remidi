import { describe, expect, it } from 'vitest';
import { parseMappings, serializeMappings, sortByRecent, type SavedMapping } from '../src/lib/mappings';

const sample: SavedMapping = {
  id: 'a1',
  name: 'GGD→EZ',
  src: 'ggd_invasion',
  tgt: 'ezdrummer',
  edits: { 'kick.main': 36, 'snare1.hit': 38 },
  srcEdits: { 60: 'china.1.hit' },
  updatedAt: 1000,
};

describe('parseMappings', () => {
  it('returns empty for null or empty input', () => {
    expect(parseMappings(null)).toEqual([]);
    expect(parseMappings('')).toEqual([]);
  });

  it('returns empty for corrupt JSON or non-arrays', () => {
    expect(parseMappings('{')).toEqual([]);
    expect(parseMappings('{"id":"x"}')).toEqual([]);
    expect(parseMappings('42')).toEqual([]);
  });

  it('round-trips a valid mapping', () => {
    expect(parseMappings(serializeMappings([sample]))).toEqual([sample]);
  });

  it('drops entries missing required fields', () => {
    const raw = JSON.stringify([sample, { id: 'b', name: 'x', src: 's', tgt: 't' }]);
    expect(parseMappings(raw)).toEqual([sample]);
  });

  it('defaults srcEdits to empty for legacy entries without it', () => {
    const legacy = { ...sample };
    delete (legacy as { srcEdits?: unknown }).srcEdits;
    const parsed = parseMappings(JSON.stringify([legacy]));
    expect(parsed[0].srcEdits).toEqual({});
  });

  it('drops entries whose srcEdits keys are not valid notes', () => {
    expect(parseMappings(JSON.stringify([{ ...sample, srcEdits: { abc: 'kick.main' } }]))).toEqual(
      [],
    );
    expect(parseMappings(JSON.stringify([{ ...sample, srcEdits: { 200: 'kick.main' } }]))).toEqual(
      [],
    );
  });

  it('drops entries whose edits contain out-of-range or non-integer notes', () => {
    const bad = [
      JSON.stringify([{ ...sample, edits: { 'kick.main': 200 } }]),
      JSON.stringify([{ ...sample, edits: { 'kick.main': -1 } }]),
      JSON.stringify([{ ...sample, edits: { 'kick.main': 1.5 } }]),
      JSON.stringify([{ ...sample, edits: { 'kick.main': 'x' } }]),
    ];
    for (const raw of bad) expect(parseMappings(raw)).toEqual([]);
  });

  it('drops entries with non-object edits', () => {
    expect(parseMappings(JSON.stringify([{ ...sample, edits: [] }]))).toEqual([]);
    expect(parseMappings(JSON.stringify([{ ...sample, edits: null }]))).toEqual([]);
  });
});

describe('sortByRecent', () => {
  it('orders by updatedAt descending without mutating input', () => {
    const older = { ...sample, id: 'old', updatedAt: 1 };
    const newer = { ...sample, id: 'new', updatedAt: 9 };
    const input = [older, newer];
    const sorted = sortByRecent(input);
    expect(sorted.map((m) => m.id)).toEqual(['new', 'old']);
    expect(input.map((m) => m.id)).toEqual(['old', 'new']);
  });
});
