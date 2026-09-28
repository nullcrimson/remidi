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

vi.mock('../src/lib/download', () => ({ saveFile: vi.fn() }));

import { useRemapper } from '../src/hooks/useRemapper';
import { saveFile } from '../src/lib/download';
import { MISSING_KEY } from '../src/lib/missing';
import { loadSession } from '../src/lib/session';

const REPORT = { unmappedSource: {}, fallbackUsed: {}, dropped: {}, untouched: 0, converted: 1 };

async function ready() {
  const hook = renderHook(() => useRemapper());
  await waitFor(() => expect(hook.result.current.status).toBe('ready'));
  act(() => hook.result.current.chooseSrc('ggd_invasion'));
  act(() => hook.result.current.chooseTgt('ezdrummer'));
  act(() => hook.result.current.addFiles([{ bytes: new Uint8Array([9]), name: 'groove.mid' }]));
  return hook.result;
}

describe('useRemapper missing drums', () => {
  beforeEach(() => {
    localStorage.clear();
    planMock.mockReset().mockReturnValue([]);
    remapMock.mockReset().mockReturnValue({ bytes: new Uint8Array([1]), report: REPORT });
    vi.mocked(saveFile).mockClear();
  });

  it('starts on nearest and plans with it', async () => {
    const result = await ready();
    expect(result.current.missing).toBe('nearest');
    expect(planMock.mock.lastCall?.[3]).toBe('nearest');
  });

  it('starts on the choice remembered in the browser', async () => {
    localStorage.setItem(MISSING_KEY, 'drop');
    const result = await ready();
    expect(result.current.missing).toBe('drop');
    expect(planMock.mock.lastCall?.[3]).toBe('drop');
  });

  it('remembers a change, re-plans and clears a finished conversion', async () => {
    const result = await ready();
    await act(() => result.current.convert());
    expect(result.current.conv.kind).toBe('done');
    expect(remapMock.mock.lastCall?.[5]).toBe('nearest');

    act(() => result.current.setMissing('drop'));
    expect(result.current.missing).toBe('drop');
    expect(loadSession().missing).toBe('drop');
    expect(planMock.mock.lastCall?.[3]).toBe('drop');
    expect(result.current.conv.kind).toBe('idle');

    await act(() => result.current.convert());
    expect(remapMock.mock.lastCall?.[5]).toBe('drop');
  });

  it('drops missing drums and converts again in one step', async () => {
    const result = await ready();
    await act(() => result.current.convert());
    expect(saveFile).toHaveBeenCalledTimes(1);

    await act(() => result.current.dropMissingAndConvert());
    expect(result.current.missing).toBe('drop');
    expect(remapMock.mock.lastCall?.[5]).toBe('drop');
    expect(result.current.conv.kind).toBe('done');
    expect(saveFile).toHaveBeenCalledTimes(2);
  });
});
