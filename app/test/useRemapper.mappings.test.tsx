import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useRemapper } from '../src/hooks/useRemapper';
import { RUNTIME } from './runtime';
import type { VoiceRow } from '../src/lib/midiremap';
import type { StoredEdits } from '../src/lib/overrides';
import * as stub from './stubs/wasm';
import { canon, note, typed } from './typed';

beforeEach(() => {
  vi.mocked(stub.engine_drums).mockReturnValue([]);
  vi.mocked(stub.plan).mockReturnValue(typed<VoiceRow[]>([
    { canon: 'kick.main', label: 'Kick', srcNotes: [24], defaultTgtNote: 36, outcome: { status: 'direct', tgtNote: 36 } },
  ]));
});

describe('useRemapper loadMapping', () => {
  it('sets src, tgt and edits atomically without the engine reset wiping edits', async () => {
    const { result } = renderHook(() => useRemapper(RUNTIME));
    await waitFor(() => expect(result.current.status).toBe('ready'));

    act(() =>
      result.current.loadMapping({
        src: 'ggd_invasion',
        tgt: 'ezdrummer',
        edits: typed<StoredEdits['edits']>({ 'kick.main': 40 }),
        srcEdits: {},
      }),
    );

    expect(result.current.src).toBe('ggd_invasion');
    expect(result.current.tgt).toBe('ezdrummer');
    expect(result.current.editor.edits).toEqual({ 'kick.main': 40 });
    expect(result.current.view).toBe('convert');
  });

  it('replaces prior edits and returns to the convert view from edit', async () => {
    const { result } = renderHook(() => useRemapper(RUNTIME));
    await waitFor(() => expect(result.current.status).toBe('ready'));

    act(() => result.current.chooseSrc('ggd_invasion'));
    act(() => result.current.chooseTgt('ezdrummer'));
    act(() => result.current.editor.openPick(canon('kick.main')));
    act(() => result.current.editor.chooseNote(note(45)));
    act(() => result.current.setView('edit'));
    expect(result.current.editor.edits).toEqual({ 'kick.main': 45 });

    act(() =>
      result.current.loadMapping({ src: 'ezdrummer', tgt: 'ggd_invasion', edits: typed<StoredEdits['edits']>({ 'snare1.hit': 38 }), srcEdits: {} }),
    );

    expect(result.current.src).toBe('ezdrummer');
    expect(result.current.tgt).toBe('ggd_invasion');
    expect(result.current.editor.edits).toEqual({ 'snare1.hit': 38 });
    expect(result.current.view).toBe('convert');
    expect(result.current.editor.pick).toBeNull();
  });
});
