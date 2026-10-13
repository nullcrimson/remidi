import { useCallback, useMemo, useReducer } from 'react';
import { EDITOR_START, editorReducer } from '../lib/editorState';
import { toAppError, type AppError } from '../lib/errors';
import type { Canon, Midiremap, MissingDrums, Note, VoiceRow } from '../lib/midiremap';
import { byCanon } from '../lib/canon';
import { byNote, octaveIndexOf } from '../lib/notes';
import { editsToOverrides, type Edits, type SrcEdits } from '../lib/overrides';
import type { SelectionEvent } from '../lib/selection';
import { useEngineData } from './useEngineData';
import { playedNote } from '../lib/outcome';

export type { Notice, Pick } from '../lib/editorState';

const DEFAULT_PICK_OCTAVE = 2;

export function useEditor(
  core: Midiremap | null,
  src: string,
  tgt: string,
  missing: MissingDrums,
) {
  const [{ edits, srcEdits, pick, notice }, dispatch] = useReducer(editorReducer, EDITOR_START);
  const { targetDrums, sourceNotes, canonOptions, vocabulary, families } = useEngineData(core, src, tgt);

  const { rows, planError } = useMemo<{ rows: VoiceRow[]; planError: AppError | null }>(() => {
    if (!core || !src || !tgt) return { rows: [], planError: null };
    try {
      return { rows: core.plan(src, tgt, editsToOverrides(edits, srcEdits), missing), planError: null };
    } catch (err) {
      return { rows: [], planError: toAppError(err) };
    }
  }, [core, src, tgt, edits, srcEdits, missing]);

  const setPickOct = useCallback(
    (octIndex: number) => dispatch({ type: 'SET_PICK_OCT', octIndex }),
    [],
  );
  const chooseNote = useCallback(
    (note: Note) => dispatch({ type: 'CHOOSE_NOTE', note }),
    [],
  );
  const chooseSrcNote = useCallback(
    (note: Note) => {
      if (!pick) return;
      const owner = rows.find((r) => r.canon !== pick.canon && r.srcNotes.includes(note));
      dispatch({ type: 'CHOOSE_SRC_NOTE', note, takenFrom: owner?.label ?? null });
    },
    [pick, rows],
  );
  const setSrcCanon = useCallback(
    (note: Note, canon: Canon) => dispatch({ type: 'SET_SRC_CANON', note, canon }),
    [],
  );
  const clearSrcCanon = useCallback((note: Note) => dispatch({ type: 'CLEAR_SRC_CANON', note }), []);
  const closePick = useCallback(() => dispatch({ type: 'CLOSE_PICK' }), []);
  const reset = useCallback(() => dispatch({ type: 'RESET' }), []);
  const onSelection = useCallback((event: SelectionEvent) => dispatch(event), []);
  const load = useCallback(
    (nextEdits: Edits, nextSrcEdits: SrcEdits) =>
      dispatch({ type: 'LOAD', edits: nextEdits, srcEdits: nextSrcEdits }),
    [],
  );

  const openPick = useCallback(
    (canon: Canon) => {
      const row = rows.find((r) => r.canon === canon);
      if (!row) return;
      const note = edits[canon] ?? playedNote(row.outcome) ?? row.srcNotes[0];
      dispatch({
        type: 'OPEN_PICK',
        canon,
        octIndex: note === undefined ? DEFAULT_PICK_OCTAVE : octaveIndexOf(note),
        side: 'tgt',
        defaultNote: row.defaultTgtNote,
        prevNote: null,
      });
    },
    [edits, rows],
  );
  const openSrcPick = useCallback(
    (canon: Canon) => {
      const row = rows.find((r) => r.canon === canon);
      if (!row) return;
      const note = row.srcNotes[0] ?? playedNote(row.outcome);
      dispatch({
        type: 'OPEN_PICK',
        canon,
        octIndex: note === null ? DEFAULT_PICK_OCTAVE : octaveIndexOf(note),
        side: 'src',
        defaultNote: null,
        prevNote: row.srcNotes[0] ?? null,
      });
    },
    [rows],
  );

  const remappedCount = useMemo(
    () =>
      rows.filter((r) => r.outcome.status !== 'dropped' && r.srcNotes.length > 0 && r.srcNotes[0] !== r.outcome.tgtNote)
        .length,
    [rows],
  );
  const defaultCanon = useMemo(
    () => new Map(sourceNotes.map((n) => [n.note, n.canon])),
    [sourceNotes],
  );
  const changedSrc = useMemo(() => {
    const set = new Set<Canon>();
    for (const [note, canon] of byNote(srcEdits)) {
      if (canon !== null) set.add(canon);
      const owner = defaultCanon.get(note);
      if (owner !== undefined && owner !== canon) set.add(owner);
    }
    return set;
  }, [srcEdits, defaultCanon]);
  const changed = useMemo(
    () => new Set([...changedSrc, ...byCanon(edits).map(([canon]) => canon)]),
    [changedSrc, edits],
  );
  const resetRow = useCallback(
    (canon: Canon) =>
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
    targetDrums,
    sourceNotes,
    canonOptions,
    vocabulary,
    families,
    changed,
    changedSrc,
    resetRow,
    openPick,
    openSrcPick,
    setPickOct,
    chooseNote,
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
