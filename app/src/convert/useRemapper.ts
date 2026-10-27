import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { vocabularyOf } from '../core/canon';
import type { ChannelScope, Engine, EngineId, Midiremap, MissingDrums, Note, Unrecognized } from '../core/midiremap';
import type { OctaveBase } from '../core/notes';
import { pairOf } from '../core/enginePair';
import { kindCounts } from '../core/errors';
import { track } from '../core/stats';
import { convertedProps } from '../report/report';
import { editCount, knownEdits, type StoredEdits } from '../core/overrides';
import { preselection } from './preselect';
import type { Runtime } from './runtime';
import type { SelectionEvent } from '../core/selection';
import { loadSession, saveSession } from './session';
import { selectionOf, selectionReducer } from './selectionState';
import { useConverter } from './useConverter';
import { useSourceFits } from './useSourceFits';
import type { EditFilter } from '../editor/editFilter';
import type { LoadedFile } from '../core/files';
import { useEditor } from '../editor/useEditor';
import { useEngineCatalog } from '../engines/useEngineCatalog';

export type { Conv } from './useConverter';

const NO_ENGINES: Engine[] = [];

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
  const [{ src, tgt, oct, channel, missing, unrecognized, view, presetId }, dispatch] = useReducer(
    selectionReducer,
    session,
    selectionOf,
  );
  const restore = useRef<(list: Engine[], core: Midiremap) => void>(() => {});
  const onCatalogReady = useCallback((list: Engine[], core: Midiremap) => restore.current(list, core), []);
  const catalog = useEngineCatalog(load, onCatalogReady);
  const pair = useMemo(() => pairOf(src, tgt), [src, tgt]);
  const editor = useEditor(catalog.status === 'ready' ? catalog.core : null, pair, missing);
  const { edits, srcEdits, vocabulary, load: loadEditor, onSelection: editorSees } = editor;
  const overrides = useMemo(() => ({ edits, srcEdits }), [edits, srcEdits]);
  const keyFor = useCallback(
    (m: MissingDrums) => JSON.stringify({ pair, channel, missing: m, unrecognized, overrides }),
    [pair, channel, unrecognized, overrides],
  );
  const settingsKey = useMemo(() => keyFor(missing), [keyFor, missing]);
  const converter = useConverter(batches, pair, settingsKey);
  const { onSelection: converterSees, convert: runConvert } = converter;
  const fits = useSourceFits(batches, converter.files, channel);

  const emit = useCallback(
    (event: SelectionEvent) => {
      dispatch(event);
      editorSees(event);
      converterSees(event);
    },
    [editorSees, converterSees],
  );

  const chooseSrc = useCallback((id: EngineId) => emit({ type: 'chooseSrc', id }), [emit]);
  const chooseTgt = useCallback((id: EngineId) => emit({ type: 'chooseTgt', id }), [emit]);
  const swap = useCallback(() => emit({ type: 'swap' }), [emit]);
  const setChannel = useCallback((c: ChannelScope) => emit({ type: 'setChannel', channel: c }), [emit]);
  const setMissing = useCallback((m: MissingDrums) => emit({ type: 'setMissing', missing: m }), [emit]);
  const setUnrecognized = useCallback((u: Unrecognized) => emit({ type: 'setUnrecognized', unrecognized: u }), [emit]);
  const setOct = useCallback((o: OctaveBase) => dispatch({ type: 'SET_OCT', oct: o }), []);
  const openEditor = useCallback(
    (show: EditFilter, assignNote: Note | null) => dispatch({ type: 'OPEN_EDITOR', show, assignNote }),
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
        emit({ type: 'preselect', src: nextSrc, tgt: nextTgt });
        return;
      }
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

  const run = useCallback(
    async (m: MissingDrums, files?: LoadedFile[]) => {
      const outcome = await runConvert(overrides, channel, m, unrecognized, keyFor(m), files);
      if (outcome === null || pair === null) return;
      if (outcome.kind === 'failed') {
        track('convert-failed', { from: pair.src, to: pair.tgt, kind: outcome.error.kind });
        return;
      }
      for (const [kind, files] of kindCounts(outcome.failed.map((file) => file.error))) track('file-failed', { kind, files });
      track('converted', convertedProps(pair, outcome.ok.map((file) => file.report), outcome.failed.length, {
        missing: m,
        edited: editCount({ edits, srcEdits }) > 0,
        preset: presetId !== null,
      }));
    },
    [runConvert, overrides, channel, unrecognized, keyFor, pair, edits, srcEdits, presetId],
  );
  const convert = useCallback((files?: LoadedFile[]) => run(missing, files), [run, missing]);
  const dropMissingAndConvert = useCallback(() => {
    emit({ type: 'setMissing', missing: 'drop' });
    return run('drop');
  }, [emit, run]);

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
    fits,
    skipped: converter.skipped,
    view,
    conv: converter.conv,
    results: converter.results,
    failures: converter.failures,
    editor,
    chooseSrc,
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
    convert,
    dropMissingAndConvert,
    loadMapping,
    setPreset,
  };
}

export type Remapper = ReturnType<typeof useRemapper>;
