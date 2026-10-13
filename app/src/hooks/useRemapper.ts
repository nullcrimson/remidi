import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { vocabularyOf } from '../lib/canon';
import type { ChannelScope, Engine, Midiremap, MissingDrums } from '../lib/midiremap';
import type { OctaveBase } from '../lib/notes';
import { editsToOverrides, knownEdits, type StoredEdits } from '../lib/overrides';
import { preselection } from '../lib/preselect';
import type { Runtime } from '../lib/runtime';
import type { SelectionEvent } from '../lib/selection';
import { loadSession, saveSession, type Session } from '../lib/session';
import { useConverter } from './useConverter';
import { useEditor } from './useEditor';
import { useEngineCatalog } from './useEngineCatalog';

export type { Conv } from './useConverter';

type View = 'convert' | 'edit';

interface Selection {
  src: string;
  tgt: string;
  oct: OctaveBase;
  channel: ChannelScope;
  missing: MissingDrums;
  view: View;
  presetId: string | null;
}

type SelectionAction
  = | SelectionEvent
    | { type: 'SET_OCT'; oct: OctaveBase }
    | { type: 'SET_VIEW'; view: View }
    | { type: 'SET_PRESET'; presetId: string | null };

const NO_ENGINES: Engine[] = [];

const INITIAL: Selection = {
  src: '',
  tgt: '',
  oct: 'c1',
  channel: 'auto',
  missing: 'nearest',
  view: 'convert',
  presetId: null,
};

function selectionOf(session: Session): Selection {
  const { src, tgt, oct, channel, missing, presetId } = session;
  return { ...INITIAL, src, tgt, oct, channel, missing, presetId };
}

function selectionReducer(state: Selection, action: SelectionAction): Selection {
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
      return { ...state, src: action.src, tgt: action.tgt, view: 'convert', presetId: action.presetId };
    case 'setChannel':
      return { ...state, channel: action.channel };
    case 'setMissing':
      return { ...state, missing: action.missing };
    case 'SET_OCT':
      return { ...state, oct: action.oct };
    case 'SET_VIEW':
      return { ...state, view: action.view };
    case 'SET_PRESET':
      return { ...state, presetId: action.presetId };
  }
}

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
  const [{ src, tgt, oct, channel, missing, view, presetId }, dispatch] = useReducer(
    selectionReducer,
    session,
    selectionOf,
  );
  const restore = useRef<(list: Engine[], core: Midiremap) => void>(() => {});
  const onCatalogReady = useCallback((list: Engine[], core: Midiremap) => restore.current(list, core), []);
  const catalog = useEngineCatalog(load, onCatalogReady);
  const { status } = catalog;
  const editor = useEditor(catalog.status === 'ready' ? catalog.core : null, src, tgt, missing);
  const { edits, srcEdits, vocabulary, load: loadEditor, onSelection: editorSees } = editor;
  const overrides = useMemo(() => editsToOverrides(edits, srcEdits), [edits, srcEdits]);
  const keyFor = useCallback(
    (m: MissingDrums) => JSON.stringify({ src, tgt, channel, missing: m, overrides }),
    [src, tgt, channel, overrides],
  );
  const settingsKey = useMemo(() => keyFor(missing), [keyFor, missing]);
  const converter = useConverter(batches, src, tgt, settingsKey);
  const { onSelection: converterSees, convert: runConvert } = converter;

  const emit = useCallback(
    (event: SelectionEvent) => {
      dispatch(event);
      editorSees(event);
      converterSees(event);
    },
    [editorSees, converterSees],
  );

  const chooseSrc = useCallback((id: string) => emit({ type: 'chooseSrc', id }), [emit]);
  const chooseTgt = useCallback((id: string) => emit({ type: 'chooseTgt', id }), [emit]);
  const swap = useCallback(() => emit({ type: 'swap' }), [emit]);
  const setChannel = useCallback((c: ChannelScope) => emit({ type: 'setChannel', channel: c }), [emit]);
  const setMissing = useCallback((m: MissingDrums) => emit({ type: 'setMissing', missing: m }), [emit]);
  const setOct = useCallback((o: OctaveBase) => dispatch({ type: 'SET_OCT', oct: o }), []);
  const setView = useCallback((v: View) => dispatch({ type: 'SET_VIEW', view: v }), []);
  const setPreset = useCallback(
    (id: string | null) => dispatch({ type: 'SET_PRESET', presetId: id }),
    [],
  );

  useEffect(() => {
    restore.current = (list, loaded) => {
      const known = new Set(list.map((e) => e.id));
      const picked = preselection(window.location.search, list);
      const keep = (id: string) => (known.has(id) ? id : '');
      let nextSrc = picked?.src ?? keep(session.src);
      let nextTgt = picked?.tgt ?? keep(session.tgt);
      if (nextSrc === nextTgt) {
        if (picked?.src) nextTgt = '';
        else nextSrc = '';
      }
      if (nextSrc !== session.src || nextTgt !== session.tgt) {
        emit({ type: 'preselect', src: nextSrc, tgt: nextTgt });
        return;
      }
      const kept = knownEdits(session, vocabularyOf(loaded.canonCatalog()));
      loadEditor(kept.edits, kept.srcEdits);
    };
  }, [session, emit, loadEditor]);

  useEffect(() => {
    const unsaved: StoredEdits = status === 'ready' ? { edits, srcEdits } : session;
    saveSession({ src, tgt, oct, channel, missing, presetId, edits: unsaved.edits, srcEdits: unsaved.srcEdits });
  }, [status, session, src, tgt, oct, channel, missing, presetId, edits, srcEdits]);

  const loadMapping = useCallback(
    (m: { id?: string; src: string; tgt: string } & StoredEdits): number => {
      const kept = knownEdits(m, vocabulary);
      emit({
        type: 'loadMapping',
        src: m.src,
        tgt: m.tgt,
        presetId: m.id ?? null,
        edits: kept.edits,
        srcEdits: kept.srcEdits,
      });
      return kept.skipped;
    },
    [vocabulary, emit],
  );

  const run = useCallback(
    async (m: MissingDrums) => {
      await runConvert(overrides, channel, m, keyFor(m));
    },
    [runConvert, overrides, channel, keyFor],
  );
  const convert = useCallback(() => run(missing), [run, missing]);
  const dropMissingAndConvert = useCallback(() => {
    emit({ type: 'setMissing', missing: 'drop' });
    return run('drop');
  }, [emit, run]);

  return {
    status,
    engines: catalog.status === 'ready' ? catalog.engines : NO_ENGINES,
    error: catalog.status === 'error' ? catalog.error : converter.convError,
    src,
    tgt,
    oct,
    channel,
    missing,
    presetId,
    files: converter.files,
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
    addFiles: converter.addFiles,
    removeFile: converter.removeFile,
    clearFiles: converter.clearFiles,
    setView,
    convert,
    dropMissingAndConvert,
    loadMapping,
    setPreset,
  };
}

export type Remapper = ReturnType<typeof useRemapper>;
