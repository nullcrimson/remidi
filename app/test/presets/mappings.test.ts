import { beforeEach, describe, expect, it } from 'vitest';
import { presetName, typed } from '../typed';
import { parseMappings, parsePresetName, quarantine, readStore, serializeMappings, sortByRecent, uniqueName, type SavedMapping } from '../../src/presets/mappings';
import { readStored, storedName } from '../../src/core/storage';

const sample = typed<SavedMapping>({
  id: 'a1',
  name: presetName('GGD→EZ'),
  src: 'ggd_invasion',
  tgt: 'ezdrummer',
  edits: { 'kick.main': 36, 'snare1.hit': 38 },
  srcEdits: { 60: 'china.1.hit' },
  updatedAt: 1000,
});

describe('parseMappings', () => {
  it('keeps a preset that only remembers the engine pair', () => {
    const pairOnly: SavedMapping = {
      id: 'p',
      name: presetName('GGD→EZD'),
      src: 'ggd_invasion',
      tgt: 'ezdrummer',
      edits: {},
      srcEdits: {},
      updatedAt: 1,
    };
    expect(parseMappings(serializeMappings([pairOnly]))).toEqual([pairOnly]);
  });

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

  it('keeps unassigned source notes (null) through a round trip', () => {
    const withNull = { ...sample, srcEdits: { 38: null, 41: 'tom.floor3.hit' } };
    expect(parseMappings(serializeMappings([withNull]))[0].srcEdits).toEqual({
      38: null,
      41: 'tom.floor3.hit',
    });
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

describe('readStore', () => {
  const bad = { id: 'b', name: 'broken' };

  it('reads the legacy bare array and keeps invalid entries aside', () => {
    expect(readStore(JSON.stringify([sample, bad]))).toEqual({ items: [sample], invalid: [bad] });
  });

  it('reads the versioned envelope', () => {
    expect(readStore(serializeMappings([sample]))).toEqual({ items: [sample], invalid: [] });
    expect(JSON.parse(serializeMappings([sample]))).toEqual({ version: 1, items: [sample] });
  });

  it('keeps data it cannot read, whole, instead of dropping it', () => {
    const future = JSON.stringify({ version: 2, items: [sample] });
    expect(readStore(future)).toEqual({ items: [], invalid: [JSON.parse(future)] });
    expect(readStore('{')).toEqual({ items: [], invalid: ['{'] });
  });

  it('has nothing to read when empty', () => {
    expect(readStore(null)).toEqual({ items: [], invalid: [] });
  });

  it('keeps an entry with a blank name aside instead of listing it', () => {
    const blank = { ...sample, name: '  ' };
    expect(readStore(JSON.stringify([sample, blank]))).toEqual({ items: [sample], invalid: [blank] });
  });
});

describe('quarantine', () => {
  beforeEach(() => localStorage.clear());

  const stored = () => JSON.parse(readStored('quarantine')!);

  it('keeps text it cannot parse as one entry before the new one', () => {
    localStorage.setItem(storedName('quarantine'), 'not json{');
    quarantine(['new']);
    expect(stored()).toEqual([
      { at: expect.any(Number), raw: 'not json{' },
      { at: expect.any(Number), raw: 'new' },
    ]);
  });

  it('keeps valid JSON that is not a list as one entry before the new one', () => {
    localStorage.setItem(storedName('quarantine'), '{"old":1}');
    quarantine(['new']);
    expect(stored()).toEqual([
      { at: expect.any(Number), raw: '{"old":1}' },
      { at: expect.any(Number), raw: 'new' },
    ]);
  });

  it('adds to a stored list', () => {
    localStorage.setItem(storedName('quarantine'), JSON.stringify([{ at: 1, raw: 'old' }]));
    quarantine(['new']);
    expect(stored()).toEqual([{ at: 1, raw: 'old' }, { at: expect.any(Number), raw: 'new' }]);
  });
});

describe('preset names', () => {
  it('picks a free name for an import', () => {
    expect(uniqueName(presetName('Kit'), [])).toBe('Kit');
    expect(uniqueName(presetName('Kit'), [presetName('Kit')])).toBe('Kit copy');
    expect(uniqueName(presetName('Kit'), [presetName('Kit'), presetName('Kit copy')])).toBe('Kit copy 2');
  });

  it('refuses blank text', () => {
    expect(parsePresetName('   ')).toBeNull();
  });

  it('keeps the spacing of text that is not blank', () => {
    expect(parsePresetName(' My kit ')).toBe(' My kit ');
  });
});
