import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const DEFAULTS: Record<number, string> = { 24: 'kick.main', 26: 'snare1.hit' };
const LABELS: Record<string, string> = { 'kick.main': 'Kick', 'snare1.hit': 'Snare' };

function fakePlan(_src: string, _tgt: string, ov?: { src: { note: number; canon: string | null }[] }) {
  const decode: Record<number, string | null> = { ...DEFAULTS };
  for (const s of ov?.src ?? []) decode[s.note] = s.canon;
  return Object.keys(LABELS).map((canon) => ({
    canon,
    label: LABELS[canon],
    srcNotes: Object.entries(decode)
      .filter(([, c]) => c === canon)
      .map(([n]) => Number(n)),
    tgtNote: 36,
    defaultTgtNote: 36,
    status: 'direct',
  }));
}

vi.mock('../src/lib/midiremap', () => ({
  ready: () => Promise.resolve(),
  engines: () => [
    { id: 'ggd_invasion', name: 'GGD Invasion' },
    { id: 'ezdrummer', name: 'EZdrummer' },
  ],
  engineDrums: () => [],
  engineNotes: () =>
    Object.entries(DEFAULTS).map(([note, canon]) => ({ note: Number(note), canon, label: LABELS[canon], family: 'Kick' })),
  canonCatalog: () => [],
  plan: fakePlan,
  remap: () => ({
    bytes: new Uint8Array([1]),
    report: { unmappedSource: {}, fallbackUsed: {}, dropped: {}, untouched: 0, converted: 1 },
  }),
}));

import { useRemapper } from '../src/hooks/useRemapper';

async function ready() {
  const hook = renderHook(() => useRemapper());
  await waitFor(() => expect(hook.result.current.status).toBe('ready'));
  act(() => hook.result.current.chooseSrc('ggd_invasion'));
  act(() => hook.result.current.chooseTgt('ezdrummer'));
  return hook.result;
}

const sorted = (s: Set<string>) => [...s].sort();

describe('editor changes', () => {
  it('starts with nothing changed', async () => {
    const result = await ready();
    expect(sorted(result.current.editor.changed)).toEqual([]);
  });

  it('counts a target edit', async () => {
    const result = await ready();
    act(() => result.current.editor.openPick('kick.main'));
    act(() => result.current.editor.chooseNoteAbsolute(40));
    expect(sorted(result.current.editor.changed)).toEqual(['kick.main']);
    expect(sorted(result.current.editor.changedSrc)).toEqual([]);
  });

  it('counts a replaced source note on the drum that got it', async () => {
    const result = await ready();
    act(() => result.current.editor.openSrcPick('kick.main'));
    act(() => result.current.editor.chooseSrcNote(3));
    expect(sorted(result.current.editor.changedSrc)).toEqual(['kick.main']);
  });

  it('counts both drums when a note moves from one to the other', async () => {
    const result = await ready();
    act(() => result.current.editor.setSrcCanon(26, 'kick.main'));
    expect(sorted(result.current.editor.changed)).toEqual(['kick.main', 'snare1.hit']);
  });

  it('resets one drum to its defaults and leaves the others', async () => {
    const result = await ready();
    act(() => result.current.editor.openPick('snare1.hit'));
    act(() => result.current.editor.chooseNoteAbsolute(41));
    act(() => result.current.editor.openSrcPick('kick.main'));
    act(() => result.current.editor.chooseSrcNote(3));
    act(() => result.current.editor.openPick('kick.main'));
    act(() => result.current.editor.chooseNoteAbsolute(40));
    act(() => result.current.editor.resetRow('kick.main'));
    expect(result.current.editor.edits).toEqual({ 'snare1.hit': 41 });
    expect(result.current.editor.srcEdits).toEqual({});
    expect(sorted(result.current.editor.changed)).toEqual(['snare1.hit']);
  });
});
