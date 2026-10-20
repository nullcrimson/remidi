import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useRemapper } from '../../src/convert/useRemapper';
import { RUNTIME } from '../runtime';
import type { Drum, VoiceRow } from '../../src/core/midiremap';
import * as stub from '../stubs/wasm';
import { canon, engineId, note, typed } from '../typed';
import { shownTgtPick } from '../picks';

const ROWS = typed<VoiceRow[]>([
  { canon: 'KickMain', label: 'Kick', family: 'Kick', srcNotes: [24], defaultTgtNote: 36, outcome: { status: 'direct', tgtNote: 36 } },
]);

describe('useRemapper edit path', () => {
  beforeEach(() => {
    vi.mocked(stub.engine_drums).mockReturnValue(typed<Drum[]>([
      { note: 50, canon: 'tom.rack1.hit', label: 'Rack Tom 1', family: 'Toms' },
    ]));
    vi.mocked(stub.plan).mockReturnValue(ROWS);
  });

  it('opens a picker', async () => {
    const { result } = renderHook(() => useRemapper(RUNTIME));
    await waitFor(() => expect(result.current.catalog.status).toBe('ready'));
    act(() => result.current.chooseSrc(engineId('ggd_invasion')));
    act(() => result.current.chooseTgt(engineId('ezdrummer')));

    act(() => result.current.editor.openPick(canon('KickMain')));
    expect(result.current.editor.overlay).toEqual({
      kind: 'tgt',
      canon: 'KickMain',
      octIndex: 2,
      defaultNote: 36,
    });
  });

  it('re-plans with the picked target note and counts it as remapped', async () => {
    const { result } = renderHook(() => useRemapper(RUNTIME));
    await waitFor(() => expect(result.current.catalog.status).toBe('ready'));
    act(() => result.current.chooseSrc(engineId('ggd_invasion')));
    act(() => result.current.chooseTgt(engineId('ezdrummer')));

    act(() => result.current.editor.openPick(canon('KickMain')));
    act(() => result.current.editor.chooseNote(shownTgtPick(result.current.editor), note(50)));
    expect(result.current.editor.overlay).toBeNull();
    expect(result.current.editor.edits[canon('KickMain')]).toBe(50);
    expect(result.current.editor.remappedCount).toBe(1);
    expect(stub.plan).toHaveBeenCalledWith(
      'ggd_invasion',
      'ezdrummer',
      { tgt: [{ canon: 'KickMain', note: 50 }], src: [] },
      'nearest',
    );
  });

  it('lists the target engine drums', async () => {
    const { result } = renderHook(() => useRemapper(RUNTIME));
    await waitFor(() => expect(result.current.catalog.status).toBe('ready'));
    act(() => result.current.chooseSrc(engineId('ggd_invasion')));
    act(() => result.current.chooseTgt(engineId('ezdrummer')));
    expect(result.current.editor.targetDrums).toHaveLength(1);
  });

  it('sets an absolute target note from the drum list', async () => {
    const { result } = renderHook(() => useRemapper(RUNTIME));
    await waitFor(() => expect(result.current.catalog.status).toBe('ready'));
    act(() => result.current.chooseSrc(engineId('ggd_invasion')));
    act(() => result.current.chooseTgt(engineId('ezdrummer')));
    act(() => result.current.editor.openPick(canon('KickMain')));
    act(() => result.current.editor.chooseNote(shownTgtPick(result.current.editor), note(50)));
    expect(result.current.editor.overlay).toBeNull();
    expect(result.current.editor.edits[canon('KickMain')]).toBe(50);
  });

  it('drops the edit when the target is set back to its default note', async () => {
    const { result } = renderHook(() => useRemapper(RUNTIME));
    await waitFor(() => expect(result.current.catalog.status).toBe('ready'));
    act(() => result.current.chooseSrc(engineId('ggd_invasion')));
    act(() => result.current.chooseTgt(engineId('ezdrummer')));

    act(() => result.current.editor.openPick(canon('KickMain')));
    act(() => result.current.editor.chooseNote(shownTgtPick(result.current.editor), note(50)));
    expect(result.current.editor.edits[canon('KickMain')]).toBe(50);

    act(() => result.current.editor.openPick(canon('KickMain')));
    act(() => result.current.editor.chooseNote(shownTgtPick(result.current.editor), note(36)));
    expect(result.current.editor.edits).toEqual({});
  });

  it('clears edits when the target engine changes', async () => {
    const { result } = renderHook(() => useRemapper(RUNTIME));
    await waitFor(() => expect(result.current.catalog.status).toBe('ready'));
    act(() => result.current.chooseSrc(engineId('ggd_invasion')));
    act(() => result.current.chooseTgt(engineId('ezdrummer')));
    act(() => result.current.editor.openPick(canon('KickMain')));
    act(() => result.current.editor.chooseNote(shownTgtPick(result.current.editor), note(38)));
    expect(Object.keys(result.current.editor.edits)).toHaveLength(1);
    act(() => result.current.chooseTgt(engineId('ggd_invasion')));
    expect(result.current.editor.edits).toEqual({});
  });

  it('takes the reset note from the row default, not the edited target', async () => {
    vi.mocked(stub.plan).mockReturnValue(typed<VoiceRow[]>([
      { canon: 'KickMain', label: 'Kick', family: 'Kick', srcNotes: [24], defaultTgtNote: 36, outcome: { status: 'direct', tgtNote: 50 } },
    ]));
    const { result } = renderHook(() => useRemapper(RUNTIME));
    await waitFor(() => expect(result.current.catalog.status).toBe('ready'));
    act(() => result.current.chooseSrc(engineId('ggd_invasion')));
    act(() => result.current.chooseTgt(engineId('ezdrummer')));
    act(() => result.current.editor.openPick(canon('KickMain')));
    expect(result.current.editor.overlay).toMatchObject({ defaultNote: 36 });
    expect(result.current.editor.overlay).toMatchObject({ octIndex: 3 });
  });

  async function withSilentRows() {
    vi.mocked(stub.plan).mockReturnValue(typed<VoiceRow[]>([
      { canon: 'KickMain', label: 'Kick', family: 'Kick', srcNotes: [], defaultTgtNote: 36, outcome: { status: 'direct', tgtNote: 36 } },
      { canon: 'China', label: 'China', family: 'Cymbals', srcNotes: [], defaultTgtNote: null, outcome: { status: 'dropped', otherDrum: false } },
    ]));
    const { result } = renderHook(() => useRemapper(RUNTIME));
    await waitFor(() => expect(result.current.catalog.status).toBe('ready'));
    act(() => result.current.chooseSrc(engineId('ggd_invasion')));
    act(() => result.current.chooseTgt(engineId('ezdrummer')));
    return result;
  }

  it('leaves a silent row out of the counts', async () => {
    const result = await withSilentRows();
    expect(result.current.editor.remappedCount).toBe(0);
  });

  it('opens a source picker on a silent row', async () => {
    const result = await withSilentRows();
    act(() => result.current.editor.openSrcPick(canon('KickMain')));
    expect(result.current.editor.overlay).toMatchObject({ octIndex: 2 });
  });

  it('opens a source picker on a silent row with no target note', async () => {
    const result = await withSilentRows();
    act(() => result.current.editor.openSrcPick(canon('China')));
    expect(result.current.editor.overlay).toMatchObject({ canon: 'China' });
  });

  it('counts a row as remapped only when its shown source note moves', async () => {
    vi.mocked(stub.plan).mockReturnValue(typed<VoiceRow[]>([
      { canon: 'KickMain', label: 'Kick', family: 'Kick', srcNotes: [36, 35], defaultTgtNote: 36, outcome: { status: 'direct', tgtNote: 36 } },
      { canon: 'Snare', label: 'Snare', family: 'Snare', srcNotes: [26], defaultTgtNote: 38, outcome: { status: 'direct', tgtNote: 38 } },
    ]));
    const { result } = renderHook(() => useRemapper(RUNTIME));
    await waitFor(() => expect(result.current.catalog.status).toBe('ready'));
    act(() => result.current.chooseSrc(engineId('ggd_invasion')));
    act(() => result.current.chooseTgt(engineId('ezdrummer')));
    expect(result.current.editor.remappedCount).toBe(1);
  });
});
