import { useCallback, useEffect, useEffectEvent, useMemo, useReducer, useState } from 'react';
import { closingProps, EMPTY_TALLY, tallyReducer, type CloseHow, type PickVia } from './editorTally';
import { track } from '../core/stats';
import { EDITOR_START, editorReducer, type Pick, type SrcPick, type TgtPick } from './editorState';
import { toAppError, type AppError } from '../core/errors';
import type { Canon, Midiremap, MissingDrums, Note, VoiceRow } from '../core/midiremap';
import type { EnginePair } from '../core/enginePair';
import { byCanon } from '../core/canon';
import { byNote, octaveIndexOf } from '../core/notes';
import { editsToOverrides, type KnownEdits } from '../core/overrides';
import type { SelectionEvent } from '../core/selection';
import { useEngineData } from './useEngineData';
import { isPlayed, leadNote, playedNote } from '../core/outcome';

export type { Notice, Pick } from './editorState';

const DEFAULT_PICK_OCTAVE = 2;

export function useEditor(
  core: Midiremap | null,
  pair: EnginePair | null,
  missing: MissingDrums,
) {
  const [{ edits, srcEdits, overlay }, dispatch] = useReducer(editorReducer, EDITOR_START);
  const [tally, count] = useReducer(tallyReducer, EMPTY_TALLY);
  const { targetDrums, sourceNotes, canonOptions, vocabulary, families, error: dataError }
    = useEngineData(core, pair);

  const { rows, planError } = useMemo<{ rows: VoiceRow[]; planError: AppError | null }>(() => {
    if (!core) return { rows: [], planError: null };
    if (dataError !== null) return { rows: [], planError: dataError };
    if (!pair) return { rows: [], planError: null };
    try {
      return { rows: core.plan(pair, editsToOverrides(edits, srcEdits), missing), planError: null };
    } catch (err) {
      return { rows: [], planError: toAppError(err) };
    }
  }, [core, pair, edits, srcEdits, missing, dataError]);

  const failedKind = planError === null ? null : planError.kind;
  useEffect(() => {
    if (failedKind !== null) track('plan-failed', { kind: failedKind });
  }, [failedKind, pair?.src, pair?.tgt]);

  const setPickOct = useCallback(
    (pick: Pick, octIndex: number) => dispatch({ type: 'SET_PICK_OCT', pick, octIndex }),
    [],
  );
  const chooseNote = useCallback(
    (pick: TgtPick, note: Note) => dispatch({ type: 'CHOOSE_NOTE', pick, note }),
    [],
  );
  const chooseSrcNote = useCallback(
    (pick: SrcPick, note: Note) => {
      const owner = rows.find((r) => r.canon !== pick.canon && r.srcNotes.includes(note));
      dispatch({ type: 'CHOOSE_SRC_NOTE', pick, note, takenFrom: owner?.label ?? null });
    },
    [rows],
  );
  const setSrcCanon = useCallback(
    (note: Note, canon: Canon) => dispatch({ type: 'SET_SRC_CANON', note, canon }),
    [],
  );
  const clearSrcCanon = useCallback((note: Note) => dispatch({ type: 'CLEAR_SRC_CANON', note }), []);
  const closePick = useCallback(() => dispatch({ type: 'CLOSE_PICK' }), []);
  const reset = useCallback(() => dispatch({ type: 'RESET' }), []);
  const onSelection = useCallback((event: SelectionEvent) => dispatch(event), []);
  const load = useCallback((known: KnownEdits) => dispatch({ type: 'LOAD', known }), []);

  const openPick = useCallback(
    (canon: Canon) => {
      const row = rows.find((r) => r.canon === canon);
      if (!row) return;
      const note = edits[canon] ?? playedNote(row.outcome) ?? leadNote(row);
      dispatch({
        type: 'OPEN_PICK',
        pick: {
          kind: 'tgt',
          canon,
          octIndex: note === null ? DEFAULT_PICK_OCTAVE : octaveIndexOf(note),
          defaultNote: row.defaultTgtNote,
        },
      });
    },
    [edits, rows],
  );
  const openSrcPick = useCallback(
    (canon: Canon) => {
      const row = rows.find((r) => r.canon === canon);
      if (!row) return;
      const note = leadNote(row) ?? playedNote(row.outcome);
      dispatch({
        type: 'OPEN_PICK',
        pick: {
          kind: 'src',
          canon,
          octIndex: note === null ? DEFAULT_PICK_OCTAVE : octaveIndexOf(note),
          prevNote: leadNote(row),
        },
      });
    },
    [rows],
  );

  const remappedCount = useMemo(
    () =>
      rows.filter((r) => r.outcome.status !== 'dropped' && isPlayed(r) && leadNote(r) !== r.outcome.tgtNote)
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
    (canon: Canon) => {
      count({ type: 'rowReset' });
      dispatch({
        type: 'RESET_ROW',
        canon,
        defaultNotes: sourceNotes.filter((n) => n.canon === canon).map((n) => n.note),
      });
    },
    [sourceNotes],
  );
  const [sessions, setSessions] = useState(0);
  const openSession = useEffectEvent(() => count({ type: 'open', edits: { edits, srcEdits } }));
  useEffect(() => {
    if (sessions > 0) openSession();
  }, [sessions]);
  const beginSession = useCallback(() => setSessions((n) => n + 1), []);
  const countPick = useCallback((via: PickVia) => count({ type: 'pick', via }), []);
  const countFilter = useCallback(() => count({ type: 'filter' }), []);
  const endSession = useCallback(
    (how: CloseHow) => track('editor-closed', closingProps(how, { edits, srcEdits }, tally)),
    [edits, srcEdits, tally],
  );
  return {
    edits,
    srcEdits,
    overlay,
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
    beginSession,
    countPick,
    countFilter,
    endSession,
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
