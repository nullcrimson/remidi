import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useRemapper } from '../../src/convert/useRemapper';
import { RUNTIME } from '../runtime';
import type { Report } from '../../src/core/midiremap';
import { loadSession } from '../../src/convert/session';
import * as stub from '../stubs/wasm';
import { engineId, typed } from '../typed';

const REPORT = typed<Report>({ unmappedSource: { 99: 1 }, fallbackUsed: {}, dropped: {}, untouched: 0, converted: 1 });

async function ready() {
  const hook = renderHook(() => useRemapper(RUNTIME));
  await waitFor(() => expect(hook.result.current.catalog.status).toBe('ready'));
  act(() => hook.result.current.chooseSrc(engineId('ggd_invasion')));
  act(() => hook.result.current.chooseTgt(engineId('ezdrummer')));
  act(() => hook.result.current.addFiles([{ bytes: new Uint8Array([9]), name: 'groove.mid' }]));
  return hook.result;
}

describe('useRemapper unrecognized notes', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.mocked(stub.plan).mockReturnValue([]);
    vi.mocked(stub.remap).mockReturnValue({ bytes: new Uint8Array([1]), report: REPORT });
  });

  it('starts on remove', async () => {
    const result = await ready();
    expect(result.current.unrecognized).toBe('remove');
  });

  it('remembers a change', async () => {
    const result = await ready();
    act(() => result.current.setUnrecognized('keep'));
    expect(result.current.unrecognized).toBe('keep');
    expect(loadSession().unrecognized).toBe('keep');
  });

  it('clears a finished conversion after a change', async () => {
    const result = await ready();
    await act(() => result.current.convert());
    expect(result.current.conv.kind).toBe('done');

    act(() => result.current.setUnrecognized('keep'));
    expect(result.current.conv.kind).toBe('idle');
  });

  it('converts with the changed choice', async () => {
    const result = await ready();
    await act(() => result.current.convert());
    expect(vi.mocked(stub.remap).mock.lastCall?.[6]).toBe('remove');

    act(() => result.current.setUnrecognized('keep'));
    await act(() => result.current.convert());
    expect(vi.mocked(stub.remap).mock.lastCall?.[6]).toBe('keep');
  });

  it('does not plan again when the choice changes', async () => {
    const result = await ready();
    const plans = vi.mocked(stub.plan).mock.calls.length;
    act(() => result.current.setUnrecognized('keep'));
    expect(vi.mocked(stub.plan).mock.calls.length).toBe(plans);
  });
});
