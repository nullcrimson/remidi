import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/lib/midiremap', () => ({
  ready: () => Promise.resolve(),
  engines: () => [
    { id: 'ggd_invasion', name: 'GGD Invasion' },
    { id: 'ezdrummer', name: 'EZdrummer' },
  ],
  engineDrums: () => [],
  engineNotes: () => [],
  canonCatalog: () => [],
  plan: () => [],
  remap: () => ({
    bytes: new Uint8Array([1]),
    report: { unmappedSource: {}, fallbackUsed: {}, dropped: {} },
  }),
}));

import { useRemapper } from '../src/hooks/useRemapper';

afterEach(() => window.history.replaceState({}, '', '/'));

describe('useRemapper URL preselection', () => {
  it('preselects source and target from the query string', async () => {
    window.history.replaceState({}, '', '/?from=ggd_invasion&to=ezdrummer');
    const { result } = renderHook(() => useRemapper());
    await waitFor(() => expect(result.current.status).toBe('ready'));
    await waitFor(() => expect(result.current.src).toBe('ggd_invasion'));
    expect(result.current.tgt).toBe('ezdrummer');
  });

  it('leaves the selection empty for unknown ids', async () => {
    window.history.replaceState({}, '', '/?from=nope');
    const { result } = renderHook(() => useRemapper());
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.src).toBe('');
    expect(result.current.tgt).toBe('');
  });
});
