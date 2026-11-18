import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useConverter } from '../../src/convert/useConverter';
import type { BatchResult } from '../../src/convert/batch';
import type { Converter } from '../../src/convert/converter';
import { keyFor, type ConvertSetup } from '../../src/convert/convertSetup';
import type { Part } from '../../src/core/midiremap';
import { enginePair, typed } from '../typed';

const OV = { edits: {}, srcEdits: {} };
const FILE = { name: 'a.mid', bytes: new Uint8Array([1]) };
const SETUP: ConvertSetup = {
  pair: enginePair('ggd_invasion', 'ezdrummer'),
  overrides: OV,
  channel: 'auto',
  missing: 'nearest',
  unrecognized: 'remove',
  presetId: null,
  via: 'picked',
  asked: 'none',
};
const KEY = keyFor(SETUP);

function stoppable() {
  const signals: AbortSignal[] = [];
  const converter: Pick<Converter, 'convert'> = {
    convert: (_files, _pair, _ov, _channel, _missing, _unrecognized, signal) =>
      new Promise<BatchResult>((_resolve, reject) => {
        if (!signal) return;
        signals.push(signal);
        signal.addEventListener('abort', () => reject(signal.reason));
      }),
  };
  return { converter, signals };
}

function converting(converter: Pick<Converter, 'convert'>) {
  const { result } = renderHook(() => useConverter(converter, KEY));
  act(() => result.current.addFiles([FILE]));
  let run: Promise<unknown> = Promise.resolve();
  act(() => {
    run = result.current.convert(SETUP);
  });
  return { result, run };
}

describe('useConverter', () => {
  it('ends in an error, not a spinner, when the batch rejects', async () => {
    const converter: Pick<Converter, 'convert'> = { convert: vi.fn().mockRejectedValue(new Error('wasm fetch failed')) };
    const { result } = renderHook(() => useConverter(converter, KEY));
    act(() => result.current.addFiles([FILE]));
    let out: unknown;
    await act(async () => {
      out = await result.current.convert(SETUP);
    });
    expect(out).toEqual({ kind: 'failed', error: { kind: 'internal', detail: 'wasm fetch failed' } });
    expect(result.current.conv).toMatchObject({ kind: 'error', error: { kind: 'internal', detail: 'wasm fetch failed' } });
    expect(result.current.failures).toEqual([]);
  });

  it('converts the files it is handed, added in the same event', async () => {
    const convert = vi.fn<Converter['convert']>().mockResolvedValue({ ok: [], failed: [], asked: [], heavy: false });
    const { result } = renderHook(() => useConverter({ convert }, KEY));
    await act(async () => {
      result.current.addFiles([FILE]);
      await result.current.convert(SETUP, [FILE]);
    });
    expect(convert.mock.calls.map((call) => call[0])).toEqual([[FILE]]);
    expect(result.current.files).toEqual([FILE]);
  });

  it('stops the running batch when another conversion starts', () => {
    const { converter, signals } = stoppable();
    const { result } = converting(converter);
    act(() => {
      void result.current.convert(SETUP);
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
    act(() => result.current.onSelection({ type: 'swap', via: 'picked' }));
    expect(signals[0].aborted).toBe(true);
  });

  it('stops the running batch when the screen goes away', () => {
    const { converter, signals } = stoppable();
    const { result, unmount } = renderHook(() => useConverter(converter, KEY));
    act(() => result.current.addFiles([FILE]));
    act(() => {
      void result.current.convert(SETUP);
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

  describe('a file added under a listed name', () => {
    const NEWER = { name: 'a.mid', bytes: new Uint8Array([2]) };
    const OTHER = { name: 'b.mid', bytes: new Uint8Array([3]) };

    async function convertedThenAdded(...files: typeof FILE[]) {
      const converter: Pick<Converter, 'convert'> = { convert: vi.fn().mockResolvedValue({ ok: [], failed: [], asked: [], heavy: false }) };
      const { result } = renderHook(() => useConverter(converter, KEY));
      act(() => result.current.addFiles([FILE, OTHER]));
      act(() => result.current.setParts('a.mid', typed<Part[]>([{ track: 1, channel: 1 }])));
      expect(result.current.picks).not.toEqual({});
      await act(async () => {
        await result.current.convert(SETUP);
      });
      act(() => result.current.addFiles(files));
      return result;
    }

    it('takes the listed file\'s place with its own bytes, keeping the order', async () => {
      const result = await convertedThenAdded(NEWER);
      expect(result.current.files).toEqual([NEWER, OTHER]);
    });

    it('is named as replaced, and forgets the parts picked for the old file', async () => {
      const result = await convertedThenAdded(NEWER);
      expect(result.current.replaced).toEqual(['a.mid']);
      expect(result.current.picks).toEqual({});
    });

    it('takes the result on show away', async () => {
      const result = await convertedThenAdded(NEWER);
      expect(result.current.conv.kind).toBe('idle');
    });

    it('names nothing replaced when every file added is new', async () => {
      const result = await convertedThenAdded({ name: 'c.mid', bytes: new Uint8Array([4]) });
      expect(result.current.replaced).toEqual([]);
      expect(result.current.files.map((f) => f.name)).toEqual(['a.mid', 'b.mid', 'c.mid']);
    });
  });
});
