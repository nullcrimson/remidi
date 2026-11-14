import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useRemapper } from '../../src/convert/useRemapper';
import { RUNTIME } from '../runtime';
import type { Conversion, PartSummary, VoicePlan } from '../../src/core/midiremap';
import * as stub from '../stubs/wasm';
import { engineId, typed } from '../typed';

const PARTS = typed<PartSummary[]>([
  { part: { track: 1, channel: 1 }, trackName: 'Kit', hits: 12, plays: null },
  { part: { track: 2, channel: 2 }, trackName: 'Bass', hits: 30, plays: null },
]);

const DRUMS = { track: 1, channel: 10 };
const BESIDE = typed<PartSummary>({ part: { track: 1, channel: 1 }, trackName: 'Drums', hits: 4, plays: null });

const converted = (offers: PartSummary[] = []) =>
  typed<Conversion>({
    kind: 'done',
    picked: [DRUMS],
    offers,
    bytes: new Uint8Array([1]),
    damage: [],
    report: { unmappedSource: {}, fallbackUsed: {}, dropped: {}, untouched: 0, converted: 1 },
  });

async function ready() {
  const hook = renderHook(() => useRemapper(RUNTIME));
  await waitFor(() => expect(hook.result.current.catalog.status).toBe('ready'));
  act(() => hook.result.current.chooseSrc(engineId('ggd_invasion')));
  act(() => hook.result.current.chooseTgt(engineId('ezdrummer')));
  return hook.result;
}

async function convertedBesideDrums() {
  vi.mocked(stub.remap).mockReturnValue(converted([BESIDE]));
  const result = await ready();
  act(() => result.current.addFiles([{ name: 'mjod.mid', bytes: new Uint8Array([1]) }]));
  await act(() => result.current.convert());
  return result;
}

describe('useRemapper drum parts', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.mocked(stub.plan).mockReturnValue(typed<VoicePlan[]>([]));
    vi.mocked(stub.remap).mockReturnValue(converted());
    vi.mocked(stub.auto_question).mockImplementation((mid) => (mid[0] === 7 ? PARTS : undefined));
  });

  it('asks about a file whose drum parts auto cannot tell, and waits for a pick', async () => {
    const result = await ready();
    act(() => result.current.addFiles([{ name: 'song.mid', bytes: new Uint8Array([7]) }]));
    expect(result.current.questions.asked).toEqual([{ file: 'song.mid', parts: PARTS }]);
    expect([...result.current.questions.waiting]).toEqual(['song.mid']);
    act(() => result.current.setParts('song.mid', [PARTS[0].part]));
    expect(result.current.questions.waiting.size).toBe(0);
  });

  it('waits again once every part of a file is unticked', async () => {
    const result = await ready();
    act(() => result.current.addFiles([{ name: 'song.mid', bytes: new Uint8Array([7]) }]));
    act(() => result.current.setParts('song.mid', [PARTS[0].part]));
    act(() => result.current.setParts('song.mid', []));
    expect(result.current.picks).toEqual({});
    expect([...result.current.questions.waiting]).toEqual(['song.mid']);
  });

  it('names a file whose parts cannot be read among the failures', async () => {
    vi.mocked(stub.auto_question).mockImplementation(() => {
      throw { kind: 'badMidi', detail: 'not a midi file' };
    });
    const result = await ready();
    act(() => result.current.addFiles([{ name: 'broken.mid', bytes: new Uint8Array([0]) }]));
    expect(result.current.questions.unreadable).toEqual([{ name: 'broken.mid', error: { kind: 'badMidi', detail: 'not a midi file' } }]);
    expect(result.current.questions.waiting.size).toBe(0);
  });

  it('converts a picked file through only its picked parts', async () => {
    const result = await ready();
    act(() => result.current.addFiles([{ name: 'song.mid', bytes: new Uint8Array([7]) }]));
    act(() => result.current.setParts('song.mid', [PARTS[0].part]));
    await act(() => result.current.convert());
    expect(vi.mocked(stub.remap).mock.calls[0][4]).toEqual({ parts: [PARTS[0].part] });
  });

  it('fits a picked file by its picked parts', async () => {
    const result = await ready();
    act(() => result.current.addFiles([{ name: 'song.mid', bytes: new Uint8Array([7]) }]));
    act(() => result.current.setParts('song.mid', [PARTS[0].part]));
    await waitFor(() => expect(vi.mocked(stub.source_fits).mock.lastCall?.[0]).toEqual([
      { bytes: new Uint8Array([7]), selection: { parts: [PARTS[0].part] } },
    ]));
  });

  it('converts the files that are ready and leaves a waiting file for later', async () => {
    const result = await ready();
    act(() => result.current.addFiles([
      { name: 'song.mid', bytes: new Uint8Array([7]) },
      { name: 'drums.mid', bytes: new Uint8Array([1]) },
    ]));
    await act(() => result.current.convertReady());
    expect(stub.remap).toHaveBeenCalledOnce();
    expect(result.current.results.map((r) => r.input.name)).toEqual(['drums.mid']);
  });

  it('asks nothing when a channel other than auto is chosen', async () => {
    const result = await ready();
    act(() => result.current.setChannel('all'));
    act(() => result.current.addFiles([{ name: 'song.mid', bytes: new Uint8Array([7]) }]));
    expect(result.current.questions.asked).toEqual([]);
  });

  it('offers the parts a conversion left beside channel 10', async () => {
    const result = await convertedBesideDrums();
    expect(result.current.questions.offers).toEqual([{ file: 'mjod.mid', parts: [BESIDE], withOffers: [BESIDE.part, DRUMS] }]);
  });

  it('converts an offer with the parts picked before', async () => {
    const result = await convertedBesideDrums();
    await act(() => result.current.alsoConvert('mjod.mid', [BESIDE.part, DRUMS]));
    expect(vi.mocked(stub.remap).mock.lastCall?.[4]).toEqual({ parts: [BESIDE.part, DRUMS] });
  });
});
