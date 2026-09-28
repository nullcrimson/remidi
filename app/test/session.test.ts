import { beforeEach, describe, expect, it } from 'vitest';
import { MISSING_KEY } from '../src/lib/missing';
import { EMPTY_SESSION, loadSession, saveSession, SESSION_KEY, type Session } from '../src/lib/session';

const FULL: Session = {
  src: 'ggd_invasion',
  tgt: 'ezdrummer',
  oct: 'c2',
  channel: '10',
  missing: 'drop',
  presetId: 'p1',
  edits: { 'kick.main': 35 },
  srcEdits: { 24: 'snare1.hit', 60: null },
};

describe('session', () => {
  beforeEach(() => localStorage.clear());

  it('starts empty', () => {
    expect(loadSession()).toEqual(EMPTY_SESSION);
    expect(EMPTY_SESSION).toEqual({
      src: '',
      tgt: '',
      oct: 'c1',
      channel: 'auto',
      missing: 'nearest',
      presetId: null,
      edits: {},
      srcEdits: {},
    });
  });

  it('round-trips everything it saves, versioned', () => {
    saveSession(FULL);
    expect(JSON.parse(localStorage.getItem(SESSION_KEY)!).version).toBe(1);
    expect(loadSession()).toEqual(FULL);
  });

  it('falls back field by field when a value is damaged', () => {
    localStorage.setItem(
      SESSION_KEY,
      JSON.stringify({ ...FULL, version: 1, oct: 'c9', channel: '42', missing: 'x', presetId: 3, edits: { 'kick.main': 500 } }),
    );
    expect(loadSession()).toEqual({ ...FULL, oct: 'c1', channel: 'auto', missing: 'nearest', presetId: null, edits: {} });
  });

  it('ignores unreadable or future sessions', () => {
    localStorage.setItem(SESSION_KEY, '{');
    expect(loadSession()).toEqual(EMPTY_SESSION);
    localStorage.setItem(SESSION_KEY, JSON.stringify({ ...FULL, version: 2 }));
    expect(loadSession()).toEqual(EMPTY_SESSION);
  });

  it('picks up the old missing-drums choice and retires its key on save', () => {
    localStorage.setItem(MISSING_KEY, 'drop');
    expect(loadSession().missing).toBe('drop');
    saveSession(EMPTY_SESSION);
    expect(localStorage.getItem(MISSING_KEY)).toBeNull();
  });
});
