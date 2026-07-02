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

describe('useRemapper source edits', () => {
  it('sets and clears a source-note canon override', async () => {
    const { result } = renderHook(() => useRemapper());
    await waitFor(() => expect(result.current.status).toBe('ready'));

    act(() => result.current.editor.setSrcCanon(60, 'china.1.hit'));
    expect(result.current.editor.srcEdits).toEqual({ 60: 'china.1.hit' });

    act(() => result.current.editor.clearSrcCanon(60));
    expect(result.current.editor.srcEdits).toEqual({});
  });

  it('clears source edits when the engine changes', async () => {
    const { result } = renderHook(() => useRemapper());
    await waitFor(() => expect(result.current.status).toBe('ready'));
    act(() => result.current.chooseSrc('ggd_invasion'));
    act(() => result.current.editor.setSrcCanon(60, 'china.1.hit'));
    expect(result.current.editor.srcEdits).toEqual({ 60: 'china.1.hit' });
    act(() => result.current.chooseTgt('ezdrummer'));
    expect(result.current.editor.srcEdits).toEqual({});
  });

  it('loadMapping applies source edits atomically', async () => {
    const { result } = renderHook(() => useRemapper());
    await waitFor(() => expect(result.current.status).toBe('ready'));
    act(() =>
      result.current.loadMapping({
        src: 'ggd_invasion',
        tgt: 'ezdrummer',
        edits: {},
        srcEdits: { 60: 'china.1.hit' },
      }),
    );
    expect(result.current.editor.srcEdits).toEqual({ 60: 'china.1.hit' });
  });
});
