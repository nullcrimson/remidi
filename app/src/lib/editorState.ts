import { noteInOctave } from './notes';
import type { Edits, SrcEdits } from './overrides';
import { changesPair, type SelectionEvent } from './selection';

type PickSide = 'tgt' | 'src';

export interface Pick {
  canon: string;
  octIndex: number;
  side: PickSide;
  defaultNote: number | null;
  prevNote: number | null;
}

/** A source note the last pick took over from another drum. */
export interface Notice {
  canon: string;
  note: number;
  from: string;
}

export interface EditorState {
  edits: Edits;
  srcEdits: SrcEdits;
  pick: Pick | null;
  notice: Notice | null;
}

export type EditorAction
  = | SelectionEvent
    | {
      type: 'OPEN_PICK';
      canon: string;
      octIndex: number;
      side: PickSide;
      defaultNote: number | null;
      prevNote: number | null;
    }
    | { type: 'SET_PICK_OCT'; octIndex: number }
    | { type: 'CHOOSE_NOTE'; semitone: number }
    | { type: 'CHOOSE_NOTE_ABS'; note: number }
    | { type: 'CHOOSE_SRC_NOTE'; note: number; takenFrom: string | null }
    | { type: 'SET_SRC_CANON'; note: number; canon: string }
    | { type: 'CLEAR_SRC_CANON'; note: number }
    | { type: 'CLOSE_PICK' }
    | { type: 'RESET_ROW'; canon: string; defaultNotes: number[] }
    | { type: 'RESET' }
    | { type: 'LOAD'; edits: Edits; srcEdits: SrcEdits };

export const EDITOR_START: EditorState = { edits: {}, srcEdits: {}, pick: null, notice: null };

function withEdit(edits: Edits, canon: string, note: number, defaultNote: number | null): Edits {
  if (note === defaultNote) {
    const next = { ...edits };
    delete next[canon];
    return next;
  }
  return { ...edits, [canon]: note };
}

function withoutCanon(srcEdits: SrcEdits, canon: string): SrcEdits {
  return Object.fromEntries(Object.entries(srcEdits).filter(([, c]) => c !== canon));
}

function withSourceNote(state: EditorState, pick: Pick, note: number): SrcEdits {
  const next = withoutCanon(state.srcEdits, pick.canon);
  const prev = pick.prevNote;
  if (prev !== null && prev !== note && state.srcEdits[prev] !== pick.canon) next[prev] = null;
  next[note] = pick.canon;
  return next;
}

function loaded(edits: Edits, srcEdits: SrcEdits): EditorState {
  return { edits, srcEdits, pick: null, notice: null };
}

export function editorReducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case 'chooseSrc':
    case 'chooseTgt':
    case 'swap':
    case 'preselect':
    case 'setChannel':
    case 'setMissing':
      return changesPair(action) ? EDITOR_START : state;
    case 'loadMapping':
      return loaded(action.edits, action.srcEdits);
    case 'OPEN_PICK':
      return {
        ...state,
        notice: null,
        pick: {
          canon: action.canon,
          octIndex: action.octIndex,
          side: action.side,
          defaultNote: action.defaultNote,
          prevNote: action.prevNote,
        },
      };
    case 'SET_PICK_OCT':
      return state.pick ? { ...state, pick: { ...state.pick, octIndex: action.octIndex } } : state;
    case 'CHOOSE_NOTE':
      return state.pick
        ? {
            ...state,
            edits: withEdit(
              state.edits,
              state.pick.canon,
              noteInOctave(state.pick.octIndex, action.semitone),
              state.pick.defaultNote,
            ),
            pick: null,
          }
        : state;
    case 'CHOOSE_NOTE_ABS':
      return state.pick
        ? {
            ...state,
            edits: withEdit(state.edits, state.pick.canon, action.note, state.pick.defaultNote),
            pick: null,
          }
        : state;
    case 'CHOOSE_SRC_NOTE':
      return state.pick
        ? {
            ...state,
            srcEdits: withSourceNote(state, state.pick, action.note),
            pick: null,
            notice: action.takenFrom
              ? { canon: state.pick.canon, note: action.note, from: action.takenFrom }
              : null,
          }
        : state;
    case 'SET_SRC_CANON':
      return {
        ...state,
        srcEdits: { ...state.srcEdits, [action.note]: action.canon },
        notice: null,
      };
    case 'CLEAR_SRC_CANON': {
      const next = { ...state.srcEdits };
      delete next[action.note];
      return { ...state, srcEdits: next, notice: null };
    }
    case 'CLOSE_PICK':
      return { ...state, pick: null };
    case 'RESET_ROW': {
      const edits = { ...state.edits };
      delete edits[action.canon];
      const srcEdits = Object.fromEntries(
        Object.entries(withoutCanon(state.srcEdits, action.canon)).filter(
          ([note]) => !action.defaultNotes.includes(Number(note)),
        ),
      );
      return loaded(edits, srcEdits);
    }
    case 'RESET':
      return EDITOR_START;
    case 'LOAD':
      return loaded(action.edits, action.srcEdits);
  }
}
