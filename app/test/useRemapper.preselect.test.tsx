import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useRemapper } from '../src/hooks/useRemapper';
import { RUNTIME } from './runtime';
import * as stub from './stubs/wasm';

beforeEach(() => {
  vi.mocked(stub.engine_drums).mockReturnValue([]);
  vi.mocked(stub.engine_notes).mockReturnValue([]);
  vi.mocked(stub.canon_catalog).mockReturnValue([]);
  vi.mocked(stub.plan).mockReturnValue([]);
});

afterEach(() => window.history.replaceState({}, '', '/'));

describe('useRemapper URL preselection', () => {
  it('preselects source and target from the query string', async () => {
    window.history.replaceState({}, '', '/?from=ggd_invasion&to=ezdrummer');
    const { result } = renderHook(() => useRemapper(RUNTIME));
    await waitFor(() => expect(result.current.status).toBe('ready'));
    await waitFor(() => expect(result.current.src).toBe('ggd_invasion'));
    expect(result.current.tgt).toBe('ezdrummer');
  });

  it('leaves the selection empty for unknown ids', async () => {
    window.history.replaceState({}, '', '/?from=nope');
    const { result } = renderHook(() => useRemapper(RUNTIME));
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.src).toBe('');
    expect(result.current.tgt).toBe('');
  });
});
