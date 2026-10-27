import { describe, expect, it } from 'vitest';
import { closingProps, EMPTY_TALLY, tallyReducer } from '../../src/editor/editorTally';
import { typed } from '../typed';
import type { Overrides } from '../../src/core/midiremap';

const NO_EDITS: Overrides = { edits: {}, srcEdits: {} };

describe('tallyReducer', () => {
  it('starts every session with no counts', () => {
    const used = tallyReducer(tallyReducer(EMPTY_TALLY, { type: 'filter' }), { type: 'rowReset' });
    expect(tallyReducer(used, { type: 'open', edits: NO_EDITS })).toEqual(EMPTY_TALLY);
  });

  it('keeps the edits a session opened with', () => {
    const opening = typed<Overrides>({ edits: { 'kick.main': 40 }, srcEdits: { 24: null } });
    expect(tallyReducer(EMPTY_TALLY, { type: 'open', edits: opening }).opening).toBe(opening);
  });

  it('counts a pick on the keyboard apart from one in the list', () => {
    const tally = [{ type: 'pick', via: 'keyboard' }, { type: 'pick', via: 'list' }, { type: 'pick', via: 'keyboard' }] as const;
    expect(tally.reduce(tallyReducer, EMPTY_TALLY)).toMatchObject({ keyboard: 2, list: 1, filtered: false, resets: 0 });
  });

  it('notes that a filter was used', () => {
    expect(tallyReducer(EMPTY_TALLY, { type: 'filter' }).filtered).toBe(true);
  });

  it('keeps a filter used once as used', () => {
    expect(tallyReducer(tallyReducer(EMPTY_TALLY, { type: 'filter' }), { type: 'filter' }).filtered).toBe(true);
  });

  it('counts each row reset', () => {
    expect(tallyReducer(tallyReducer(EMPTY_TALLY, { type: 'rowReset' }), { type: 'rowReset' }).resets).toBe(2);
  });

  it('does not change the tally it was given', () => {
    tallyReducer(EMPTY_TALLY, { type: 'rowReset' });
    expect(EMPTY_TALLY).toEqual({ keyboard: 0, list: 0, filtered: false, resets: 0, opening: NO_EDITS });
  });
});

describe('closingProps', () => {
  const opened = typed<Overrides>({ edits: { 'kick.main': 40 }, srcEdits: { 24: 'kick.main' } });
  const sessionOpenedWith = (opening: Overrides) => ({ ...EMPTY_TALLY, opening });

  it('counts no target edit when nothing changed after opening a preset with edits', () => {
    expect(closingProps('done', opened, sessionOpenedWith(opened)).targets).toBe(0);
  });

  it('counts no source edit when nothing changed after opening a preset with edits', () => {
    expect(closingProps('done', opened, sessionOpenedWith(opened)).sources).toBe(0);
  });

  it('counts a target edit added since opening', () => {
    const now = typed<Overrides>({ edits: { 'kick.main': 40, 'snare1.hit': 41 }, srcEdits: opened.srcEdits });
    expect(closingProps('done', now, sessionOpenedWith(opened)).targets).toBe(1);
  });

  it('counts a target edit changed since opening', () => {
    const now = typed<Overrides>({ edits: { 'kick.main': 41 }, srcEdits: opened.srcEdits });
    expect(closingProps('done', now, sessionOpenedWith(opened)).targets).toBe(1);
  });

  it('counts a target edit removed since opening', () => {
    expect(closingProps('done', NO_EDITS, sessionOpenedWith(opened)).targets).toBe(1);
  });

  it('counts a source edit added since opening', () => {
    const now = typed<Overrides>({ edits: opened.edits, srcEdits: { 24: 'kick.main', 26: null } });
    expect(closingProps('done', now, sessionOpenedWith(opened)).sources).toBe(1);
  });

  it('counts a source edit changed since opening', () => {
    const now = typed<Overrides>({ edits: opened.edits, srcEdits: { 24: 'snare1.hit' } });
    expect(closingProps('done', now, sessionOpenedWith(opened)).sources).toBe(1);
  });

  it('counts a source edit removed since opening', () => {
    expect(closingProps('done', NO_EDITS, sessionOpenedWith(opened)).sources).toBe(1);
  });

  it('carries how the session closed', () => {
    expect(closingProps('history', NO_EDITS, EMPTY_TALLY).how).toBe('history');
  });

  it('carries the tally and not the edits it opened with', () => {
    expect(closingProps('back', NO_EDITS, { ...EMPTY_TALLY, keyboard: 3, list: 1, filtered: true, resets: 2 })).toEqual({
      how: 'back', targets: 0, sources: 0, keyboard: 3, list: 1, filtered: true, resets: 2,
    });
  });
});
