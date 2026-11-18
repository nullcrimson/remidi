import type { ChannelScope, EngineId, MissingDrums, Unrecognized } from '../core/midiremap';
import type { OctaveBase } from '../core/notes';
import { pairOf, type EnginePair } from '../core/enginePair';
import { sourceOf, type SelectionEvent, type SourceSwitch, type Src } from '../core/selection';
import type { Assigning } from '../editor/assigning';
import type { EditFilter } from '../editor/editFilter';
import type { Session } from './session';

/**
 * The screen on show: the converter, or the note editor with the pair it edits and the
 * filter and source notes it opens on. The editor is only ever on show with both engines chosen.
 */
export type View
  = | { kind: 'convert' }
    | { kind: 'edit'; pair: EnginePair; show: EditFilter; assigning: Assigning | null };

const CONVERT: View = { kind: 'convert' };

/** What is being converted and how, and the screen on show. */
export interface Selection {
  src: Src | null;
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
    | { type: 'SRC_FROM_LINK' }
    | { type: 'SET_OCT'; oct: OctaveBase }
    | { type: 'OPEN_EDITOR'; show: EditFilter; assigning: Assigning | null }
    | { type: 'CLOSE_EDITOR' }
    | { type: 'SET_PRESET'; presetId: string | null };

/** The selection a restored session starts on, with the converter on show and its source restored. */
export function selectionOf(session: Session): Selection {
  const { src, tgt, oct, channel, missing, unrecognized, presetId } = session;
  return { src: sourceOf(src, 'restored'), tgt, oct, channel, missing, unrecognized, presetId, view: CONVERT };
}

/** A selection with both engines chosen. */
export type ChosenSelection = Selection & { src: Src; tgt: EngineId };

/** `selection`, when both of its engines are chosen. */
export function chosenOf(selection: Selection): ChosenSelection | null {
  const { src, tgt } = selection;
  return src === null || tgt === null ? null : { ...selection, src, tgt };
}

/** A source switch on `state`: a source chosen, the pair swapped, or a pair restored; a selection with both engines chosen keeps both. */
function switched(state: ChosenSelection, event: SourceSwitch): ChosenSelection;
function switched(state: Selection, event: SourceSwitch): Selection;
function switched(state: Selection, event: SourceSwitch): Selection {
  switch (event.type) {
    case 'chooseSrc':
      return { ...state, src: { id: event.id, via: event.via }, presetId: null };
    case 'swap':
      return { ...state, src: sourceOf(state.tgt, event.via), tgt: state.src?.id ?? null, presetId: null };
    case 'loadMapping':
      return { ...state, src: { id: event.src, via: 'picked' }, tgt: event.tgt, view: CONVERT, presetId: event.presetId };
  }
}

function step(state: Selection, action: SelectionAction): Selection {
  switch (action.type) {
    case 'chooseSrc':
    case 'swap':
    case 'loadMapping':
      return switched(state, action);
    case 'chooseTgt':
      return { ...state, tgt: action.id, presetId: null };
    case 'preselect':
      return { ...state, src: action.src, tgt: action.tgt, presetId: null };
    case 'SRC_FROM_LINK':
      return { ...state, src: sourceOf(state.src?.id ?? null, 'link') };
    case 'setChannel':
      return { ...state, channel: action.channel };
    case 'setMissing':
      return { ...state, missing: action.missing };
    case 'setUnrecognized':
      return { ...state, unrecognized: action.unrecognized };
    case 'SET_OCT':
      return { ...state, oct: action.oct };
    case 'OPEN_EDITOR': {
      const pair = pairOf(state.src?.id ?? null, state.tgt);
      return pair === null ? state : { ...state, view: { kind: 'edit', pair, show: action.show, assigning: action.assigning } };
    }
    case 'CLOSE_EDITOR':
      return { ...state, view: CONVERT };
    case 'SET_PRESET':
      return { ...state, presetId: action.presetId };
  }
}

/** The view `next` shows after `state`: an editor on show follows a change of engines, or closes when one is no longer chosen. */
function followed(state: Selection, next: Selection): View {
  const src = next.src?.id ?? null;
  if (next.view.kind !== 'edit' || (src === (state.src?.id ?? null) && next.tgt === state.tgt)) return next.view;
  const pair = pairOf(src, next.tgt);
  return pair === null ? CONVERT : { ...next.view, pair };
}

/** Applies `action`; an editor on show follows a change of engines, or closes when one is no longer chosen. */
export function selectionReducer(state: Selection, action: SelectionAction): Selection {
  const next = step(state, action);
  const view = followed(state, next);
  return view === next.view ? next : { ...next, view };
}

/** Applies a source switch to a selection with both engines chosen, which keeps both chosen. */
export function switchedSelection(state: ChosenSelection, event: SourceSwitch): ChosenSelection {
  const next = switched(state, event);
  return { ...next, view: followed(state, next) };
}
