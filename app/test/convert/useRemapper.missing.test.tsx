import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useRemapper } from '../../src/convert/useRemapper';
import { RUNTIME } from '../runtime';
import { MISSING_KEY } from '../../src/core/missing';
import type { Report } from '../../src/core/midiremap';
import { loadSession } from '../../src/convert/session';
import * as stub from '../stubs/wasm';
import { typed } from '../typed';

const REPORT = typed<Report>({ unmappedSource: {}, fallbackUsed: {}, dropped: {}, untouched: 0, converted: 1 });

async function ready() {
  const hook = renderHook(() => useRemapper(RUNTIME));
  await waitFor(() => expect(hook.result.current.status).toBe('ready'));
  act(() => hook.result.current.chooseSrc('ggd_invasion'));
  act(() => hook.result.current.chooseTgt('ezdrummer'));
  act(() => hook.result.current.addFiles([{ bytes: new Uint8Array([9]), name: 'groove.mid' }]));
  return hook.result;
}

describe('useRemapper missing drums', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.mocked(stub.plan).mockReturnValue([]);
    vi.mocked(stub.remap).mockReturnValue({ bytes: new Uint8Array([1]), report: REPORT });
  });

  it('starts on nearest and plans with it', async () => {
    const result = await ready();
    expect(result.current.missing).toBe('nearest');
    expect(vi.mocked(stub.plan).mock.lastCall?.[3]).toBe('nearest');
  });

  it('starts on the choice remembered in the browser', async () => {
    localStorage.setItem(MISSING_KEY, 'drop');
    const result = await ready();
    expect(result.current.missing).toBe('drop');
    expect(vi.mocked(stub.plan).mock.lastCall?.[3]).toBe('drop');
  });

  it('remembers a change, re-plans and clears a finished conversion', async () => {
    const result = await ready();
    await act(() => result.current.convert());
    expect(result.current.conv.kind).toBe('done');
    expect(vi.mocked(stub.remap).mock.lastCall?.[5]).toBe('nearest');

    act(() => result.current.setMissing('drop'));
    expect(result.current.missing).toBe('drop');
    expect(loadSession().missing).toBe('drop');
    expect(vi.mocked(stub.plan).mock.lastCall?.[3]).toBe('drop');
    expect(result.current.conv.kind).toBe('idle');

    await act(() => result.current.convert());
    expect(vi.mocked(stub.remap).mock.lastCall?.[5]).toBe('drop');
  });

  it('drops missing drums and converts again in one step', async () => {
    const result = await ready();
    await act(() => result.current.convert());
    expect(result.current.conv.kind).toBe('done');

    await act(() => result.current.dropMissingAndConvert());
    expect(result.current.missing).toBe('drop');
    expect(vi.mocked(stub.remap).mock.lastCall?.[5]).toBe('drop');
    expect(result.current.conv.kind).toBe('done');
  });
});
