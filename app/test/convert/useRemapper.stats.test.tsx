import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Converter } from '../../src/convert/converter';
import { useRemapper } from '../../src/convert/useRemapper';
import { actionsOf } from './actions';
import { WasmCallError } from '../../src/core/errors';
import { RUNTIME } from '../runtime';
import { fakeUmami } from '../umami';
import { advisedOf, engineId } from '../typed';

const NO_ADVICE: Converter['advice'] = async (_files, _channel, source, target) => advisedOf(source, target, { kind: 'fits' });

const FILE = { name: 'a.mid', bytes: new Uint8Array([1]) };

describe('useRemapper events', () => {
  const umami = fakeUmami();

  const convertRejecting = async (reason: unknown) => {
    const converter: Converter = { convert: vi.fn().mockRejectedValue(reason), advice: NO_ADVICE };
    const { result } = renderHook(() => useRemapper({ ...RUNTIME, converter }));
    await waitFor(() => expect(result.current.catalog.status).toBe('ready'));
    act(() => result.current.chooseSrc(engineId('ggd_invasion')));
    act(() => result.current.chooseTgt(engineId('ezdrummer')));
    act(() => result.current.addFiles([FILE]));
    await act(() => actionsOf(result.current).convert());
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
      advice: NO_ADVICE,
    };
    const { result } = renderHook(() => useRemapper({ ...RUNTIME, converter }));
    await waitFor(() => expect(result.current.catalog.status).toBe('ready'));
    act(() => result.current.chooseSrc(engineId('ggd_invasion')));
    act(() => result.current.chooseTgt(engineId('ezdrummer')));
    act(() => result.current.addFiles([FILE]));
    let run: Promise<void> = Promise.resolve();
    act(() => {
      run = actionsOf(result.current).convert();
    });
    act(() => result.current.removeFile('a.mid'));
    await act(() => run);
    expect(umami).not.toHaveBeenCalled();
  });
});
