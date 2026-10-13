import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useRemapper } from '../../src/convert/useRemapper';
import { RUNTIME } from '../runtime';
import type { Drum, VoiceRow } from '../../src/core/midiremap';
import * as stub from '../stubs/wasm';
import { canon, note, typed } from '../typed';

const ROWS = typed<VoiceRow[]>([
  { canon: 'KickMain', label: 'Kick', srcNotes: [24], defaultTgtNote: 36, outcome: { status: 'direct', tgtNote: 36 } },
]);

describe('useRemapper edit path', () => {
  beforeEach(() => {
    vi.mocked(stub.engine_drums).mockReturnValue(typed<Drum[]>([
      { note: 50, canon: 'tom.rack1.hit', label: 'Rack Tom 1', family: 'Toms' },
    ]));
    vi.mocked(stub.plan).mockReturnValue(ROWS);
  });

  it('opens a picker, sets octave, and picks a target note', async () => {
    const { result } = renderHook(() => useRemapper(RUNTIME));
    await waitFor(() => expect(result.current.status).toBe('ready'));
    act(() => result.current.chooseSrc('ggd_invasion'));
    act(() => result.current.chooseTgt('ezdrummer'));

    act(() => result.current.editor.openPick(canon('KickMain')));
    expect(result.current.editor.pick).toEqual({
      canon: 'KickMain',
      octIndex: 2,
      side: 'tgt',
      defaultNote: 36,
      prevNote: null,
    });

    act(() => result.current.editor.setPickOct(3));
    act(() => result.current.editor.chooseNote(note(50)));
    expect(result.current.editor.pick).toBeNull();
    expect(result.current.editor.edits[canon('KickMain')]).toBe(50);
    expect(result.current.editor.remappedCount).toBe(1);
    expect(stub.plan).toHaveBeenCalledWith(
      'ggd_invasion',
      'ezdrummer',
      { tgt: [{ canon: 'KickMain', note: 50 }], src: [] },
      'nearest',
    );
  });

  it('sets an absolute target note from the drum list', async () => {
    const { result } = renderHook(() => useRemapper(RUNTIME));
    await waitFor(() => expect(result.current.status).toBe('ready'));
    act(() => result.current.chooseSrc('ggd_invasion'));
    act(() => result.current.chooseTgt('ezdrummer'));
    expect(result.current.editor.targetDrums).toHaveLength(1);
    act(() => result.current.editor.openPick(canon('KickMain')));
    act(() => result.current.editor.chooseNote(note(50)));
    expect(result.current.editor.pick).toBeNull();
    expect(result.current.editor.edits[canon('KickMain')]).toBe(50);
  });

  it('drops the edit when the target is set back to its default note', async () => {
    const { result } = renderHook(() => useRemapper(RUNTIME));
    await waitFor(() => expect(result.current.status).toBe('ready'));
    act(() => result.current.chooseSrc('ggd_invasion'));
    act(() => result.current.chooseTgt('ezdrummer'));

    act(() => result.current.editor.openPick(canon('KickMain')));
    act(() => result.current.editor.chooseNote(note(50)));
    expect(result.current.editor.edits[canon('KickMain')]).toBe(50);

    act(() => result.current.editor.openPick(canon('KickMain')));
    act(() => result.current.editor.chooseNote(note(36)));
    expect(result.current.editor.edits).toEqual({});
  });

  it('clears edits when the target engine changes', async () => {
    const { result } = renderHook(() => useRemapper(RUNTIME));
    await waitFor(() => expect(result.current.status).toBe('ready'));
    act(() => result.current.chooseSrc('ggd_invasion'));
    act(() => result.current.chooseTgt('ezdrummer'));
    act(() => result.current.editor.openPick(canon('KickMain')));
    act(() => result.current.editor.chooseNote(note(38)));
    expect(Object.keys(result.current.editor.edits)).toHaveLength(1);
    act(() => result.current.chooseTgt('ggd_invasion'));
    expect(result.current.editor.edits).toEqual({});
  });

  it('takes the reset note from the row default, not the edited target', async () => {
    vi.mocked(stub.plan).mockReturnValue(typed<VoiceRow[]>([
      { canon: 'KickMain', label: 'Kick', srcNotes: [24], defaultTgtNote: 36, outcome: { status: 'direct', tgtNote: 50 } },
    ]));
    const { result } = renderHook(() => useRemapper(RUNTIME));
    await waitFor(() => expect(result.current.status).toBe('ready'));
    act(() => result.current.chooseSrc('ggd_invasion'));
    act(() => result.current.chooseTgt('ezdrummer'));
    act(() => result.current.editor.openPick(canon('KickMain')));
    expect(result.current.editor.pick?.defaultNote).toBe(36);
    expect(result.current.editor.pick?.octIndex).toBe(3);
  });

  it('opens pickers on a silent row and leaves it out of the counts', async () => {
    vi.mocked(stub.plan).mockReturnValue(typed<VoiceRow[]>([
      { canon: 'KickMain', label: 'Kick', srcNotes: [], defaultTgtNote: 36, outcome: { status: 'direct', tgtNote: 36 } },
      { canon: 'China', label: 'China', srcNotes: [], defaultTgtNote: null, outcome: { status: 'dropped', otherDrum: false } },
    ]));
    const { result } = renderHook(() => useRemapper(RUNTIME));
    await waitFor(() => expect(result.current.status).toBe('ready'));
    act(() => result.current.chooseSrc('ggd_invasion'));
    act(() => result.current.chooseTgt('ezdrummer'));
    expect(result.current.editor.remappedCount).toBe(0);
    act(() => result.current.editor.openSrcPick(canon('KickMain')));
    expect(result.current.editor.pick?.octIndex).toBe(2);
    act(() => result.current.editor.openSrcPick(canon('China')));
    expect(result.current.editor.pick?.canon).toBe('China');
  });

  it('counts a row as remapped only when its shown source note moves', async () => {
    vi.mocked(stub.plan).mockReturnValue(typed<VoiceRow[]>([
      { canon: 'KickMain', label: 'Kick', srcNotes: [36, 35], defaultTgtNote: 36, outcome: { status: 'direct', tgtNote: 36 } },
      { canon: 'Snare', label: 'Snare', srcNotes: [26], defaultTgtNote: 38, outcome: { status: 'direct', tgtNote: 38 } },
    ]));
    const { result } = renderHook(() => useRemapper(RUNTIME));
    await waitFor(() => expect(result.current.status).toBe('ready'));
    act(() => result.current.chooseSrc('ggd_invasion'));
    act(() => result.current.chooseTgt('ezdrummer'));
    expect(result.current.editor.remappedCount).toBe(1);
  });
});
