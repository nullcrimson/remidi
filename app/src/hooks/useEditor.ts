import { useCallback, useMemo, useReducer } from 'react';
import {
  canonCatalog,
  engineDrums,
  engineNotes,
  familyOrder,
  plan as computePlan,
  type CanonInfo,
  type Drum,
  type VoiceRow,
} from '../lib/midiremap';
import { errorMessage } from '../lib/errors';
import type { Missing } from '../lib/missing';
import { editsToOverrides, type Edits, type SrcEdits } from '../lib/overrides';
import { noteInOctave, octaveIndexOf } from '../lib/notes';
import type { CatalogStatus } from './useEngineCatalog';

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

interface State {
  edits: Edits;
  srcEdits: SrcEdits;
  pick: Pick | null;
  notice: Notice | null;
}

type Action
  = | {
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

const INITIAL: State = { edits: {}, srcEdits: {}, pick: null, notice: null };
const DEFAULT_PICK_NOTE = 36;

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

function withSourceNote(state: State, pick: Pick, note: number): SrcEdits {
  const next = withoutCanon(state.srcEdits, pick.canon);
  const prev = pick.prevNote;
  if (prev !== null && prev !== note && state.srcEdits[prev] !== pick.canon) next[prev] = null;
  next[note] = pick.canon;
  return next;
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
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
      return { edits, srcEdits, pick: null, notice: null };
    }
    case 'RESET':
      return INITIAL;
    case 'LOAD':
      return { edits: action.edits, srcEdits: action.srcEdits, pick: null, notice: null };
  }
}

export function useEditor(
  status: CatalogStatus,
  src: string,
  tgt: string,
  missing: Missing,
  initial?: { edits: Edits; srcEdits: SrcEdits },
) {
  const [{ edits, srcEdits, pick, notice }, dispatch] = useReducer(reducer, initial, (start) =>
    start ? { ...INITIAL, edits: start.edits, srcEdits: start.srcEdits } : INITIAL,
  );

  const { rows, planError } = useMemo<{ rows: VoiceRow[]; planError: string | null }>(() => {
    if (status !== 'ready' || !src || !tgt) return { rows: [], planError: null };
    try {
      return { rows: computePlan(src, tgt, editsToOverrides(edits, srcEdits), missing), planError: null };
    } catch (err) {
      return { rows: [], planError: errorMessage(err) };
    }
  }, [status, src, tgt, edits, srcEdits, missing]);

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
    (semitone: number) => {
      if (!pick) return;
      const note = noteInOctave(pick.octIndex, semitone);
      const owner = rows.find((r) => r.canon !== pick.canon && r.srcNotes.includes(note));
      dispatch({ type: 'CHOOSE_SRC_NOTE', note, takenFrom: owner?.label ?? null });
    },
    [pick, rows],
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
      const note = edits[canon] ?? row.tgtNote ?? row.srcNotes[0] ?? DEFAULT_PICK_NOTE;
      dispatch({
        type: 'OPEN_PICK',
        canon,
        octIndex: octaveIndexOf(note),
        side: 'tgt',
        defaultNote: row.defaultTgtNote,
        prevNote: null,
      });
    },
    [edits, rows],
  );
  const openSrcPick = useCallback(
    (canon: string) => {
      const row = rows.find((r) => r.canon === canon);
      if (!row) return;
      dispatch({
        type: 'OPEN_PICK',
        canon,
        octIndex: octaveIndexOf(row.srcNotes[0] ?? row.tgtNote ?? DEFAULT_PICK_NOTE),
        side: 'src',
        defaultNote: null,
        prevNote: row.srcNotes[0] ?? null,
      });
    },
    [rows],
  );

  const remappedCount = useMemo(
    () =>
      rows.filter((r) => r.status !== 'dropped' && r.srcNotes.length > 0 && r.srcNotes[0] !== r.tgtNote)
        .length,
    [rows],
  );
  const droppedCount = useMemo(
    () => rows.filter((r) => r.status === 'dropped' && r.srcNotes.length > 0).length,
    [rows],
  );
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
  const defaultCanon = useMemo(
    () => new Map(sourceNotes.map((n) => [n.note, n.canon])),
    [sourceNotes],
  );
  const changedSrc = useMemo(() => {
    const set = new Set<string>();
    for (const [note, canon] of Object.entries(srcEdits)) {
      if (canon !== null) set.add(canon);
      const owner = defaultCanon.get(Number(note));
      if (owner !== undefined && owner !== canon) set.add(owner);
    }
    return set;
  }, [srcEdits, defaultCanon]);
  const changed = useMemo(
    () => new Set([...changedSrc, ...Object.keys(edits)]),
    [changedSrc, edits],
  );
  const resetRow = useCallback(
    (canon: string) =>
      dispatch({
        type: 'RESET_ROW',
        canon,
        defaultNotes: sourceNotes.filter((n) => n.canon === canon).map((n) => n.note),
      }),
    [sourceNotes],
  );
  const families = useMemo<string[]>(() => {
    if (status !== 'ready') return [];
    try {
      return familyOrder();
    } catch {
      return [];
    }
  }, [status]);
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
    notice,
    rows,
    planError,
    remappedCount,
    droppedCount,
    targetDrums,
    sourceNotes,
    canonOptions,
    families,
    changed,
    changedSrc,
    resetRow,
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
