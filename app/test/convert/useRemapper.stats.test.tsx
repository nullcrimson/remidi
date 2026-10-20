import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Converter } from '../../src/convert/converter';
import { useRemapper } from '../../src/convert/useRemapper';
import { WasmCallError } from '../../src/core/errors';
import { RUNTIME } from '../runtime';
import { fakeUmami } from '../umami';
import { engineId } from '../typed';

const FILE = { name: 'a.mid', bytes: new Uint8Array([1]) };

describe('useRemapper events', () => {
  const umami = fakeUmami();

  const convertRejecting = async (reason: unknown) => {
    const converter: Converter = { convert: vi.fn().mockRejectedValue(reason), fits: async () => ({ hits: 0, ranked: [] }) };
    const { result } = renderHook(() => useRemapper({ ...RUNTIME, converter }));
    await waitFor(() => expect(result.current.catalog.status).toBe('ready'));
    act(() => result.current.chooseSrc(engineId('ggd_invasion')));
    act(() => result.current.chooseTgt(engineId('ezdrummer')));
    act(() => result.current.addFiles([FILE]));
    await act(() => result.current.convert());
  };

  it('sends convert-failed with the kind of error the module gave', async () => {
    await convertRejecting(new WasmCallError({ kind: 'badMidi', detail: 'x' }));
    expect(umami).toHaveBeenCalledWith('convert-failed', { from: 'ggd_invasion', to: 'ezdrummer', kind: 'badMidi' });
  });

  it('sends convert-failed with kind internal for an error the module did not describe', async () => {
    await convertRejecting(new Error('boom'));
    expect(umami).toHaveBeenCalledWith('convert-failed', { from: 'ggd_invasion', to: 'ezdrummer', kind: 'internal' });
  });

  it('sends nothing about a conversion for a run that was stopped', async () => {
    const converter: Converter = {
      convert: (_files, _pair, _ov, _channel, _missing, _unrecognized, signal) => new Promise((_resolve, reject) => signal?.addEventListener('abort', () => reject(signal.reason))),
      fits: async () => ({ hits: 0, ranked: [] }),
    };
    const { result } = renderHook(() => useRemapper({ ...RUNTIME, converter }));
    await waitFor(() => expect(result.current.catalog.status).toBe('ready'));
    act(() => result.current.chooseSrc(engineId('ggd_invasion')));
    act(() => result.current.chooseTgt(engineId('ezdrummer')));
    act(() => result.current.addFiles([FILE]));
    let run: Promise<void> = Promise.resolve();
    act(() => {
      run = result.current.convert();
    });
    act(() => result.current.removeFile('a.mid'));
    await act(() => run);
    expect(umami).not.toHaveBeenCalled();
  });
});
