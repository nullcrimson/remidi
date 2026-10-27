import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useRemapper } from '../../src/convert/useRemapper';
import { RUNTIME } from '../runtime';
import type { VoicePlan } from '../../src/core/midiremap';
import type { StoredEdits } from '../../src/core/overrides';
import * as stub from '../stubs/wasm';
import { canon, engineId, enginePair, note, typed } from '../typed';
import { shownTgtPick } from '../picks';

beforeEach(() => {
  vi.mocked(stub.engine_drums).mockReturnValue([]);
  vi.mocked(stub.plan).mockReturnValue(typed<VoicePlan[]>([
    { canon: 'kick.main', label: 'Kick', family: 'Kick', srcNotes: [24], defaultTgtNote: 36, outcome: { status: 'direct', tgtNote: 36 } },
  ]));
});

describe('useRemapper loadMapping', () => {
  it('sets src, tgt and edits atomically without the engine reset wiping edits', async () => {
    const { result } = renderHook(() => useRemapper(RUNTIME));
    await waitFor(() => expect(result.current.catalog.status).toBe('ready'));

    act(() =>
      result.current.loadMapping({
        src: engineId('ggd_invasion'),
        tgt: engineId('ezdrummer'),
        edits: typed<StoredEdits['edits']>({ 'kick.main': 40 }),
        srcEdits: {},
      }),
    );

    expect(result.current.src).toBe('ggd_invasion');
    expect(result.current.tgt).toBe('ezdrummer');
    expect(result.current.editor.edits).toEqual({ 'kick.main': 40 });
    expect(result.current.view).toEqual({ kind: 'convert' });
  });

  async function loadOverEditedEditor() {
    const { result } = renderHook(() => useRemapper(RUNTIME));
    await waitFor(() => expect(result.current.catalog.status).toBe('ready'));

    act(() => result.current.chooseSrc(engineId('ggd_invasion')));
    act(() => result.current.chooseTgt(engineId('ezdrummer')));
    act(() => result.current.editor.openPick(canon('kick.main')));
    act(() => result.current.editor.chooseNote(shownTgtPick(result.current.editor), note(45)));
    act(() => result.current.openEditor('all', null));
    return result;
  }

  it('replaces prior edits', async () => {
    const result = await loadOverEditedEditor();
    expect(result.current.editor.edits).toEqual({ 'kick.main': 45 });

    act(() =>
      result.current.loadMapping({ src: engineId('ezdrummer'), tgt: engineId('ggd_invasion'), edits: typed<StoredEdits['edits']>({ 'snare1.hit': 38 }), srcEdits: {} }),
    );

    expect(result.current.src).toBe('ezdrummer');
    expect(result.current.tgt).toBe('ggd_invasion');
    expect(result.current.editor.edits).toEqual({ 'snare1.hit': 38 });
  });

  it('returns to the convert view from edit', async () => {
    const result = await loadOverEditedEditor();

    act(() =>
      result.current.loadMapping({ src: engineId('ezdrummer'), tgt: engineId('ggd_invasion'), edits: typed<StoredEdits['edits']>({ 'snare1.hit': 38 }), srcEdits: {} }),
    );

    expect(result.current.view).toEqual({ kind: 'convert' });
    expect(result.current.editor.overlay).toBeNull();
  });
});

describe('useRemapper editor view', () => {
  async function withBothEngines() {
    const { result } = renderHook(() => useRemapper(RUNTIME));
    await waitFor(() => expect(result.current.catalog.status).toBe('ready'));
    act(() => result.current.chooseSrc(engineId('ggd_invasion')));
    act(() => result.current.chooseTgt(engineId('ezdrummer')));
    return result;
  }

  it('opens the editor on the pair, the filter and the source note it is given', async () => {
    const result = await withBothEngines();
    act(() => result.current.openEditor('issues', note(26)));
    expect(result.current.view).toEqual({
      kind: 'edit',
      pair: enginePair('ggd_invasion', 'ezdrummer'),
      show: 'issues',
      assignNote: note(26),
    });
  });

  it('drops the filter and the source note on leaving the editor', async () => {
    const result = await withBothEngines();
    act(() => result.current.openEditor('issues', note(26)));
    act(() => result.current.closeEditor());
    expect(result.current.view).toEqual({ kind: 'convert' });
  });

  it('does not open the editor before both engines are chosen', async () => {
    const { result } = renderHook(() => useRemapper(RUNTIME));
    await waitFor(() => expect(result.current.catalog.status).toBe('ready'));
    act(() => result.current.chooseSrc(engineId('ggd_invasion')));
    act(() => result.current.openEditor('all', null));
    expect(result.current.view).toEqual({ kind: 'convert' });
  });

  it('keeps the pair the editor shows current when an engine changes', async () => {
    const result = await withBothEngines();
    act(() => result.current.openEditor('all', null));
    act(() => result.current.chooseTgt(engineId('ggd_invasion')));
    expect(result.current.view).toMatchObject({ kind: 'edit', pair: enginePair('ggd_invasion', 'ggd_invasion') });
  });
});
