import { useCallback, useMemo, useReducer } from 'react';
import {
  canonCatalog,
  engineDrums,
  engineNotes,
  plan as computePlan,
  type CanonInfo,
  type Drum,
  type VoiceRow,
} from '../lib/midiremap';
import { editsToOverrides, type Edits, type SrcEdits } from '../lib/overrides';
import { noteInOctave, octaveIndexOf } from '../lib/notes';
import type { CatalogStatus } from './useEngineCatalog';

type PickSide = 'tgt' | 'src';

export interface Pick {
  canon: string;
  octIndex: number;
  side: PickSide;
  defaultNote: number | null;
}

interface State {
  edits: Edits;
  srcEdits: SrcEdits;
  pick: Pick | null;
}

type Action =
  | { type: 'OPEN_PICK'; canon: string; octIndex: number; side: PickSide; defaultNote: number | null }
  | { type: 'SET_PICK_OCT'; octIndex: number }
  | { type: 'CHOOSE_NOTE'; semitone: number }
  | { type: 'CHOOSE_NOTE_ABS'; note: number }
  | { type: 'CHOOSE_SRC_NOTE'; semitone: number }
  | { type: 'SET_SRC_CANON'; note: number; canon: string }
  | { type: 'CLEAR_SRC_CANON'; note: number }
  | { type: 'CLOSE_PICK' }
  | { type: 'RESET' }
  | { type: 'LOAD'; edits: Edits; srcEdits: SrcEdits };

const INITIAL: State = { edits: {}, srcEdits: {}, pick: null };

function withEdit(edits: Edits, canon: string, note: number, defaultNote: number | null): Edits {
  if (note === defaultNote) {
    const next = { ...edits };
    delete next[canon];
    return next;
  }
  return { ...edits, [canon]: note };
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'OPEN_PICK':
      return {
        ...state,
        pick: {
          canon: action.canon,
          octIndex: action.octIndex,
          side: action.side,
          defaultNote: action.defaultNote,
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
            srcEdits: {
              ...state.srcEdits,
              [noteInOctave(state.pick.octIndex, action.semitone)]: state.pick.canon,
            },
            pick: null,
          }
        : state;
    case 'SET_SRC_CANON':
      return { ...state, srcEdits: { ...state.srcEdits, [action.note]: action.canon } };
    case 'CLEAR_SRC_CANON': {
      const next = { ...state.srcEdits };
      delete next[action.note];
      return { ...state, srcEdits: next };
    }
    case 'CLOSE_PICK':
      return { ...state, pick: null };
    case 'RESET':
      return INITIAL;
    case 'LOAD':
      return { edits: action.edits, srcEdits: action.srcEdits, pick: null };
  }
}

export function useEditor(status: CatalogStatus, src: string, tgt: string) {
  const [{ edits, srcEdits, pick }, dispatch] = useReducer(reducer, INITIAL);

  const rows = useMemo<VoiceRow[]>(
    () =>
      status === 'ready' && src && tgt
        ? computePlan(src, tgt, editsToOverrides(edits, srcEdits))
        : [],
    [status, src, tgt, edits, srcEdits],
  );

  const baseTgtByCanon = useMemo<Record<string, number | null>>(() => {
    if (status !== 'ready' || !src || !tgt) return {};
    const map: Record<string, number | null> = {};
    for (const r of computePlan(src, tgt, editsToOverrides({}, srcEdits))) map[r.canon] = r.tgtNote;
    return map;
  }, [status, src, tgt, srcEdits]);

  const setPickOct = useCallback(
    (octIndex: number) => dispatch({ type: 'SET_PICK_OCT', octIndex }),
    [],
  );
  const chooseNote = useCallback(
    (semitone: number) => dispatch({ type: 'CHOOSE_NOTE', semitone }),
    [],
  );
  const chooseNoteAbsolute = useCallback(
    (note: number) => dispatch({ type: 'CHOOSE_NOTE_ABS', note }),
    [],
  );
  const chooseSrcNote = useCallback(
    (semitone: number) => dispatch({ type: 'CHOOSE_SRC_NOTE', semitone }),
    [],
  );
  const setSrcCanon = useCallback(
    (note: number, canon: string) => dispatch({ type: 'SET_SRC_CANON', note, canon }),
    [],
  );
  const clearSrcCanon = useCallback((note: number) => dispatch({ type: 'CLEAR_SRC_CANON', note }), []);
  const closePick = useCallback(() => dispatch({ type: 'CLOSE_PICK' }), []);
  const reset = useCallback(() => dispatch({ type: 'RESET' }), []);
  const load = useCallback(
    (nextEdits: Edits, nextSrcEdits: SrcEdits) =>
      dispatch({ type: 'LOAD', edits: nextEdits, srcEdits: nextSrcEdits }),
    [],
  );

  const openPick = useCallback(
    (canon: string) => {
      const row = rows.find((r) => r.canon === canon);
      if (!row) return;
      const note = edits[canon] ?? row.tgtNote ?? row.srcNote;
      dispatch({
        type: 'OPEN_PICK',
        canon,
        octIndex: octaveIndexOf(note),
        side: 'tgt',
        defaultNote: baseTgtByCanon[canon] ?? null,
      });
    },
    [edits, rows, baseTgtByCanon],
  );
  const openSrcPick = useCallback(
    (canon: string) => {
      const row = rows.find((r) => r.canon === canon);
      if (!row) return;
      dispatch({
        type: 'OPEN_PICK',
        canon,
        octIndex: octaveIndexOf(row.srcNote),
        side: 'src',
        defaultNote: null,
      });
    },
    [rows],
  );

  const remappedCount = useMemo(
    () => rows.filter((r) => r.status !== 'dropped' && r.tgtNote !== r.srcNote).length,
    [rows],
  );
  const droppedCount = useMemo(() => rows.filter((r) => r.status === 'dropped').length, [rows]);
  const targetDrums = useMemo<Drum[]>(() => {
    if (status !== 'ready' || !tgt) return [];
    try {
      return engineDrums(tgt);
    } catch {
      return [];
    }
  }, [status, tgt]);
  const sourceNotes = useMemo<Drum[]>(() => {
    if (status !== 'ready' || !src) return [];
    try {
      return engineNotes(src);
    } catch {
      return [];
    }
  }, [status, src]);
  const canonOptions = useMemo<CanonInfo[]>(() => {
    if (status !== 'ready') return [];
    try {
      return canonCatalog();
    } catch {
      return [];
    }
  }, [status]);

  return {
    edits,
    srcEdits,
    pick,
    rows,
    remappedCount,
    droppedCount,
    targetDrums,
    sourceNotes,
    canonOptions,
    openPick,
    openSrcPick,
    setPickOct,
    chooseNote,
    chooseNoteAbsolute,
    chooseSrcNote,
    setSrcCanon,
    clearSrcCanon,
    closePick,
    reset,
    load,
  };
}

export type Editor = ReturnType<typeof useEditor>;
