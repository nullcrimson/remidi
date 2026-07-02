import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../src/lib/midiremap', () => ({
  ready: () => Promise.resolve(),
  engines: () => [
    { id: 'ggd_invasion', name: 'GGD Invasion' },
    { id: 'ezdrummer', name: 'EZdrummer' },
  ],
  engineDrums: () => [],
  plan: () => [{ canon: 'kick.main', label: 'Kick', srcNote: 24, tgtNote: 36, status: 'direct' }],
  remap: () => ({
    bytes: new Uint8Array([1]),
    report: { unmappedSource: {}, fallbackUsed: {}, dropped: {} },
  }),
}));

import { useRemapper } from '../src/hooks/useRemapper';

describe('useRemapper loadMapping', () => {
  it('sets src, tgt and edits atomically without the engine reset wiping edits', async () => {
    const { result } = renderHook(() => useRemapper());
    await waitFor(() => expect(result.current.status).toBe('ready'));

    act(() =>
      result.current.loadMapping({
        src: 'ggd_invasion',
        tgt: 'ezdrummer',
        edits: { 'kick.main': 40 },
      }),
    );

    expect(result.current.src).toBe('ggd_invasion');
    expect(result.current.tgt).toBe('ezdrummer');
    expect(result.current.editor.edits).toEqual({ 'kick.main': 40 });
    expect(result.current.view).toBe('convert');
  });

  it('replaces prior edits and returns to the convert view from edit', async () => {
    const { result } = renderHook(() => useRemapper());
    await waitFor(() => expect(result.current.status).toBe('ready'));

    act(() => result.current.chooseSrc('ggd_invasion'));
    act(() => result.current.chooseTgt('ezdrummer'));
    act(() => result.current.editor.openPick('kick.main'));
    act(() => result.current.editor.chooseNoteAbsolute(45));
    act(() => result.current.setView('edit'));
    expect(result.current.editor.edits).toEqual({ 'kick.main': 45 });

    act(() =>
      result.current.loadMapping({ src: 'ezdrummer', tgt: 'ggd_invasion', edits: { 'snare1.hit': 38 } }),
    );

    expect(result.current.src).toBe('ezdrummer');
    expect(result.current.tgt).toBe('ggd_invasion');
    expect(result.current.editor.edits).toEqual({ 'snare1.hit': 38 });
    expect(result.current.view).toBe('convert');
    expect(result.current.editor.pick).toBeNull();
  });
});
