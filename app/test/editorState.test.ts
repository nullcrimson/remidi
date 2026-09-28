import { describe, expect, it } from 'vitest';
import { editorReducer, EDITOR_START, type EditorState } from '../src/lib/editorState';
import type { SelectionEvent } from '../src/lib/selection';

const edited: EditorState = {
  edits: { 'kick.main': 35 },
  srcEdits: { 24: 'snare1.hit' },
  pick: { canon: 'kick.main', octIndex: 3, side: 'tgt', defaultNote: 36, prevNote: null },
  notice: { canon: 'kick.main', note: 24, from: 'Snare' },
};

describe('editorReducer and selection events', () => {
  it.each<SelectionEvent>([
    { type: 'chooseSrc', id: 'ezdrummer' },
    { type: 'chooseTgt', id: 'ezdrummer' },
    { type: 'swap' },
    { type: 'preselect', src: 'a', tgt: 'b' },
  ])('drops every edit when the pair changes ($type)', (event) => {
    expect(editorReducer(edited, event)).toEqual(EDITOR_START);
  });

  it('takes a loaded mapping’s edits and closes any picker', () => {
    const next = editorReducer(edited, {
      type: 'loadMapping',
      src: 'a',
      tgt: 'b',
      presetId: 'p1',
      edits: { 'snare1.hit': 40 },
      srcEdits: {},
    });
    expect(next).toEqual({ edits: { 'snare1.hit': 40 }, srcEdits: {}, pick: null, notice: null });
  });

  it.each<SelectionEvent>([
    { type: 'setChannel', channel: '10' },
    { type: 'setMissing', missing: 'drop' },
  ])('keeps the edits when only a setting changes ($type)', (event) => {
    expect(editorReducer(edited, event)).toBe(edited);
  });
});
