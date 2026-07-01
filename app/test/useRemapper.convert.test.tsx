import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const remapMock = vi.fn();
const planMock = vi.fn();
vi.mock('../src/lib/midiremap', () => ({
  ready: () => Promise.resolve(),
  engines: () => [
    { id: 'ggd_invasion', name: 'GGD Invasion' },
    { id: 'ezdrummer', name: 'EZdrummer' },
  ],
  plan: (...a: unknown[]) => planMock(...a),
  remap: (...a: unknown[]) => remapMock(...a),
}));

import { useRemapper } from '../src/hooks/useRemapper';

const ROWS = [
  { canon: 'KickMain', label: 'Kick', srcNote: 24, tgtNote: 36, status: 'direct' },
  { canon: 'China', label: 'China', srcNote: 59, tgtNote: null, status: 'dropped' },
];

describe('useRemapper convert path', () => {
  beforeEach(() => {
    planMock.mockReset().mockReturnValue(ROWS);
    remapMock.mockReset().mockReturnValue({
      bytes: new Uint8Array([1, 2, 3]),
      report: { unmapped_source: {}, fallback_used: {}, dropped: {} },
    });
  });

  it('initializes ready with no default selection', async () => {
    const { result } = renderHook(() => useRemapper());
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.src).toBe('');
    expect(result.current.tgt).toBe('');
    expect(result.current.rows).toHaveLength(0);
    expect(result.current.voiceCount).toBe(0);
    expect(planMock).not.toHaveBeenCalled();
  });

  it('converts a loaded file to a download once both engines are chosen', async () => {
    const { result } = renderHook(() => useRemapper());
    await waitFor(() => expect(result.current.status).toBe('ready'));
    act(() => result.current.chooseSrc('ggd_invasion'));
    act(() => result.current.chooseTgt('ezdrummer'));
    act(() => result.current.setFile({ bytes: new Uint8Array([9]), name: 'groove.mid' }));
    act(() => result.current.convert());
    await waitFor(() => expect(result.current.conv).toBe('done'));
    expect(result.current.result?.name).toBe('groove-ezdrummer.mid');
    expect(result.current.result?.url).toBe('blob:mock-url');
  });

  it('does not convert until both engines are chosen', async () => {
    const { result } = renderHook(() => useRemapper());
    await waitFor(() => expect(result.current.status).toBe('ready'));
    act(() => result.current.chooseSrc('ggd_invasion'));
    act(() => result.current.setFile({ bytes: new Uint8Array([9]), name: 'groove.mid' }));
    act(() => result.current.convert());
    expect(result.current.conv).toBe('idle');
    expect(remapMock).not.toHaveBeenCalled();
  });

  it('captures a conversion error', async () => {
    remapMock.mockImplementation(() => {
      throw new Error('unknown source engine');
    });
    const { result } = renderHook(() => useRemapper());
    await waitFor(() => expect(result.current.status).toBe('ready'));
    act(() => result.current.chooseSrc('ggd_invasion'));
    act(() => result.current.chooseTgt('ezdrummer'));
    act(() => result.current.setFile({ bytes: new Uint8Array([9]), name: 'g.mid' }));
    act(() => result.current.convert());
    await waitFor(() => expect(result.current.conv).toBe('error'));
    expect(result.current.error).toContain('unknown source engine');
  });

  it('swaps and recomputes plan', async () => {
    const { result } = renderHook(() => useRemapper());
    await waitFor(() => expect(result.current.status).toBe('ready'));
    act(() => result.current.chooseSrc('ggd_invasion'));
    act(() => result.current.chooseTgt('ezdrummer'));
    planMock.mockClear();
    act(() => result.current.swap());
    expect(result.current.src).toBe('ezdrummer');
    expect(result.current.tgt).toBe('ggd_invasion');
    expect(planMock).toHaveBeenCalled();
  });
});
