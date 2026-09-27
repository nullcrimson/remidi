import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const remapMock = vi.fn();
const planMock = vi.fn();
const readyMock = vi.fn(() => Promise.resolve());
vi.mock('../src/lib/midiremap', () => ({
  ready: () => readyMock(),
  engines: () => [
    { id: 'ggd_invasion', name: 'GGD Invasion' },
    { id: 'ezdrummer', name: 'EZdrummer' },
  ],
  plan: (...a: unknown[]) => planMock(...a),
  remap: (...a: unknown[]) => remapMock(...a),
}));

import { useRemapper } from '../src/hooks/useRemapper';

const ROWS = [
  { canon: 'KickMain', label: 'Kick', srcNotes: [24], tgtNote: 36, defaultTgtNote: 36, status: 'direct' },
  { canon: 'China', label: 'China', srcNotes: [59], tgtNote: null, defaultTgtNote: null, status: 'dropped' },
];

describe('useRemapper convert path', () => {
  beforeEach(() => {
    planMock.mockReset().mockReturnValue(ROWS);
    readyMock.mockReset().mockImplementation(() => Promise.resolve());
    remapMock.mockReset().mockReturnValue({
      bytes: new Uint8Array([1, 2, 3]),
      report: { unmappedSource: {}, fallbackUsed: {}, dropped: {} },
    });
  });

  it('initializes ready with no default selection', async () => {
    const { result } = renderHook(() => useRemapper());
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.src).toBe('');
    expect(result.current.tgt).toBe('');
    expect(result.current.editor.rows).toHaveLength(0);
    expect(result.current.editor.rows.length).toBe(0);
    expect(planMock).not.toHaveBeenCalled();
  });

  it('converts queued files to results once both engines are chosen', async () => {
    const { result } = renderHook(() => useRemapper());
    await waitFor(() => expect(result.current.status).toBe('ready'));
    act(() => result.current.chooseSrc('ggd_invasion'));
    act(() => result.current.chooseTgt('ezdrummer'));
    act(() =>
      result.current.addFiles([
        { bytes: new Uint8Array([9]), name: 'groove.mid' },
        { bytes: new Uint8Array([9]), name: 'fill.mid' },
      ]),
    );
    await act(() => result.current.convert());
    await waitFor(() => expect(result.current.conv.kind).toBe('done'));
    expect(result.current.results.map((r) => r.name)).toEqual([
      'groove-ezdrummer.mid',
      'fill-ezdrummer.mid',
    ]);
    expect(result.current.results[0].url).toBe('blob:mock-url');
  });

  it('enters the running state before settling on done', async () => {
    const { result } = renderHook(() => useRemapper());
    await waitFor(() => expect(result.current.status).toBe('ready'));
    act(() => result.current.chooseSrc('ggd_invasion'));
    act(() => result.current.chooseTgt('ezdrummer'));
    act(() => result.current.addFiles([{ bytes: new Uint8Array([9]), name: 'groove.mid' }]));

    let pending: Promise<void> | undefined;
    act(() => {
      pending = result.current.convert();
    });
    expect(result.current.conv.kind).toBe('running');

    await act(() => pending);
    expect(result.current.conv.kind).toBe('done');
  });

  it('does not convert until both engines are chosen', async () => {
    const { result } = renderHook(() => useRemapper());
    await waitFor(() => expect(result.current.status).toBe('ready'));
    act(() => result.current.chooseSrc('ggd_invasion'));
    act(() => result.current.addFiles([{ bytes: new Uint8Array([9]), name: 'groove.mid' }]));
    await act(() => result.current.convert());
    expect(result.current.conv.kind).toBe('idle');
    expect(result.current.results).toHaveLength(0);
    expect(remapMock).not.toHaveBeenCalled();
  });

  it('marks a failing file while others still convert', async () => {
    remapMock.mockImplementation((bytes: Uint8Array) => {
      if (bytes[0] === 0) throw new Error('unknown source engine');
      return {
        bytes: new Uint8Array([1, 2, 3]),
        report: { unmappedSource: {}, fallbackUsed: {}, dropped: {} },
      };
    });
    const { result } = renderHook(() => useRemapper());
    await waitFor(() => expect(result.current.status).toBe('ready'));
    act(() => result.current.chooseSrc('ggd_invasion'));
    act(() => result.current.chooseTgt('ezdrummer'));
    act(() =>
      result.current.addFiles([
        { bytes: new Uint8Array([9]), name: 'ok.mid' },
        { bytes: new Uint8Array([0]), name: 'bad.mid' },
      ]),
    );
    await act(() => result.current.convert());
    await waitFor(() => expect(result.current.conv.kind).toBe('done'));
    expect(result.current.results.map((r) => r.name)).toEqual(['ok-ezdrummer.mid']);
    expect(result.current.failures).toEqual([
      { name: 'bad.mid', error: 'Error: unknown source engine' },
    ]);
  });

  it('reports error when every file fails', async () => {
    remapMock.mockImplementation(() => {
      throw new Error('unknown source engine');
    });
    const { result } = renderHook(() => useRemapper());
    await waitFor(() => expect(result.current.status).toBe('ready'));
    act(() => result.current.chooseSrc('ggd_invasion'));
    act(() => result.current.chooseTgt('ezdrummer'));
    act(() => result.current.addFiles([{ bytes: new Uint8Array([9]), name: 'g.mid' }]));
    await act(() => result.current.convert());
    await waitFor(() => expect(result.current.conv.kind).toBe('error'));
    expect(result.current.failures).toHaveLength(1);
    expect(result.current.error).toContain('unknown source engine');
  });

  it('remembers skipped files until the next add', async () => {
    const { result } = renderHook(() => useRemapper());
    await waitFor(() => expect(result.current.status).toBe('ready'));
    act(() => result.current.addFiles([{ bytes: new Uint8Array([1]), name: 'a.mid' }], ['notes.txt']));
    expect(result.current.files).toHaveLength(1);
    expect(result.current.skipped).toEqual(['notes.txt']);
    act(() => result.current.addFiles([{ bytes: new Uint8Array([1]), name: 'b.mid' }], []));
    expect(result.current.skipped).toEqual([]);
  });

  it('keeps finished results when only non-MIDI files were added', async () => {
    const { result } = renderHook(() => useRemapper());
    await waitFor(() => expect(result.current.status).toBe('ready'));
    act(() => result.current.chooseSrc('ggd_invasion'));
    act(() => result.current.chooseTgt('ezdrummer'));
    act(() => result.current.addFiles([{ bytes: new Uint8Array([9]), name: 'groove.mid' }]));
    await act(() => result.current.convert());
    act(() => result.current.addFiles([], ['notes.txt']));
    expect(result.current.conv.kind).toBe('done');
    expect(result.current.skipped).toEqual(['notes.txt']);
  });

  it('dedupes by name and removes files', async () => {
    const { result } = renderHook(() => useRemapper());
    await waitFor(() => expect(result.current.status).toBe('ready'));
    act(() => result.current.addFiles([{ bytes: new Uint8Array([1]), name: 'a.mid' }]));
    act(() => result.current.addFiles([{ bytes: new Uint8Array([2]), name: 'a.mid' }]));
    expect(result.current.files).toHaveLength(1);
    act(() => result.current.removeFile('a.mid'));
    expect(result.current.files).toHaveLength(0);
  });

  it('starts on auto and converts with the chosen channel', async () => {
    const { result } = renderHook(() => useRemapper());
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.channel).toBe('auto');
    act(() => result.current.chooseSrc('ggd_invasion'));
    act(() => result.current.chooseTgt('ezdrummer'));
    act(() => result.current.addFiles([{ bytes: new Uint8Array([9]), name: 'groove.mid' }]));
    await act(() => result.current.convert());
    expect(remapMock.mock.calls[0][4]).toBe('auto');
    act(() => result.current.setChannel('10'));
    await act(() => result.current.convert());
    expect(remapMock.mock.calls[1][4]).toBe('10');
  });

  it('clears finished results when the channel changes', async () => {
    const { result } = renderHook(() => useRemapper());
    await waitFor(() => expect(result.current.status).toBe('ready'));
    act(() => result.current.chooseSrc('ggd_invasion'));
    act(() => result.current.chooseTgt('ezdrummer'));
    act(() => result.current.addFiles([{ bytes: new Uint8Array([9]), name: 'groove.mid' }]));
    await act(() => result.current.convert());
    expect(result.current.conv.kind).toBe('done');
    act(() => result.current.setChannel('all'));
    expect(result.current.channel).toBe('all');
    expect(result.current.conv.kind).toBe('idle');
    expect(result.current.files).toHaveLength(1);
  });

  it('sets the octave base', async () => {
    const { result } = renderHook(() => useRemapper());
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.oct).toBe('c1');
    act(() => result.current.setOct('c2'));
    expect(result.current.oct).toBe('c2');
    act(() => result.current.setOct('c1'));
    expect(result.current.oct).toBe('c1');
  });

  it('clears finished results when a note is edited', async () => {
    const { result } = renderHook(() => useRemapper());
    await waitFor(() => expect(result.current.status).toBe('ready'));
    act(() => result.current.chooseSrc('ggd_invasion'));
    act(() => result.current.chooseTgt('ezdrummer'));
    act(() => result.current.addFiles([{ bytes: new Uint8Array([9]), name: 'groove.mid' }]));
    await act(() => result.current.convert());
    expect(result.current.conv.kind).toBe('done');
    act(() => result.current.editor.openPick('KickMain'));
    act(() => result.current.editor.chooseNoteAbsolute(40));
    expect(result.current.conv.kind).toBe('idle');
    expect(result.current.results).toHaveLength(0);
  });

  it('discards a run that finishes after the settings changed', async () => {
    const { result } = renderHook(() => useRemapper());
    await waitFor(() => expect(result.current.status).toBe('ready'));
    act(() => result.current.chooseSrc('ggd_invasion'));
    act(() => result.current.chooseTgt('ezdrummer'));
    act(() => result.current.addFiles([{ bytes: new Uint8Array([9]), name: 'groove.mid' }]));
    let release = () => {};
    readyMock.mockImplementation(() => new Promise<void>((r) => (release = r)));
    const urls = vi.mocked(URL.createObjectURL);
    urls.mockClear();
    let pending: Promise<void> | undefined;
    act(() => {
      pending = result.current.convert();
    });
    act(() => result.current.swap());
    act(() => result.current.swap());
    await act(async () => {
      release();
      await pending;
    });
    expect(result.current.conv.kind).toBe('idle');
    expect(urls).not.toHaveBeenCalled();
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
