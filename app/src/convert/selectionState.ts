import type { ChannelScope, EngineId, MissingDrums, Note, Unrecognized } from '../core/midiremap';
import type { OctaveBase } from '../core/notes';
import { pairOf, type EnginePair } from '../core/enginePair';
import type { SelectionEvent } from '../core/selection';
import type { EditFilter } from '../editor/editFilter';
import type { Session } from './session';

/**
 * The screen on show: the converter, or the note editor with the pair it edits and the
 * filter and source note it opens on. The editor is only ever on show with both engines chosen.
 */
export type View
  = | { kind: 'convert' }
    | { kind: 'edit'; pair: EnginePair; show: EditFilter; assignNote: Note | null };

const CONVERT: View = { kind: 'convert' };

/** What is being converted and how, and the screen on show. */
export interface Selection {
  src: EngineId | null;
  tgt: EngineId | null;
  oct: OctaveBase;
  channel: ChannelScope;
  missing: MissingDrums;
  unrecognized: Unrecognized;
  view: View;
  presetId: string | null;
}

/** A change to the selection: one of what is converted, or one of the screen's own. */
export type SelectionAction
  = | SelectionEvent
    | { type: 'SET_OCT'; oct: OctaveBase }
    | { type: 'OPEN_EDITOR'; show: EditFilter; assignNote: Note | null }
    | { type: 'CLOSE_EDITOR' }
    | { type: 'SET_PRESET'; presetId: string | null };

/** The selection a restored session starts on, with the converter on show. */
export function selectionOf(session: Session): Selection {
  const { src, tgt, oct, channel, missing, unrecognized, presetId } = session;
  return { src, tgt, oct, channel, missing, unrecognized, presetId, view: CONVERT };
}

function step(state: Selection, action: SelectionAction): Selection {
  switch (action.type) {
    case 'chooseSrc':
      return { ...state, src: action.id, presetId: null };
    case 'chooseTgt':
      return { ...state, tgt: action.id, presetId: null };
    case 'swap':
      return { ...state, src: state.tgt, tgt: state.src, presetId: null };
    case 'preselect':
      return { ...state, src: action.src, tgt: action.tgt, presetId: null };
    case 'loadMapping':
      return { ...state, src: action.src, tgt: action.tgt, view: CONVERT, presetId: action.presetId };
    case 'setChannel':
      return { ...state, channel: action.channel };
    case 'setMissing':
      return { ...state, missing: action.missing };
    case 'setUnrecognized':
      return { ...state, unrecognized: action.unrecognized };
    case 'SET_OCT':
      return { ...state, oct: action.oct };
    case 'OPEN_EDITOR': {
      const pair = pairOf(state.src, state.tgt);
      return pair === null ? state : { ...state, view: { kind: 'edit', pair, show: action.show, assignNote: action.assignNote } };
    }
    case 'CLOSE_EDITOR':
      return { ...state, view: CONVERT };
    case 'SET_PRESET':
      return { ...state, presetId: action.presetId };
  }
}

/** Applies `action`; an editor on show follows a change of engines, or closes when one is no longer chosen. */
export function selectionReducer(state: Selection, action: SelectionAction): Selection {
  const next = step(state, action);
  if (next.view.kind !== 'edit' || (next.src === state.src && next.tgt === state.tgt)) return next;
  const pair = pairOf(next.src, next.tgt);
  return { ...next, view: pair === null ? CONVERT : { ...next.view, pair } };
}
