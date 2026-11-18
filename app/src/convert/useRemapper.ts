import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { vocabularyOf } from '../core/canon';
import type { ChannelScope, Engine, EngineId, Midiremap, MissingDrums, Unrecognized } from '../core/midiremap';
import type { OctaveBase } from '../core/notes';
import { pairOf } from '../core/enginePair';
import { track } from '../core/stats';
import { knownEdits, type StoredEdits } from '../core/overrides';
import { preselection } from './preselect';
import type { Runtime } from './runtime';
import { sourceOf, suggestedFrom, type SelectionEvent } from '../core/selection';
import { loadSession, saveSession } from './session';
import { chosenOf, selectionOf, selectionReducer } from './selectionState';
import { IDLE, useConverter, withPicks, type Conv } from './useConverter';
import { keyFor, leftBy, setupOf } from './convertSetup';
import { convertActions, type ConvertActions } from './convertActions';
import { usePartQuestions, type Offer } from './partQuestions';
import { useSourceAdvice } from './useSourceAdvice';
import { useSourceQuestion } from './useSourceQuestion';
import { useTrackedRun } from './useTrackedRun';
import { offeredAdvice } from './sourceOffer';
import type { Assigning } from '../editor/assigning';
import type { EditFilter } from '../editor/editFilter';
import { useEditor } from '../editor/useEditor';
import { useEngineCatalog } from '../engines/useEngineCatalog';

export type { Conv } from './useConverter';

const NO_ENGINES: Engine[] = [];

/**
 * The conversion step: unready until both engines are chosen, with no run on show; then the
 * ways to convert the setup on show, and what its last run came to.
 */
type ConvertRun = { kind: 'unready'; conv: typeof IDLE } | { kind: 'ready'; actions: ConvertActions; conv: Conv };

const UNREADY: ConvertRun = { kind: 'unready', conv: IDLE };

/**
 * Screen state for the converter. The last setup (engines, settings, unsaved edits) is
 * restored from the session and saved on every change; once the catalog loads, a link's
 * engine pair wins and anything this version no longer knows is dropped. Until then the
 * editor is empty and the session keeps its stored edits. Every change to
 * what is converted is one {@link SelectionEvent}, handed to the selection, the editor and
 * the converter alike.
 */
export function useRemapper({ load, converter: batches }: Runtime) {
  const [session] = useState(loadSession);
  const [selection, dispatch] = useReducer(selectionReducer, session, selectionOf);
  const { src: source, tgt, oct, channel, missing, unrecognized, view, presetId } = selection;
  const src = source?.id ?? null;
  const restore = useRef<(list: Engine[], core: Midiremap) => void>(() => {});
  const onCatalogReady = useCallback((list: Engine[], core: Midiremap) => restore.current(list, core), []);
  const catalog = useEngineCatalog(load, onCatalogReady);
  const pair = useMemo(() => pairOf(src, tgt), [src, tgt]);
  const editor = useEditor(catalog.status === 'ready' ? catalog.core : null, pair, missing);
  const { edits, srcEdits, vocabulary, load: loadEditor, onSelection: editorSees } = editor;
  const overrides = useMemo(() => ({ edits, srcEdits }), [edits, srcEdits]);
  const shown = useMemo(() => {
    const chosen = chosenOf(selection);
    return chosen === null ? null : { selection: chosen, setup: setupOf(chosen, overrides, 'none') };
  }, [selection, overrides]);
  const current = shown?.setup ?? null;
  const settingsKey = current === null ? '' : keyFor(current);
  const converter = useConverter(batches, settingsKey);
  const { onSelection: converterSees, convert: runConvert } = converter;
  const picked = useMemo(() => withPicks(converter.files, converter.picks, channel), [converter.files, converter.picks, channel]);
  const { advised, settled: adviceSettled } = useSourceAdvice(batches, picked, channel, src, tgt);
  const core = catalog.status === 'ready' ? catalog.core : null;
  const questionSetup = useMemo(
    () => ({ src, tgt, overrides, missing, unrecognized }),
    [src, tgt, overrides, missing, unrecognized],
  );
  const questions = usePartQuestions(core, converter.files, questionSetup, channel, converter.picks, converter.results);
  const askedReported = useRef(new Set<string>());
  useEffect(() => {
    for (const q of questions.asked) {
      if (askedReported.current.has(q.file)) continue;
      askedReported.current.add(q.file);
      track('parts-asked', { parts: q.parts.length });
    }
  }, [questions.asked]);
  const offered = useMemo(() => offeredAdvice(advised, src, tgt, srcEdits), [advised, src, tgt, srcEdits]);

  const emit = useCallback(
    (event: SelectionEvent) => {
      dispatch(event);
      editorSees(event);
      converterSees(event);
    },
    [editorSees, converterSees],
  );

  const chooseSrc = useCallback((id: EngineId) => emit({ type: 'chooseSrc', id, via: 'picked' }), [emit]);
  const chooseTgt = useCallback((id: EngineId) => emit({ type: 'chooseTgt', id }), [emit]);
  const swap = useCallback(() => emit({ type: 'swap', via: 'picked' }), [emit]);
  const setChannel = useCallback((c: ChannelScope) => emit({ type: 'setChannel', channel: c }), [emit]);
  const setMissing = useCallback((m: MissingDrums) => emit({ type: 'setMissing', missing: m }), [emit]);
  const setUnrecognized = useCallback((u: Unrecognized) => emit({ type: 'setUnrecognized', unrecognized: u }), [emit]);
  const setOct = useCallback((o: OctaveBase) => dispatch({ type: 'SET_OCT', oct: o }), []);
  const openEditor = useCallback(
    (show: EditFilter, assigning: Assigning | null) => dispatch({ type: 'OPEN_EDITOR', show, assigning }),
    [],
  );
  const closeEditor = useCallback(() => dispatch({ type: 'CLOSE_EDITOR' }), []);
  const setPreset = useCallback(
    (id: string | null) => dispatch({ type: 'SET_PRESET', presetId: id }),
    [],
  );

  useEffect(() => {
    restore.current = (list, loaded) => {
      const known = new Set(list.map((e) => e.id));
      const picked = preselection(window.location, list);
      const keep = (id: EngineId | null) => (id !== null && known.has(id) ? id : null);
      let nextSrc = picked?.src ?? keep(session.src);
      let nextTgt = picked?.tgt ?? keep(session.tgt);
      if (nextSrc === nextTgt) {
        if (picked?.src) nextTgt = null;
        else nextSrc = null;
      }
      if (nextSrc !== session.src || nextTgt !== session.tgt) {
        emit({ type: 'preselect', src: sourceOf(nextSrc, picked?.src ? 'link' : 'restored'), tgt: nextTgt });
        return;
      }
      if (picked?.src) dispatch({ type: 'SRC_FROM_LINK' });
      const kept = knownEdits(session, vocabularyOf(loaded.canonCatalog()));
      loadEditor(kept);
    };
  }, [session, emit, loadEditor]);

  useEffect(() => {
    const unsaved: StoredEdits = catalog.status === 'ready' ? { edits, srcEdits } : session;
    saveSession({ src, tgt, oct, channel, missing, unrecognized, presetId, edits: unsaved.edits, srcEdits: unsaved.srcEdits });
  }, [catalog.status, session, src, tgt, oct, channel, missing, unrecognized, presetId, edits, srcEdits]);

  const loadMapping = useCallback(
    (m: { id?: string; src: EngineId; tgt: EngineId } & StoredEdits): number => {
      const kept = knownEdits(m, vocabulary);
      emit({
        type: 'loadMapping',
        src: m.src,
        tgt: m.tgt,
        presetId: m.id ?? null,
        known: kept,
      });
      return kept.skipped;
    },
    [vocabulary, emit],
  );

  const run = useTrackedRun(runConvert, batches, picked);
  const sourceQuestion = useSourceQuestion({ offered, files: converter.files, picks: converter.picks, channel, src, tgt });
  const { markAsked, answered } = sourceQuestion;
  const left = useMemo(() => (current === null ? null : leftBy(current)), [current]);
  const chooseSuggested = useCallback(
    (id: EngineId) => emit({ type: 'chooseSrc', id, via: { kind: 'suggested', from: left } }),
    [emit, left],
  );
  const readAs = suggestedFrom(source);
  const ready = useMemo(() => picked.filter((f) => !questions.waiting.has(f.name)), [picked, questions.waiting]);
  const { files: queued, picks, setParts } = converter;
  const actions = useMemo(() => {
    if (shown === null) return null;
    const alsoPick = (offer: Offer) => {
      setParts(offer.file, offer.withOffers);
      return withPicks(queued, { ...picks, [offer.file]: offer.withOffers }, channel);
    };
    return convertActions({ ...shown, run, ready, emit, answered, markAsked, vocabulary, alsoPick });
  }, [shown, run, ready, emit, answered, markAsked, vocabulary, setParts, queued, picks, channel]);
  const conversion: ConvertRun = actions === null ? UNREADY : { kind: 'ready', actions, conv: converter.conv };

  return {
    catalog,
    engines: catalog.status === 'ready' ? catalog.engines : NO_ENGINES,
    src,
    tgt,
    pair,
    oct,
    channel,
    missing,
    unrecognized,
    presetId,
    files: converter.files,
    picks: converter.picks,
    setParts: converter.setParts,
    questions,
    conversion,
    sourceQuestion,
    readAs,
    offered,
    adviceSettled,
    skipped: converter.skipped,
    replaced: converter.replaced,
    view,
    results: converter.results,
    failures: converter.failures,
    editor,
    chooseSrc,
    chooseSuggested,
    chooseTgt,
    swap,
    setOct,
    setChannel,
    setMissing,
    setUnrecognized,
    addFiles: converter.addFiles,
    removeFile: converter.removeFile,
    clearFiles: converter.clearFiles,
    openEditor,
    closeEditor,
    loadMapping,
    setPreset,
  };
}

export type Remapper = ReturnType<typeof useRemapper>;
