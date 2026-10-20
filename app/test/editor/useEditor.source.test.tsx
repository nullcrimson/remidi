import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useRemapper } from '../../src/convert/useRemapper';
import { RUNTIME } from '../runtime';
import type { Overrides, VoiceRow } from '../../src/core/midiremap';
import * as stub from '../stubs/wasm';
import { canon, engineId, note, typed } from '../typed';
import { shownSrcPick } from '../picks';

const DEFAULTS: Record<number, string> = { 24: 'kick.main', 26: 'snare1.hit' };
const LABELS: Record<string, string> = { 'kick.main': 'Kick', 'snare1.hit': 'Snare' };

function fakePlan(_src: string, _tgt: string, ov?: Overrides | null) {
  const decode: Record<number, string | null> = { ...DEFAULTS };
  for (const s of ov?.src ?? []) decode[s.note] = s.canon;
  return typed<VoiceRow[]>(Object.keys(LABELS).map((canon) => ({
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
  vi.mocked(stub.engine_notes).mockReturnValue([]);
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

const srcNotesOf = (rows: { canon: string; srcNotes: number[] }[], canon: string) =>
  rows.find((r) => r.canon === canon)!.srcNotes;

describe('picking a drum’s source note', () => {
  it('replaces the drum’s default note instead of adding one', async () => {
    const result = await ready();
    act(() => result.current.editor.openSrcPick(canon('kick.main')));
    act(() => result.current.editor.chooseSrcNote(shownSrcPick(result.current.editor), note(27)));
    expect(result.current.editor.srcEdits).toEqual({ 24: null, 27: 'kick.main' });
    expect(srcNotesOf(result.current.editor.rows, 'kick.main')).toEqual([27]);
  });

  it('restores the default when it is picked again', async () => {
    const result = await ready();
    act(() => result.current.editor.openSrcPick(canon('kick.main')));
    act(() => result.current.editor.chooseSrcNote(shownSrcPick(result.current.editor), note(27)));
    act(() => result.current.editor.openSrcPick(canon('kick.main')));
    act(() => result.current.editor.chooseSrcNote(shownSrcPick(result.current.editor), note(24)));
    expect(srcNotesOf(result.current.editor.rows, 'kick.main')).toEqual([24]);
    expect(Object.keys(result.current.editor.srcEdits)).not.toContain('27');
  });

  it('says which drum a picked note was taken from', async () => {
    const result = await ready();
    act(() => result.current.editor.openSrcPick(canon('kick.main')));
    act(() => result.current.editor.chooseSrcNote(shownSrcPick(result.current.editor), note(26)));
    expect(result.current.editor.overlay).toEqual({ kind: 'notice', canon: 'kick.main', note: 26, from: 'Snare' });
    expect(srcNotesOf(result.current.editor.rows, 'snare1.hit')).toEqual([]);
  });

  it('replaces the taken-from notice when the next pick opens', async () => {
    const result = await ready();
    act(() => result.current.editor.openSrcPick(canon('kick.main')));
    act(() => result.current.editor.chooseSrcNote(shownSrcPick(result.current.editor), note(26)));
    act(() => result.current.editor.openPick(canon('snare1.hit')));
    expect(result.current.editor.overlay).toMatchObject({ kind: 'tgt' });
  });
});
