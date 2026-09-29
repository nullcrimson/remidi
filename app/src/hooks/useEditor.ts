import { useCallback, useMemo, useReducer } from 'react';
import { EDITOR_START, editorReducer } from '../lib/editorState';
import { toAppError, type AppError } from '../lib/errors';
import { plan as computePlan, type VoiceRow } from '../lib/midiremap';
import type { Missing } from '../lib/missing';
import { noteInOctave, octaveIndexOf } from '../lib/notes';
import { editsToOverrides, type Edits, type SrcEdits } from '../lib/overrides';
import type { SelectionEvent } from '../lib/selection';
import type { CatalogStatus } from './useEngineCatalog';
import { useEngineData } from './useEngineData';

export type { Notice, Pick } from '../lib/editorState';

const DEFAULT_PICK_NOTE = 36;

export function useEditor(
  status: CatalogStatus,
  src: string,
  tgt: string,
  missing: Missing,
  initial?: { edits: Edits; srcEdits: SrcEdits },
) {
  const [{ edits, srcEdits, pick, notice }, dispatch] = useReducer(editorReducer, initial, (start) =>
    start ? { ...EDITOR_START, edits: start.edits, srcEdits: start.srcEdits } : EDITOR_START,
  );
  const { targetDrums, sourceNotes, canonOptions, families } = useEngineData(status, src, tgt);

  const { rows, planError } = useMemo<{ rows: VoiceRow[]; planError: AppError | null }>(() => {
    if (status !== 'ready' || !src || !tgt) return { rows: [], planError: null };
    try {
      return { rows: computePlan(src, tgt, editsToOverrides(edits, srcEdits), missing), planError: null };
    } catch (err) {
      return { rows: [], planError: toAppError(err) };
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
  const onSelection = useCallback((event: SelectionEvent) => dispatch(event), []);
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
    onSelection,
  };
}

export type Editor = ReturnType<typeof useEditor>;
