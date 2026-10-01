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
    defaultTgtNote: 36,
    outcome: { status: 'direct', tgtNote: 36 },
  }));
}

vi.mock('../src/lib/midiremap', () => ({
  ready: () => Promise.resolve(),
  engines: () => [
    { id: 'ggd_invasion', name: 'GGD Invasion' },
    { id: 'ezdrummer', name: 'EZdrummer' },
  ],
  engineDrums: () => [],
  engineNotes: () => [],
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

const srcNotesOf = (rows: { canon: string; srcNotes: number[] }[], canon: string) =>
  rows.find((r) => r.canon === canon)!.srcNotes;

describe('picking a drum’s source note', () => {
  it('replaces the drum’s default note instead of adding one', async () => {
    const result = await ready();
    act(() => result.current.editor.openSrcPick('kick.main'));
    act(() => result.current.editor.chooseSrcNote(3));
    expect(result.current.editor.srcEdits).toEqual({ 24: null, 27: 'kick.main' });
    expect(srcNotesOf(result.current.editor.rows, 'kick.main')).toEqual([27]);
  });

  it('restores the default when it is picked again', async () => {
    const result = await ready();
    act(() => result.current.editor.openSrcPick('kick.main'));
    act(() => result.current.editor.chooseSrcNote(3));
    act(() => result.current.editor.openSrcPick('kick.main'));
    act(() => result.current.editor.chooseSrcNote(0));
    expect(srcNotesOf(result.current.editor.rows, 'kick.main')).toEqual([24]);
    expect(Object.keys(result.current.editor.srcEdits)).not.toContain('27');
  });

  it('says which drum a picked note was taken from, until the next edit', async () => {
    const result = await ready();
    act(() => result.current.editor.openSrcPick('kick.main'));
    act(() => result.current.editor.chooseSrcNote(2));
    expect(result.current.editor.notice).toEqual({ canon: 'kick.main', note: 26, from: 'Snare' });
    expect(srcNotesOf(result.current.editor.rows, 'snare1.hit')).toEqual([]);
    act(() => result.current.editor.openPick('snare1.hit'));
    expect(result.current.editor.notice).toBeNull();
  });
});
