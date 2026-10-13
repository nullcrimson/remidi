import { describe, expect, it } from 'vitest';
import { editorReducer, EDITOR_START, type EditorState, type Pick } from '../../src/editor/editorState';
import { knownEdits } from '../../src/core/overrides';
import type { SelectionEvent } from '../../src/core/selection';
import { canon, note, typed } from '../typed';

const edited = typed<EditorState>({
  edits: { 'kick.main': 35 },
  srcEdits: { 24: 'snare1.hit' },
  overlay: { kind: 'tgt', canon: 'kick.main', octIndex: 3, defaultNote: 36 },
});

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
      known: knownEdits(
        { edits: { 'snare1.hit': note(40) }, srcEdits: {} },
        new Map([['snare1.hit', canon('snare1.hit')]]),
      ),
    });
    expect(next).toEqual({ edits: { 'snare1.hit': 40 }, srcEdits: {}, overlay: null });
  });

  it.each<SelectionEvent>([
    { type: 'setChannel', channel: '10' },
    { type: 'setMissing', missing: 'drop' },
  ])('keeps the edits when only a setting changes ($type)', (event) => {
    expect(editorReducer(edited, event)).toBe(edited);
  });

  it('replaces the notice when a picker opens', () => {
    const state = typed<EditorState>({ edits: {}, srcEdits: {}, overlay: { kind: 'notice', canon: 'kick.main', note: 24, from: 'Snare' } });
    const pick = typed<Pick>({ kind: 'tgt', canon: 'kick.main', octIndex: 2, defaultNote: 36 });
    expect(editorReducer(state, { type: 'OPEN_PICK', pick }).overlay).toBe(pick);
  });
});
