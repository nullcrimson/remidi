import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const planMock = vi.fn();
vi.mock('../src/lib/midiremap', () => ({
  ready: () => Promise.resolve(),
  engines: () => [
    { id: 'ggd_invasion', name: 'GGD Invasion' },
    { id: 'ezdrummer', name: 'EZdrummer' },
  ],
  plan: (...a: unknown[]) => planMock(...a),
  remap: () => ({
    bytes: new Uint8Array([1]),
    report: { unmapped_source: {}, fallback_used: {}, dropped: {} },
  }),
}));

import { useRemapper } from '../src/hooks/useRemapper';

const ROWS = [{ canon: 'KickMain', label: 'Kick', srcNote: 24, tgtNote: 36, status: 'direct' }];

describe('useRemapper edit path', () => {
  beforeEach(() => {
    planMock.mockReset().mockReturnValue(ROWS);
  });

  it('opens a picker, sets octave, and picks a target note', async () => {
    const { result } = renderHook(() => useRemapper());
    await waitFor(() => expect(result.current.status).toBe('ready'));
    act(() => result.current.chooseSrc('ggd_invasion'));
    act(() => result.current.chooseTgt('ezdrummer'));

    act(() => result.current.openPick('KickMain'));
    expect(result.current.pick).toEqual({ canon: 'KickMain', octIndex: 2 });

    act(() => result.current.setPickOct(3));
    act(() => result.current.chooseNote(2));
    expect(result.current.pick).toBeNull();
    expect(result.current.edits.KickMain).toBe(50);
    expect(result.current.remappedCount).toBe(1);
  });

  it('clears edits when the target engine changes', async () => {
    const { result } = renderHook(() => useRemapper());
    await waitFor(() => expect(result.current.status).toBe('ready'));
    act(() => result.current.chooseSrc('ggd_invasion'));
    act(() => result.current.chooseTgt('ezdrummer'));
    act(() => result.current.openPick('KickMain'));
    act(() => result.current.chooseNote(0));
    expect(Object.keys(result.current.edits)).toHaveLength(1);
    act(() => result.current.chooseTgt('ggd_invasion'));
    expect(result.current.edits).toEqual({});
  });
});
