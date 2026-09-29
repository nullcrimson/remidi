import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const convertBatchMock = vi.fn();
vi.mock('../src/lib/converter', () => ({
  convertBatch: (...a: unknown[]) => convertBatchMock(...a),
}));

import { useConverter } from '../src/hooks/useConverter';

const OV = { tgt: [], src: [] };

describe('useConverter', () => {
  it('ends in an error, not a spinner, when the batch rejects', async () => {
    convertBatchMock.mockRejectedValue(new Error('wasm fetch failed'));
    const { result } = renderHook(() => useConverter('ggd_invasion', 'ezdrummer', 'k'));
    act(() => result.current.addFiles([{ name: 'a.mid', bytes: new Uint8Array([1]) }]));
    let out: unknown;
    await act(async () => {
      out = await result.current.convert(OV, 'auto', 'nearest', 'k');
    });
    expect(out).toBeNull();
    expect(result.current.conv.kind).toBe('error');
    expect(result.current.convError).toEqual({ kind: 'internal', detail: 'wasm fetch failed' });
    expect(result.current.failures).toEqual([]);
  });
});
