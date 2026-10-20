import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useRemapper } from '../../src/convert/useRemapper';
import { RUNTIME } from '../runtime';
import type { Engine, VocabularyDrum } from '../../src/core/midiremap';
import { loadSession, saveSession, type Session } from '../../src/convert/session';
import * as stub from '../stubs/wasm';
import { engineId, typed } from '../typed';

const STORED = typed<Session>({
  src: 'ggd_invasion',
  tgt: 'ezdrummer',
  oct: 'c2',
  channel: '10',
  missing: 'drop',
  unrecognized: 'keep',
  presetId: 'p1',
  edits: { 'kick.main': 35 },
  srcEdits: { 24: 'snare1.hit' },
});

async function mount() {
  const hook = renderHook(() => useRemapper(RUNTIME));
  await waitFor(() => expect(hook.result.current.catalog.status).toBe('ready'));
  return hook.result;
}

describe('useRemapper session memory', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.mocked(stub.engine_catalog).mockReturnValue(typed<Engine[]>([
      { id: 'ggd_invasion', name: 'GGD Invasion', fullName: 'GetGood Drums Invasion' },
      { id: 'ezdrummer', name: 'EZdrummer', fullName: 'Toontrack EZdrummer 3' },
      { id: 'general_midi', name: 'General MIDI', fullName: 'General MIDI' },
    ]));
    vi.mocked(stub.engine_drums).mockReturnValue([]);
    vi.mocked(stub.engine_notes).mockReturnValue([]);
    vi.mocked(stub.canon_catalog).mockReturnValue(typed<VocabularyDrum[]>([
      { canon: 'kick.main', label: 'Kick', family: 'Kick' },
      { canon: 'snare1.hit', label: 'Snare', family: 'Snare' },
    ]));
    vi.mocked(stub.plan).mockReturnValue([]);
  });
  afterEach(() => window.history.replaceState({}, '', '/'));

  it('brings back the last setup and unsaved edits', async () => {
    saveSession(STORED);
    const result = await mount();
    expect(result.current).toMatchObject({ src: 'ggd_invasion', tgt: 'ezdrummer', oct: 'c2', channel: '10', missing: 'drop', unrecognized: 'keep', presetId: 'p1' });
    expect(result.current.editor.edits).toEqual({ 'kick.main': 35 });
    expect(result.current.editor.srcEdits).toEqual({ 24: 'snare1.hit' });
  });

  it('remembers each change', async () => {
    const result = await mount();
    act(() => result.current.chooseSrc(engineId('ggd_invasion')));
    act(() => result.current.chooseTgt(engineId('general_midi')));
    act(() => result.current.setOct('c2'));
    act(() => result.current.setChannel('all'));
    act(() => result.current.setMissing('drop'));
    act(() => result.current.setUnrecognized('keep'));
    expect(loadSession()).toMatchObject({ src: 'ggd_invasion', tgt: 'general_midi', oct: 'c2', channel: 'all', missing: 'drop', unrecognized: 'keep' });
  });

  it('drops an engine this version no longer has, with its edits', async () => {
    saveSession({ ...STORED, tgt: engineId('gone_engine') });
    const result = await mount();
    await waitFor(() => expect(result.current.tgt).toBeNull());
    expect(result.current.src).toBe('ggd_invasion');
    expect(result.current.editor.edits).toEqual({});
    expect(result.current.presetId).toBeNull();
  });

  it('lets a link choose the pair, dropping edits made for another pair', async () => {
    saveSession(STORED);
    window.history.replaceState({}, '', '/?from=ggd_invasion&to=general_midi');
    const result = await mount();
    await waitFor(() => expect(result.current.tgt).toBe('general_midi'));
    expect(result.current.editor.edits).toEqual({});
    expect(result.current.presetId).toBeNull();
  });

  it('keeps edits when a link names the same pair', async () => {
    saveSession(STORED);
    window.history.replaceState({}, '', '/?from=ggd_invasion&to=ezdrummer');
    const result = await mount();
    expect(result.current.editor.edits).toEqual({ 'kick.main': 35 });
    expect(result.current.presetId).toBe('p1');
  });

  it('quietly leaves out restored edits for drums this version does not know', async () => {
    saveSession({
      ...STORED,
      ...typed<Pick<Session, 'edits' | 'srcEdits'>>({ edits: { 'kick.main': 35, 'bogus.drum': 40 }, srcEdits: { 24: 'bogus.drum', 26: null } }),
    });
    const result = await mount();
    await waitFor(() => expect(result.current.editor.edits).toEqual({ 'kick.main': 35 }));
    expect(result.current.editor.srcEdits).toEqual({ 26: null });
  });

  it('keeps the stored edits when the module cannot load', async () => {
    saveSession(STORED);
    const failing = { ...RUNTIME, load: () => Promise.reject(new Error('wasm boom')) };
    const { result } = renderHook(() => useRemapper(failing));
    await waitFor(() => expect(result.current.catalog.status).toBe('error'));
    expect(loadSession()).toMatchObject({ edits: { 'kick.main': 35 }, srcEdits: { 24: 'snare1.hit' } });
  });

  it('holds no edits before the module has loaded', () => {
    saveSession(STORED);
    const loading = { ...RUNTIME, load: () => new Promise<never>(() => {}) };
    const { result } = renderHook(() => useRemapper(loading));
    expect(result.current.editor.edits).toEqual({});
  });
});
