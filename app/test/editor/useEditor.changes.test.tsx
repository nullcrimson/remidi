import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useRemapper } from '../../src/convert/useRemapper';
import { RUNTIME } from '../runtime';
import type { Drum, Overrides, VoicePlan } from '../../src/core/midiremap';
import * as stub from '../stubs/wasm';
import { canon, engineId, note, typed } from '../typed';
import { shownSrcPick, shownTgtPick } from '../picks';

const DEFAULTS: Record<number, string> = { 24: 'kick.main', 26: 'snare1.hit' };
const LABELS: Record<string, string> = { 'kick.main': 'Kick', 'snare1.hit': 'Snare' };

function fakePlan(_src: string, _tgt: string, ov?: Overrides | null) {
  const decode: Record<number, string | null> = { ...DEFAULTS };
  for (const s of ov?.src ?? []) decode[s.note] = s.canon;
  return typed<VoicePlan[]>(Object.keys(LABELS).map((canon) => ({
    canon,
    label: LABELS[canon],
    family: 'Kick' as const,
    srcNotes: Object.entries(decode)
      .filter(([, c]) => c === canon)
      .map(([n]) => Number(n)),
    defaultTgtNote: 36,
    outcome: { status: 'direct', tgtNote: 36 },
  })));
}

beforeEach(() => {
  vi.mocked(stub.engine_drums).mockReturnValue([]);
  vi.mocked(stub.engine_notes).mockReturnValue(typed<Drum[]>(
    Object.entries(DEFAULTS).map(([n, c]) => ({ note: Number(n), canon: c, label: LABELS[c], family: 'Kick' })),
  ));
  vi.mocked(stub.canon_catalog).mockReturnValue([]);
  vi.mocked(stub.plan).mockImplementation(fakePlan);
});

async function ready() {
  const hook = renderHook(() => useRemapper(RUNTIME));
  await waitFor(() => expect(hook.result.current.catalog.status).toBe('ready'));
  act(() => hook.result.current.chooseSrc(engineId('ggd_invasion')));
  act(() => hook.result.current.chooseTgt(engineId('ezdrummer')));
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
    act(() => result.current.editor.openPick(canon('kick.main')));
    act(() => result.current.editor.chooseNote(shownTgtPick(result.current.editor), note(40)));
    expect(sorted(result.current.editor.changed)).toEqual(['kick.main']);
    expect(sorted(result.current.editor.changedSrc)).toEqual([]);
  });

  it('counts a replaced source note on the drum that got it', async () => {
    const result = await ready();
    act(() => result.current.editor.openSrcPick(canon('kick.main')));
    act(() => result.current.editor.chooseSrcNote(shownSrcPick(result.current.editor), note(27)));
    expect(sorted(result.current.editor.changedSrc)).toEqual(['kick.main']);
  });

  it('counts both drums when a note moves from one to the other', async () => {
    const result = await ready();
    act(() => result.current.editor.setSrcCanon(note(26), canon('kick.main')));
    expect(sorted(result.current.editor.changed)).toEqual(['kick.main', 'snare1.hit']);
  });

  it('resets one drum to its defaults and leaves the others', async () => {
    const result = await ready();
    act(() => result.current.editor.openPick(canon('snare1.hit')));
    act(() => result.current.editor.chooseNote(shownTgtPick(result.current.editor), note(41)));
    act(() => result.current.editor.openSrcPick(canon('kick.main')));
    act(() => result.current.editor.chooseSrcNote(shownSrcPick(result.current.editor), note(27)));
    act(() => result.current.editor.openPick(canon('kick.main')));
    act(() => result.current.editor.chooseNote(shownTgtPick(result.current.editor), note(40)));
    act(() => result.current.editor.resetRow(canon('kick.main')));
    expect(result.current.editor.edits).toEqual({ 'snare1.hit': 41 });
    expect(result.current.editor.srcEdits).toEqual({});
    expect(sorted(result.current.editor.changed)).toEqual(['snare1.hit']);
  });
});
