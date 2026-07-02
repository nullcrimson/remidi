import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useSavedMappings } from '../src/hooks/useSavedMappings';
import { MAPPINGS_CAP, MAPPINGS_KEY, parseMappings } from '../src/lib/mappings';

const base = {
  name: 'GGD→EZ',
  src: 'ggd_invasion',
  tgt: 'ezdrummer',
  edits: { 'kick.main': 36 },
  srcEdits: { 60: 'china.1.hit' },
};

function stored() {
  return parseMappings(localStorage.getItem(MAPPINGS_KEY));
}

describe('useSavedMappings', () => {
  beforeEach(() => localStorage.clear());

  it('starts empty', () => {
    const { result } = renderHook(() => useSavedMappings());
    expect(result.current.mappings).toEqual([]);
    expect(result.current.atCap).toBe(false);
  });

  it('saves a mapping and persists it', () => {
    const { result } = renderHook(() => useSavedMappings());
    act(() => result.current.save(base));
    expect(result.current.mappings).toHaveLength(1);
    expect(result.current.mappings[0]).toMatchObject(base);
    expect(result.current.mappings[0].id).toBeTruthy();
    expect(stored()).toHaveLength(1);
  });

  it('finds an existing preset by src/tgt pair', () => {
    const { result } = renderHook(() => useSavedMappings());
    act(() => result.current.save(base));
    expect(result.current.findPair('ggd_invasion', 'ezdrummer')?.name).toBe('GGD→EZ');
    expect(result.current.findPair('ggd_invasion', 'superior_drummer3')).toBeUndefined();
  });

  it('updates name and edits of an existing preset', () => {
    const { result } = renderHook(() => useSavedMappings());
    act(() => result.current.save(base));
    const id = result.current.mappings[0].id;
    act(() => result.current.update(id, { name: 'renamed', edits: { 'snare1.hit': 40 } }));
    expect(result.current.mappings[0]).toMatchObject({ name: 'renamed', edits: { 'snare1.hit': 40 } });
  });

  it('renames a preset without reordering or bumping recency', () => {
    const { result } = renderHook(() => useSavedMappings());
    act(() => result.current.save({ ...base, name: 'first' }));
    act(() => result.current.save({ ...base, name: 'second' }));
    const target = result.current.mappings[1];
    act(() => result.current.rename(target.id, 'renamed'));
    expect(result.current.mappings[1].id).toBe(target.id);
    expect(result.current.mappings[1].name).toBe('renamed');
    expect(result.current.mappings[1].updatedAt).toBe(target.updatedAt);
  });

  it('removes a preset', () => {
    const { result } = renderHook(() => useSavedMappings());
    act(() => result.current.save(base));
    const id = result.current.mappings[0].id;
    act(() => result.current.remove(id));
    expect(result.current.mappings).toEqual([]);
    expect(stored()).toEqual([]);
  });

  it('reloads persisted mappings in a fresh hook', () => {
    const first = renderHook(() => useSavedMappings());
    act(() => first.result.current.save(base));
    const second = renderHook(() => useSavedMappings());
    expect(second.result.current.mappings[0]).toMatchObject(base);
  });

  it('blocks saving beyond the cap', () => {
    const { result } = renderHook(() => useSavedMappings());
    act(() => {
      for (let i = 0; i < MAPPINGS_CAP; i++) result.current.save({ ...base, name: `m${i}` });
    });
    expect(result.current.mappings).toHaveLength(MAPPINGS_CAP);
    expect(result.current.atCap).toBe(true);
    act(() => result.current.save({ ...base, name: 'overflow' }));
    expect(result.current.mappings).toHaveLength(MAPPINGS_CAP);
    expect(result.current.mappings.some((m) => m.name === 'overflow')).toBe(false);
  });
});
