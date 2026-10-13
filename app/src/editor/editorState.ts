import type { Canon, Note } from '../core/midiremap';
import { byNote } from '../core/notes';
import type { Edits, KnownEdits, SrcEdits } from '../core/overrides';
import { changesPair, type SelectionEvent } from '../core/selection';

/** The picker open on a drum's target note; `defaultNote` is the note the core plays it on without an edit. */
export interface TgtPick {
  kind: 'tgt';
  canon: Canon;
  octIndex: number;
  defaultNote: Note | null;
}

/** The picker open on a drum's source note; `prevNote` is the note it is read from now. */
export interface SrcPick {
  kind: 'src';
  canon: Canon;
  octIndex: number;
  prevNote: Note | null;
}

export type Pick = TgtPick | SrcPick;

/** A source note the last pick took over from another drum. */
export interface Notice {
  kind: 'notice';
  canon: Canon;
  note: Note;
  from: string;
}

/** What the editor shows over its rows: an open picker, or the notice a pick left behind. */
export type Overlay = Pick | Notice;

export interface EditorState {
  edits: Edits;
  srcEdits: SrcEdits;
  overlay: Overlay | null;
}

/** The picker among the overlays, if that is what is showing. */
export function pickOf(overlay: Overlay | null): Pick | null {
  return overlay === null || overlay.kind === 'notice' ? null : overlay;
}

type EditorAction
  = | SelectionEvent
    | { type: 'OPEN_PICK'; pick: Pick }
    | { type: 'SET_PICK_OCT'; pick: Pick; octIndex: number }
    | { type: 'CHOOSE_NOTE'; pick: TgtPick; note: Note }
    | { type: 'CHOOSE_SRC_NOTE'; pick: SrcPick; note: Note; takenFrom: string | null }
    | { type: 'SET_SRC_CANON'; note: Note; canon: Canon }
    | { type: 'CLEAR_SRC_CANON'; note: Note }
    | { type: 'CLOSE_PICK' }
    | { type: 'RESET_ROW'; canon: Canon; defaultNotes: Note[] }
    | { type: 'RESET' }
    | { type: 'LOAD'; known: KnownEdits };

export const EDITOR_START: EditorState = { edits: {}, srcEdits: {}, overlay: null };

function withEdit(edits: Edits, pick: TgtPick, note: Note): Edits {
  if (note === pick.defaultNote) {
    const next = { ...edits };
    delete next[pick.canon];
    return next;
  }
  return { ...edits, [pick.canon]: note };
}

function withoutCanon(srcEdits: SrcEdits, canon: Canon): SrcEdits {
  return Object.fromEntries(byNote(srcEdits).filter(([, c]) => c !== canon));
}

function withSourceNote(state: EditorState, pick: SrcPick, note: Note): SrcEdits {
  const next = withoutCanon(state.srcEdits, pick.canon);
  const prev = pick.prevNote;
  if (prev !== null && prev !== note && state.srcEdits[prev] !== pick.canon) next[prev] = null;
  next[note] = pick.canon;
  return next;
}

function loaded(edits: Edits, srcEdits: SrcEdits): EditorState {
  return { edits, srcEdits, overlay: null };
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
      return loaded(action.known.edits, action.known.srcEdits);
    case 'OPEN_PICK':
      return { ...state, overlay: action.pick };
    case 'SET_PICK_OCT':
      return { ...state, overlay: { ...action.pick, octIndex: action.octIndex } };
    case 'CHOOSE_NOTE':
      return { ...state, edits: withEdit(state.edits, action.pick, action.note), overlay: null };
    case 'CHOOSE_SRC_NOTE':
      return {
        ...state,
        srcEdits: withSourceNote(state, action.pick, action.note),
        overlay: action.takenFrom
          ? { kind: 'notice', canon: action.pick.canon, note: action.note, from: action.takenFrom }
          : null,
      };
    case 'SET_SRC_CANON':
      return {
        ...state,
        srcEdits: { ...state.srcEdits, [action.note]: action.canon },
        overlay: pickOf(state.overlay),
      };
    case 'CLEAR_SRC_CANON': {
      const next = { ...state.srcEdits };
      delete next[action.note];
      return { ...state, srcEdits: next, overlay: pickOf(state.overlay) };
    }
    case 'CLOSE_PICK':
      return { ...state, overlay: pickOf(state.overlay) === null ? state.overlay : null };
    case 'RESET_ROW': {
      const edits = { ...state.edits };
      delete edits[action.canon];
      const srcEdits = Object.fromEntries(
        byNote(withoutCanon(state.srcEdits, action.canon)).filter(
          ([note]) => !action.defaultNotes.includes(note),
        ),
      );
      return loaded(edits, srcEdits);
    }
    case 'RESET':
      return EDITOR_START;
    case 'LOAD':
      return loaded(action.known.edits, action.known.srcEdits);
  }
}
