import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useRemapper } from '../../src/convert/useRemapper';
import { RUNTIME } from '../runtime';
import type { Converted, VoicePlan } from '../../src/core/midiremap';
import init, * as stub from '../stubs/wasm';
import { canon, engineId, note, typed } from '../typed';
import { shownTgtPick } from '../picks';

const ROWS = typed<VoicePlan[]>([
  { canon: 'KickMain', label: 'Kick', family: 'Kick', srcNotes: [24], defaultTgtNote: 36, outcome: { status: 'direct', note: 36 } },
  { canon: 'China', label: 'China', family: 'Cymbals', srcNotes: [59], defaultTgtNote: null, outcome: { status: 'dropped', otherDrum: false } },
]);

const converted = () =>
  typed<Converted>({
    bytes: new Uint8Array([1, 2, 3]),
    report: { unmappedSource: {}, fallbackUsed: {}, dropped: {}, untouched: 0, converted: 1 },
  });

describe('useRemapper convert path', () => {
  beforeEach(() => {
    vi.mocked(stub.plan).mockReturnValue(ROWS);
    vi.mocked(stub.remap).mockReturnValue(converted());
  });

  it('initializes ready with no default selection', async () => {
    const { result } = renderHook(() => useRemapper(RUNTIME));
    await waitFor(() => expect(result.current.catalog.status).toBe('ready'));
    expect(result.current.src).toBeNull();
    expect(result.current.tgt).toBeNull();
    expect(result.current.editor.rows).toHaveLength(0);
    expect(result.current.editor.rows.length).toBe(0);
    expect(stub.plan).not.toHaveBeenCalled();
  });

  it('converts queued files to results once both engines are chosen', async () => {
    const { result } = renderHook(() => useRemapper(RUNTIME));
    await waitFor(() => expect(result.current.catalog.status).toBe('ready'));
    act(() => result.current.chooseSrc(engineId('ggd_invasion')));
    act(() => result.current.chooseTgt(engineId('ezdrummer')));
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
    const { result } = renderHook(() => useRemapper(RUNTIME));
    await waitFor(() => expect(result.current.catalog.status).toBe('ready'));
    act(() => result.current.chooseSrc(engineId('ggd_invasion')));
    act(() => result.current.chooseTgt(engineId('ezdrummer')));
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
    const { result } = renderHook(() => useRemapper(RUNTIME));
    await waitFor(() => expect(result.current.catalog.status).toBe('ready'));
    act(() => result.current.chooseSrc(engineId('ggd_invasion')));
    act(() => result.current.addFiles([{ bytes: new Uint8Array([9]), name: 'groove.mid' }]));
    await act(() => result.current.convert());
    expect(result.current.conv.kind).toBe('idle');
    expect(result.current.results).toHaveLength(0);
    expect(stub.remap).not.toHaveBeenCalled();
  });

  it('marks a failing file while others still convert', async () => {
    vi.mocked(stub.remap).mockImplementation((bytes) => {
      if (bytes[0] === 0) throw new Error('unknown source engine');
      return converted();
    });
    const { result } = renderHook(() => useRemapper(RUNTIME));
    await waitFor(() => expect(result.current.catalog.status).toBe('ready'));
    act(() => result.current.chooseSrc(engineId('ggd_invasion')));
    act(() => result.current.chooseTgt(engineId('ezdrummer')));
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
      { name: 'bad.mid', error: { kind: 'internal', detail: 'unknown source engine' } },
    ]);
  });

  it('reports error when every file fails', async () => {
    vi.mocked(stub.remap).mockImplementation(() => {
      throw new Error('unknown source engine');
    });
    const { result } = renderHook(() => useRemapper(RUNTIME));
    await waitFor(() => expect(result.current.catalog.status).toBe('ready'));
    act(() => result.current.chooseSrc(engineId('ggd_invasion')));
    act(() => result.current.chooseTgt(engineId('ezdrummer')));
    act(() => result.current.addFiles([{ bytes: new Uint8Array([9]), name: 'g.mid' }]));
    await act(() => result.current.convert());
    await waitFor(() => expect(result.current.conv.kind).toBe('error'));
    expect(result.current.failures).toHaveLength(1);
    expect(result.current.conv).toMatchObject({ error: { kind: 'internal', detail: 'unknown source engine' } });
  });

  it('remembers skipped files', async () => {
    const { result } = renderHook(() => useRemapper(RUNTIME));
    await waitFor(() => expect(result.current.catalog.status).toBe('ready'));
    act(() => result.current.addFiles([{ bytes: new Uint8Array([1]), name: 'a.mid' }], ['notes.txt']));
    expect(result.current.files).toHaveLength(1);
    expect(result.current.skipped).toEqual(['notes.txt']);
  });

  it('forgets skipped files on the next add', async () => {
    const { result } = renderHook(() => useRemapper(RUNTIME));
    await waitFor(() => expect(result.current.catalog.status).toBe('ready'));
    act(() => result.current.addFiles([{ bytes: new Uint8Array([1]), name: 'a.mid' }], ['notes.txt']));
    act(() => result.current.addFiles([{ bytes: new Uint8Array([1]), name: 'b.mid' }], []));
    expect(result.current.skipped).toEqual([]);
  });

  it('keeps finished results when only non-MIDI files were added', async () => {
    const { result } = renderHook(() => useRemapper(RUNTIME));
    await waitFor(() => expect(result.current.catalog.status).toBe('ready'));
    act(() => result.current.chooseSrc(engineId('ggd_invasion')));
    act(() => result.current.chooseTgt(engineId('ezdrummer')));
    act(() => result.current.addFiles([{ bytes: new Uint8Array([9]), name: 'groove.mid' }]));
    await act(() => result.current.convert());
    act(() => result.current.addFiles([], ['notes.txt']));
    expect(result.current.conv.kind).toBe('done');
    expect(result.current.skipped).toEqual(['notes.txt']);
  });

  it('dedupes files by name', async () => {
    const { result } = renderHook(() => useRemapper(RUNTIME));
    await waitFor(() => expect(result.current.catalog.status).toBe('ready'));
    act(() => result.current.addFiles([{ bytes: new Uint8Array([1]), name: 'a.mid' }]));
    act(() => result.current.addFiles([{ bytes: new Uint8Array([2]), name: 'a.mid' }]));
    expect(result.current.files).toHaveLength(1);
  });

  it('removes files', async () => {
    const { result } = renderHook(() => useRemapper(RUNTIME));
    await waitFor(() => expect(result.current.catalog.status).toBe('ready'));
    act(() => result.current.addFiles([{ bytes: new Uint8Array([1]), name: 'a.mid' }]));
    act(() => result.current.removeFile('a.mid'));
    expect(result.current.files).toHaveLength(0);
  });

  it('starts on the auto channel', async () => {
    const { result } = renderHook(() => useRemapper(RUNTIME));
    await waitFor(() => expect(result.current.catalog.status).toBe('ready'));
    expect(result.current.channel).toBe('auto');
  });

  it('converts with the auto channel', async () => {
    const { result } = renderHook(() => useRemapper(RUNTIME));
    await waitFor(() => expect(result.current.catalog.status).toBe('ready'));
    act(() => result.current.chooseSrc(engineId('ggd_invasion')));
    act(() => result.current.chooseTgt(engineId('ezdrummer')));
    act(() => result.current.addFiles([{ bytes: new Uint8Array([9]), name: 'groove.mid' }]));
    await act(() => result.current.convert());
    expect(vi.mocked(stub.remap).mock.calls[0][4]).toBe('auto');
  });

  it('converts with the chosen channel', async () => {
    const { result } = renderHook(() => useRemapper(RUNTIME));
    await waitFor(() => expect(result.current.catalog.status).toBe('ready'));
    act(() => result.current.chooseSrc(engineId('ggd_invasion')));
    act(() => result.current.chooseTgt(engineId('ezdrummer')));
    act(() => result.current.addFiles([{ bytes: new Uint8Array([9]), name: 'groove.mid' }]));
    act(() => result.current.setChannel('10'));
    await act(() => result.current.convert());
    expect(vi.mocked(stub.remap).mock.calls[0][4]).toBe('10');
  });

  it('clears finished results when the channel changes', async () => {
    const { result } = renderHook(() => useRemapper(RUNTIME));
    await waitFor(() => expect(result.current.catalog.status).toBe('ready'));
    act(() => result.current.chooseSrc(engineId('ggd_invasion')));
    act(() => result.current.chooseTgt(engineId('ezdrummer')));
    act(() => result.current.addFiles([{ bytes: new Uint8Array([9]), name: 'groove.mid' }]));
    await act(() => result.current.convert());
    expect(result.current.conv.kind).toBe('done');
    act(() => result.current.setChannel('all'));
    expect(result.current.channel).toBe('all');
    expect(result.current.conv.kind).toBe('idle');
    expect(result.current.files).toHaveLength(1);
  });

  it('starts on the c1 octave base', async () => {
    const { result } = renderHook(() => useRemapper(RUNTIME));
    await waitFor(() => expect(result.current.catalog.status).toBe('ready'));
    expect(result.current.oct).toBe('c1');
  });

  it('sets the octave base', async () => {
    const { result } = renderHook(() => useRemapper(RUNTIME));
    await waitFor(() => expect(result.current.catalog.status).toBe('ready'));
    act(() => result.current.setOct('c2'));
    expect(result.current.oct).toBe('c2');
  });

  it('clears finished results when a note is edited', async () => {
    const { result } = renderHook(() => useRemapper(RUNTIME));
    await waitFor(() => expect(result.current.catalog.status).toBe('ready'));
    act(() => result.current.chooseSrc(engineId('ggd_invasion')));
    act(() => result.current.chooseTgt(engineId('ezdrummer')));
    act(() => result.current.addFiles([{ bytes: new Uint8Array([9]), name: 'groove.mid' }]));
    await act(() => result.current.convert());
    expect(result.current.conv.kind).toBe('done');
    act(() => result.current.editor.openPick(canon('KickMain')));
    act(() => result.current.editor.chooseNote(shownTgtPick(result.current.editor), note(40)));
    expect(result.current.conv.kind).toBe('idle');
    expect(result.current.results).toHaveLength(0);
  });

  it('swaps and recomputes plan', async () => {
    const { result } = renderHook(() => useRemapper(RUNTIME));
    await waitFor(() => expect(result.current.catalog.status).toBe('ready'));
    act(() => result.current.chooseSrc(engineId('ggd_invasion')));
    act(() => result.current.chooseTgt(engineId('ezdrummer')));
    vi.mocked(stub.plan).mockClear();
    act(() => result.current.swap());
    expect(result.current.src).toBe('ezdrummer');
    expect(result.current.tgt).toBe('ggd_invasion');
    expect(stub.plan).toHaveBeenCalled();
  });

  it('lists engines by display name', async () => {
    const { result } = renderHook(() => useRemapper(RUNTIME));
    await waitFor(() => expect(result.current.catalog.status).toBe('ready'));
    expect(result.current.engines.map((e) => e.name)).toEqual(['EZdrummer', 'GGD Invasion']);
  });

  it('discards a run that finishes after the settings changed', async () => {
    let release = () => {};
    vi.mocked(init).mockReturnValue(new Promise<unknown>((resolve) => (release = () => resolve({}))));
    const { result } = renderHook(() => useRemapper(RUNTIME));
    act(() => result.current.chooseSrc(engineId('ggd_invasion')));
    act(() => result.current.chooseTgt(engineId('ezdrummer')));
    act(() => result.current.addFiles([{ bytes: new Uint8Array([9]), name: 'groove.mid' }]));
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
});
