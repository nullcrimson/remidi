import { beforeEach, describe, expect, it } from 'vitest';
import { EMPTY_SESSION, loadSession, saveSession, type Session } from '../../src/convert/session';
import { typed } from '../typed';
import { storedName } from '../../src/core/storage';

const SESSION_KEY = storedName('session');
const MISSING_KEY = storedName('missing');

const FULL = typed<Session>({
  src: 'ggd_invasion',
  tgt: 'ezdrummer',
  oct: 'c2',
  channel: '10',
  missing: 'drop',
  presetId: 'p1',
  edits: { 'kick.main': 35 },
  srcEdits: { 24: 'snare1.hit', 60: null },
});

describe('session', () => {
  beforeEach(() => localStorage.clear());

  it('starts empty', () => {
    expect(loadSession()).toEqual(EMPTY_SESSION);
    expect(EMPTY_SESSION).toEqual({
      src: null,
      tgt: null,
      oct: 'c1',
      channel: 'auto',
      missing: 'nearest',
      presetId: null,
      edits: {},
      srcEdits: {},
    });
  });

  it('saves the session versioned', () => {
    saveSession(FULL);
    expect(JSON.parse(localStorage.getItem(SESSION_KEY)!).version).toBe(1);
  });

  it('round-trips everything it saves', () => {
    saveSession(FULL);
    expect(loadSession()).toEqual(FULL);
  });

  it('falls back field by field when a value is damaged', () => {
    localStorage.setItem(
      SESSION_KEY,
      JSON.stringify({ ...FULL, version: 1, oct: 'c9', channel: '42', missing: 'x', presetId: 3, edits: { 'kick.main': 500 } }),
    );
    expect(loadSession()).toEqual({ ...FULL, oct: 'c1', channel: 'auto', missing: 'nearest', presetId: null, edits: {} });
  });

  it('reads a stored octave naming of c1 as c1', () => {
    localStorage.setItem(SESSION_KEY, JSON.stringify({ ...FULL, version: 1, oct: 'c1' }));
    expect(loadSession().oct).toBe('c1');
  });

  it('reads a stored missing-drums setting of nearest as nearest', () => {
    localStorage.setItem(SESSION_KEY, JSON.stringify({ ...FULL, version: 1, missing: 'nearest' }));
    expect(loadSession().missing).toBe('nearest');
  });

  it('ignores an unreadable session', () => {
    localStorage.setItem(SESSION_KEY, '{');
    expect(loadSession()).toEqual(EMPTY_SESSION);
  });

  it('ignores a future session', () => {
    localStorage.setItem(SESSION_KEY, JSON.stringify({ ...FULL, version: 2 }));
    expect(loadSession()).toEqual(EMPTY_SESSION);
  });

  it('reads an engine stored as the empty string as not chosen', () => {
    localStorage.setItem(SESSION_KEY, JSON.stringify({ ...FULL, version: 1, src: '', tgt: 'ezdrummer' }));
    expect(loadSession()).toEqual({ ...FULL, src: null });
  });

  it('stores an engine not chosen as the empty string, as earlier versions did', () => {
    saveSession({ ...FULL, src: null, tgt: null });
    expect(JSON.parse(localStorage.getItem(SESSION_KEY)!)).toMatchObject({ src: '', tgt: '' });
  });

  it('picks up the old missing-drums choice', () => {
    localStorage.setItem(MISSING_KEY, 'drop');
    expect(loadSession().missing).toBe('drop');
  });

  it('retires the old missing-drums key on save', () => {
    localStorage.setItem(MISSING_KEY, 'drop');
    saveSession(EMPTY_SESSION);
    expect(localStorage.getItem(MISSING_KEY)).toBeNull();
  });
});
