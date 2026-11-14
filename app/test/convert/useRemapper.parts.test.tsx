import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useRemapper } from '../../src/convert/useRemapper';
import { RUNTIME } from '../runtime';
import type { Conversion, Part, PartSummary, VoicePlan } from '../../src/core/midiremap';
import * as stub from '../stubs/wasm';
import { engineId, typed } from '../typed';

const PARTS = typed<PartSummary[]>([
  { part: { track: 1, channel: 1 }, trackName: 'Kit', hits: 12, plays: null },
  { part: { track: 2, channel: 2 }, trackName: 'Bass', hits: 30, plays: null },
]);

const converted = (offers: Part[] = []) =>
  typed<Conversion>({
    kind: 'done',
    picked: [{ track: 1, channel: 10 }],
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

describe('useRemapper drum parts', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.mocked(stub.plan).mockReturnValue(typed<VoicePlan[]>([]));
    vi.mocked(stub.remap).mockReturnValue(converted());
    vi.mocked(stub.remap_parts).mockReturnValue(converted());
    vi.mocked(stub.auto_question).mockImplementation((mid) => (mid[0] === 7 ? PARTS : undefined));
    vi.mocked(stub.file_parts).mockReturnValue([]);
  });

  it('asks about a file whose drum parts auto cannot tell, and waits for a pick', async () => {
    const result = await ready();
    act(() => result.current.addFiles([{ name: 'song.mid', bytes: new Uint8Array([7]) }]));
    expect(result.current.questions.asked).toEqual([{ file: 'song.mid', parts: PARTS }]);
    expect([...result.current.questions.waiting]).toEqual(['song.mid']);
    act(() => result.current.setParts('song.mid', [PARTS[0].part]));
    expect(result.current.questions.waiting.size).toBe(0);
  });

  it('converts a picked file through only its picked parts', async () => {
    const result = await ready();
    act(() => result.current.addFiles([{ name: 'song.mid', bytes: new Uint8Array([7]) }]));
    act(() => result.current.setParts('song.mid', [PARTS[0].part]));
    await act(() => result.current.convert());
    expect(stub.remap_parts).toHaveBeenCalledOnce();
    expect(vi.mocked(stub.remap_parts).mock.calls[0][4]).toEqual([PARTS[0].part]);
    expect(stub.remap).not.toHaveBeenCalled();
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

  it('offers the parts left beside channel 10 and converts them too when asked', async () => {
    const offer = { track: 1, channel: 1 };
    vi.mocked(stub.remap).mockReturnValue(converted([offer]));
    vi.mocked(stub.file_parts).mockReturnValue(typed<PartSummary[]>([
      { part: { track: 1, channel: 10 }, trackName: 'Drums', hits: 9, plays: null },
      { part: offer, trackName: 'Drums', hits: 4, plays: null },
    ]));
    const result = await ready();
    act(() => result.current.addFiles([{ name: 'mjod.mid', bytes: new Uint8Array([1]) }]));
    await act(() => result.current.convert());
    expect(result.current.questions.offers).toEqual([{
      file: 'mjod.mid',
      parts: [{ part: offer, trackName: 'Drums', hits: 4, plays: null }],
      withOffers: [{ track: 1, channel: 10 }, offer],
    }]);
    await act(() => result.current.alsoConvert('mjod.mid', [{ track: 1, channel: 10 }, offer]));
    expect(vi.mocked(stub.remap_parts).mock.calls[0][4]).toEqual([{ track: 1, channel: 10 }, offer]);
  });
});
