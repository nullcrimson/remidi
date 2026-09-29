import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { usePresetActions, type PresetSetup } from '../src/hooks/usePresetActions';
import type { SavedMappings } from '../src/hooks/useSavedMappings';
import type { SavedMapping } from '../src/lib/mappings';
import { t } from '../src/i18n';
import type { NoticeLine } from '../src/lib/notice';

const kit: SavedMapping = {
  id: 'p1',
  name: 'My kit',
  src: 'ggd_invasion',
  tgt: 'ezdrummer',
  edits: { 'kick.main': 35 },
  srcEdits: { 24: 'snare1.hit' },
  updatedAt: 1,
};

function arrange(skipped = 0) {
  const saved: SavedMappings = {
    mappings: [kit],
    atCap: false,
    save: vi.fn(() => 'new-id'),
    update: vi.fn(),
    rename: vi.fn(),
    remove: vi.fn(),
  };
  const pair: PresetSetup = {
    src: 'ggd_invasion',
    tgt: 'ezdrummer',
    edits: { 'china.1.hit': 52 },
    srcEdits: { 60: null },
    loadMapping: vi.fn(() => skipped),
    setPreset: vi.fn(),
    setView: vi.fn(),
  };
  const notify = vi.fn();
  const { result } = renderHook(() => usePresetActions(pair, saved, notify));
  return { actions: result.current, saved, pair, notify };
}

describe('usePresetActions', () => {
  it('saves the open pair and its edits as a new preset and marks it open', () => {
    const { actions, saved, pair } = arrange();
    actions.save('Mine');
    expect(saved.save).toHaveBeenCalledWith({
      name: 'Mine',
      src: 'ggd_invasion',
      tgt: 'ezdrummer',
      edits: { 'china.1.hit': 52 },
      srcEdits: { 60: null },
    });
    expect(pair.setPreset).toHaveBeenCalledWith('new-id');
  });

  it('updates a preset with the current edits under its new name', () => {
    const { actions, saved } = arrange();
    actions.update('p1', 'Renamed');
    expect(saved.update).toHaveBeenCalledWith('p1', {
      name: 'Renamed',
      edits: { 'china.1.hit': 52 },
      srcEdits: { 60: null },
    });
  });

  it('duplicates a preset as a copy', () => {
    const { actions, saved } = arrange();
    actions.duplicate(kit);
    expect(saved.save).toHaveBeenCalledWith({
      name: 'My kit copy',
      src: kit.src,
      tgt: kit.tgt,
      edits: kit.edits,
      srcEdits: kit.srcEdits,
    });
  });

  it('loads a preset, says how many edits it skipped, and opens the editor on edit', () => {
    const { actions, pair, notify } = arrange(2);
    actions.load(kit);
    expect(pair.loadMapping).toHaveBeenCalledWith(kit);
    expect(notify.mock.lastCall?.[0].map((l: NoticeLine) => ('message' in l ? t(l.message) : l.failed))).toEqual([
      "2 edits in 'My kit' use drums this version doesn't know; skipped.",
    ]);
    expect(pair.setView).not.toHaveBeenCalled();
    actions.edit(kit);
    expect(pair.setView).toHaveBeenCalledWith('edit');
  });

  it('finds the open preset', () => {
    const { actions } = arrange();
    expect(actions.open('p1')).toBe(kit);
    expect(actions.open(null)).toBeUndefined();
  });
});
