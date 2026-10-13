import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { usePresetActions, type PresetSetup } from '../../src/presets/usePresetActions';
import type { SavedMappings } from '../../src/presets/useSavedMappings';
import type { SavedMapping } from '../../src/presets/mappings';
import { ENGLISH } from '../../src/locale/i18n';
import type { NoticeLine } from '../../src/core/notice';
import { presetName, typed } from '../typed';

const { t } = ENGLISH;

const kit = typed<SavedMapping>({
  id: 'p1',
  name: presetName('My kit'),
  src: 'ggd_invasion',
  tgt: 'ezdrummer',
  edits: { 'kick.main': 35 },
  srcEdits: { 24: 'snare1.hit' },
  updatedAt: 1,
});

function arrange(skipped = 0, mappings = [kit]) {
  const saved: SavedMappings = {
    mappings,
    atCap: false,
    save: vi.fn(() => 'new-id'),
    update: vi.fn(),
    rename: vi.fn(),
    remove: vi.fn(),
    unsaved: false,
  };
  const setup = typed<PresetSetup>({
    edits: { 'china.1.hit': 52 },
    srcEdits: { 60: null },
    loadMapping: vi.fn(() => skipped),
    setPreset: vi.fn(),
    openEditor: vi.fn(),
  });
  const notify = vi.fn();
  const { result } = renderHook(() => usePresetActions(setup, saved, notify));
  return { actions: result.current, saved, setup, notify };
}

describe('usePresetActions', () => {
  it('saves the open pair and its edits as a new preset and marks it open', () => {
    const { actions, saved, setup } = arrange();
    actions.save({ src: 'ggd_invasion', tgt: 'ezdrummer' }, presetName('Mine'));
    expect(saved.save).toHaveBeenCalledWith({
      name: 'Mine',
      src: 'ggd_invasion',
      tgt: 'ezdrummer',
      edits: { 'china.1.hit': 52 },
      srcEdits: { 60: null },
    });
    expect(setup.setPreset).toHaveBeenCalledWith('new-id');
  });

  it('updates a preset with the current edits under its new name', () => {
    const { actions, saved } = arrange();
    actions.update('p1', presetName('Renamed'));
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

  it('numbers the second copy of a preset', () => {
    const { actions, saved } = arrange(0, [kit, { ...kit, id: 'p2', name: presetName('My kit copy') }]);
    actions.duplicate(kit);
    expect(vi.mocked(saved.save).mock.lastCall?.[0].name).toBe('My kit copy 2');
  });

  it('loads a preset, says how many edits it skipped, and opens the editor on edit', () => {
    const { actions, setup, notify } = arrange(2);
    actions.load(kit);
    expect(setup.loadMapping).toHaveBeenCalledWith(kit);
    expect(notify.mock.lastCall?.[0].map((l: NoticeLine) => ('message' in l ? t(l.message) : l.failed))).toEqual([
      "2 edits in 'My kit' use drums this version doesn't know; skipped.",
    ]);
    expect(setup.openEditor).not.toHaveBeenCalled();
    actions.edit(kit);
    expect(setup.openEditor).toHaveBeenCalledOnce();
  });

  it('finds the open preset', () => {
    const { actions } = arrange();
    expect(actions.open('p1')).toBe(kit);
    expect(actions.open(null)).toBeUndefined();
  });
});
