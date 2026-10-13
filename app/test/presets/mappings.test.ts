import { beforeEach, describe, expect, it, vi } from 'vitest';
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

  it('returns empty for corrupt JSON', () => {
    expect(parseMappings('{')).toEqual([]);
  });

  it('returns empty for JSON that is not an array', () => {
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

  it('drops entries whose edits contain a note above 127', () => {
    const raw = JSON.stringify([{ ...sample, edits: { 'kick.main': 200 } }]);
    expect(parseMappings(raw)).toEqual([]);
  });

  it('drops entries whose edits contain a negative note', () => {
    const raw = JSON.stringify([{ ...sample, edits: { 'kick.main': -1 } }]);
    expect(parseMappings(raw)).toEqual([]);
  });

  it('drops entries whose edits contain a note that is not a whole number', () => {
    const raw = JSON.stringify([{ ...sample, edits: { 'kick.main': 1.5 } }]);
    expect(parseMappings(raw)).toEqual([]);
  });

  it('drops entries whose edits contain a note that is not a number', () => {
    const raw = JSON.stringify([{ ...sample, edits: { 'kick.main': 'x' } }]);
    expect(parseMappings(raw)).toEqual([]);
  });

  it('drops entries with non-object edits', () => {
    expect(parseMappings(JSON.stringify([{ ...sample, edits: [] }]))).toEqual([]);
    expect(parseMappings(JSON.stringify([{ ...sample, edits: null }]))).toEqual([]);
  });
});

describe('sortByRecent', () => {
  const older = { ...sample, id: 'old', updatedAt: 1 };
  const newer = { ...sample, id: 'new', updatedAt: 9 };

  it('orders by updatedAt descending', () => {
    const sorted = sortByRecent([older, newer]);
    expect(sorted.map((m) => m.id)).toEqual(['new', 'old']);
  });

  it('does not mutate its input', () => {
    const input = [older, newer];
    sortByRecent(input);
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
  });

  it('writes the versioned envelope', () => {
    expect(JSON.parse(serializeMappings([sample]))).toEqual({ version: 1, items: [sample] });
  });

  it('keeps data of a newer version whole instead of dropping it', () => {
    const future = JSON.stringify({ version: 2, items: [sample] });
    expect(readStore(future)).toEqual({ items: [], invalid: [JSON.parse(future)] });
  });

  it('keeps text it cannot parse whole instead of dropping it', () => {
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

  it('leaves the stored list as it is when the browser refuses to read it', () => {
    localStorage.setItem(storedName('quarantine'), JSON.stringify([{ at: 1, raw: 'old' }]));
    const get = vi.spyOn(localStorage, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    quarantine(['new']);
    get.mockRestore();
    expect(stored()).toEqual([{ at: 1, raw: 'old' }]);
  });

  it('reports the entries unsaved when the browser refuses to read the stored list', () => {
    const get = vi.spyOn(localStorage, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    const saved = quarantine(['new']);
    get.mockRestore();
    expect(saved).toBe(false);
  });
});

describe('preset names', () => {
  it('keeps a free name for an import', () => {
    expect(uniqueName(presetName('Kit'), [])).toBe('Kit');
  });

  it('adds copy to a taken name for an import', () => {
    expect(uniqueName(presetName('Kit'), [presetName('Kit')])).toBe('Kit copy');
  });

  it('numbers the copy when the copy name is taken too', () => {
    expect(uniqueName(presetName('Kit'), [presetName('Kit'), presetName('Kit copy')])).toBe('Kit copy 2');
  });

  it('refuses blank text', () => {
    expect(parsePresetName('   ')).toBeNull();
  });

  it('keeps the spacing of text that is not blank', () => {
    expect(parsePresetName(' My kit ')).toBe(' My kit ');
  });
});
