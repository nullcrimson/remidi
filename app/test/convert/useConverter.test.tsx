import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useConverter } from '../../src/convert/useConverter';
import type { BatchResult } from '../../src/convert/batch';
import type { Converter } from '../../src/convert/converter';

const OV = { tgt: [], src: [] };
const FILE = { name: 'a.mid', bytes: new Uint8Array([1]) };

function stoppable() {
  const signals: AbortSignal[] = [];
  const converter: Converter = {
    convert: (_files, _pair, _ov, _channel, _missing, signal) =>
      new Promise<BatchResult>((_resolve, reject) => {
        if (!signal) return;
        signals.push(signal);
        signal.addEventListener('abort', () => reject(signal.reason));
      }),
  };
  return { converter, signals };
}

function converting(converter: Converter) {
  const { result } = renderHook(() => useConverter(converter, { src: 'ggd_invasion', tgt: 'ezdrummer' }, 'k'));
  act(() => result.current.addFiles([FILE]));
  let run: Promise<unknown> = Promise.resolve();
  act(() => {
    run = result.current.convert(OV, 'auto', 'nearest', 'k');
  });
  return { result, run };
}

describe('useConverter', () => {
  it('ends in an error, not a spinner, when the batch rejects', async () => {
    const converter: Converter = { convert: vi.fn().mockRejectedValue(new Error('wasm fetch failed')) };
    const { result } = renderHook(() => useConverter(converter, { src: 'ggd_invasion', tgt: 'ezdrummer' }, 'k'));
    act(() => result.current.addFiles([FILE]));
    let out: unknown;
    await act(async () => {
      out = await result.current.convert(OV, 'auto', 'nearest', 'k');
    });
    expect(out).toBeNull();
    expect(result.current.conv).toMatchObject({ kind: 'error', error: { kind: 'internal', detail: 'wasm fetch failed' } });
    expect(result.current.failures).toEqual([]);
  });

  it('stops the running batch when another conversion starts', () => {
    const { converter, signals } = stoppable();
    const { result } = converting(converter);
    act(() => {
      void result.current.convert(OV, 'auto', 'nearest', 'k');
    });
    expect(signals.map((s) => s.aborted)).toEqual([true, false]);
  });

  it('stops the running batch when a file is removed', () => {
    const { converter, signals } = stoppable();
    const { result } = converting(converter);
    act(() => result.current.removeFile('a.mid'));
    expect(signals[0].aborted).toBe(true);
  });

  it('stops the running batch when the files are cleared', () => {
    const { converter, signals } = stoppable();
    const { result } = converting(converter);
    act(() => result.current.clearFiles());
    expect(signals[0].aborted).toBe(true);
  });

  it('stops the running batch when a file is added', () => {
    const { converter, signals } = stoppable();
    const { result } = converting(converter);
    act(() => result.current.addFiles([{ name: 'b.mid', bytes: new Uint8Array([2]) }]));
    expect(signals[0].aborted).toBe(true);
  });

  it('stops the running batch when the selection changes', () => {
    const { converter, signals } = stoppable();
    const { result } = converting(converter);
    act(() => result.current.onSelection({ type: 'swap' }));
    expect(signals[0].aborted).toBe(true);
  });

  it('stops the running batch when the screen goes away', () => {
    const { converter, signals } = stoppable();
    const { result, unmount } = renderHook(() => useConverter(converter, { src: 'ggd_invasion', tgt: 'ezdrummer' }, 'k'));
    act(() => result.current.addFiles([FILE]));
    act(() => {
      void result.current.convert(OV, 'auto', 'nearest', 'k');
    });
    unmount();
    expect(signals[0].aborted).toBe(true);
  });

  it('shows no error for a batch it stopped', async () => {
    const { converter } = stoppable();
    const { result, run } = converting(converter);
    await act(async () => {
      result.current.removeFile('a.mid');
      await run;
    });
    expect(result.current.conv.kind).toBe('idle');
  });

  it('keeps a batch running when no file was actually added', () => {
    const { converter, signals } = stoppable();
    const { result } = converting(converter);
    act(() => result.current.addFiles([]));
    expect(signals[0].aborted).toBe(false);
  });
});
