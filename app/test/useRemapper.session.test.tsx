import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const planMock = vi.fn();
vi.mock('../src/lib/midiremap', () => ({
  ready: () => Promise.resolve(),
  engines: () => [
    { id: 'ggd_invasion', name: 'GGD Invasion' },
    { id: 'ezdrummer', name: 'EZdrummer' },
    { id: 'general_midi', name: 'General MIDI' },
  ],
  engineDrums: () => [],
  engineNotes: () => [],
  canonCatalog: () => [
    { canon: 'kick.main', label: 'Kick', family: 'Kick' },
    { canon: 'snare1.hit', label: 'Snare', family: 'Snare' },
  ],
  plan: (...a: unknown[]) => planMock(...a),
  remap: vi.fn(),
}));

import { useRemapper } from '../src/hooks/useRemapper';
import { loadSession, saveSession, type Session } from '../src/lib/session';

const STORED: Session = {
  src: 'ggd_invasion',
  tgt: 'ezdrummer',
  oct: 'c2',
  channel: '10',
  missing: 'drop',
  presetId: 'p1',
  edits: { 'kick.main': 35 },
  srcEdits: { 24: 'snare1.hit' },
};

async function mount() {
  const hook = renderHook(() => useRemapper());
  await waitFor(() => expect(hook.result.current.status).toBe('ready'));
  return hook.result;
}

describe('useRemapper session memory', () => {
  beforeEach(() => {
    localStorage.clear();
    planMock.mockReset().mockReturnValue([]);
  });
  afterEach(() => window.history.replaceState({}, '', '/'));

  it('brings back the last setup and unsaved edits', async () => {
    saveSession(STORED);
    const result = await mount();
    expect(result.current).toMatchObject({ src: 'ggd_invasion', tgt: 'ezdrummer', oct: 'c2', channel: '10', missing: 'drop', presetId: 'p1' });
    expect(result.current.editor.edits).toEqual({ 'kick.main': 35 });
    expect(result.current.editor.srcEdits).toEqual({ 24: 'snare1.hit' });
  });

  it('remembers each change', async () => {
    const result = await mount();
    act(() => result.current.chooseSrc('ggd_invasion'));
    act(() => result.current.chooseTgt('general_midi'));
    act(() => result.current.setOct('c2'));
    act(() => result.current.setChannel('all'));
    act(() => result.current.setMissing('drop'));
    expect(loadSession()).toMatchObject({ src: 'ggd_invasion', tgt: 'general_midi', oct: 'c2', channel: 'all', missing: 'drop' });
  });

  it('drops an engine this version no longer has, with its edits', async () => {
    saveSession({ ...STORED, tgt: 'gone_engine' });
    const result = await mount();
    await waitFor(() => expect(result.current.tgt).toBe(''));
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
    saveSession({ ...STORED, edits: { 'kick.main': 35, 'bogus.drum': 40 }, srcEdits: { 24: 'bogus.drum', 26: null } });
    const result = await mount();
    await waitFor(() => expect(result.current.editor.edits).toEqual({ 'kick.main': 35 }));
    expect(result.current.editor.srcEdits).toEqual({ 26: null });
  });
});
