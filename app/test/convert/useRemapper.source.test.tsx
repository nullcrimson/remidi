import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useRemapper } from '../../src/convert/useRemapper';
import { RUNTIME } from '../runtime';
import type { VoiceRow } from '../../src/core/midiremap';
import type { SrcEdits } from '../../src/core/overrides';
import * as stub from '../stubs/wasm';
import { canon, note, typed } from '../typed';
import { shownSrcPick } from '../picks';

beforeEach(() => {
  vi.mocked(stub.engine_drums).mockReturnValue([]);
  vi.mocked(stub.plan).mockReturnValue(typed<VoiceRow[]>([
    { canon: 'kick.main', label: 'Kick', family: 'Kick', srcNotes: [24], defaultTgtNote: 36, outcome: { status: 'direct', tgtNote: 36 } },
  ]));
});

describe('useRemapper source edits', () => {
  it('sets and clears a source-note canon override', async () => {
    const { result } = renderHook(() => useRemapper(RUNTIME));
    await waitFor(() => expect(result.current.catalog.status).toBe('ready'));

    act(() => result.current.editor.setSrcCanon(note(60), canon('china.1.hit')));
    expect(result.current.editor.srcEdits).toEqual({ 60: 'china.1.hit' });

    act(() => result.current.editor.clearSrcCanon(note(60)));
    expect(result.current.editor.srcEdits).toEqual({});
  });

  it('clears source edits when the engine changes', async () => {
    const { result } = renderHook(() => useRemapper(RUNTIME));
    await waitFor(() => expect(result.current.catalog.status).toBe('ready'));
    act(() => result.current.chooseSrc('ggd_invasion'));
    act(() => result.current.editor.setSrcCanon(note(60), canon('china.1.hit')));
    expect(result.current.editor.srcEdits).toEqual({ 60: 'china.1.hit' });
    act(() => result.current.chooseTgt('ezdrummer'));
    expect(result.current.editor.srcEdits).toEqual({});
  });

  it('loadMapping applies source edits atomically', async () => {
    const { result } = renderHook(() => useRemapper(RUNTIME));
    await waitFor(() => expect(result.current.catalog.status).toBe('ready'));
    act(() =>
      result.current.loadMapping({
        src: 'ggd_invasion',
        tgt: 'ezdrummer',
        edits: {},
        srcEdits: typed<SrcEdits>({ 60: 'china.1.hit' }),
      }),
    );
    expect(result.current.editor.srcEdits).toEqual({ 60: 'china.1.hit' });
  });

  it('replaces the earlier picked note when a row pick is corrected', async () => {
    const { result } = renderHook(() => useRemapper(RUNTIME));
    await waitFor(() => expect(result.current.catalog.status).toBe('ready'));
    act(() => result.current.chooseSrc('ggd_invasion'));
    act(() => result.current.chooseTgt('ezdrummer'));
    act(() => result.current.editor.setSrcCanon(note(70), canon('snare1.hit')));

    act(() => result.current.editor.openSrcPick(canon('kick.main')));
    act(() => result.current.editor.chooseSrcNote(shownSrcPick(result.current.editor), note(25)));
    act(() => result.current.editor.openSrcPick(canon('kick.main')));
    act(() => result.current.editor.chooseSrcNote(shownSrcPick(result.current.editor), note(27)));

    expect(result.current.editor.srcEdits).toEqual({ 24: null, 27: 'kick.main', 70: 'snare1.hit' });
  });
});
