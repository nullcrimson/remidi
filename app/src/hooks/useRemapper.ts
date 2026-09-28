import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import type { Channel } from '../lib/channel';
import { saveFile } from '../lib/download';
import { canonCatalog, type Engine } from '../lib/midiremap';
import type { Missing } from '../lib/missing';
import type { OctaveBase } from '../lib/notes';
import { editsToOverrides, knownEdits, type Edits, type SrcEdits } from '../lib/overrides';
import { preselection } from '../lib/preselect';
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
  channel: Channel;
  missing: Missing;
  view: View;
  presetId: string | null;
}

type SelectionAction
  = | SelectionEvent
    | { type: 'SET_OCT'; oct: OctaveBase }
    | { type: 'SET_VIEW'; view: View }
    | { type: 'SET_PRESET'; presetId: string | null };

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

function knownCanons(): Set<string> | null {
  try {
    return new Set(canonCatalog().map((c) => c.canon));
  } catch {
    return null;
  }
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
 * engine pair wins and anything this version no longer knows is dropped. Every change to
 * what is converted is one {@link SelectionEvent}, handed to the selection, the editor and
 * the converter alike.
 */
export function useRemapper() {
  const [session] = useState(loadSession);
  const [{ src, tgt, oct, channel, missing, view, presetId }, dispatch] = useReducer(
    selectionReducer,
    session,
    selectionOf,
  );
  const restore = useRef<(list: Engine[]) => void>(() => {});
  const onCatalogReady = useCallback((list: Engine[]) => restore.current(list), []);
  const { status, engines, error: initError } = useEngineCatalog(onCatalogReady);
  const editor = useEditor(status, src, tgt, missing, session);
  const { edits, srcEdits, canonOptions, load: loadEditor, onSelection: editorSees } = editor;
  const overrides = useMemo(() => editsToOverrides(edits, srcEdits), [edits, srcEdits]);
  const keyFor = useCallback(
    (m: Missing) => JSON.stringify({ src, tgt, channel, missing: m, overrides }),
    [src, tgt, channel, overrides],
  );
  const settingsKey = useMemo(() => keyFor(missing), [keyFor, missing]);
  const converter = useConverter(src, tgt, settingsKey);
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
  const setChannel = useCallback((c: Channel) => emit({ type: 'setChannel', channel: c }), [emit]);
  const setMissing = useCallback((m: Missing) => emit({ type: 'setMissing', missing: m }), [emit]);
  const setOct = useCallback((o: OctaveBase) => dispatch({ type: 'SET_OCT', oct: o }), []);
  const setView = useCallback((v: View) => dispatch({ type: 'SET_VIEW', view: v }), []);
  const setPreset = useCallback(
    (id: string | null) => dispatch({ type: 'SET_PRESET', presetId: id }),
    [],
  );

  useEffect(() => {
    restore.current = (list) => {
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
      const canons = knownCanons();
      if (!canons) return;
      const kept = knownEdits(session.edits, session.srcEdits, canons);
      if (kept.skipped > 0) loadEditor(kept.edits, kept.srcEdits);
    };
  }, [session, emit, loadEditor]);

  useEffect(() => {
    saveSession({ src, tgt, oct, channel, missing, presetId, edits, srcEdits });
  }, [src, tgt, oct, channel, missing, presetId, edits, srcEdits]);

  const loadMapping = useCallback(
    (m: { id?: string; src: string; tgt: string; edits: Edits; srcEdits?: SrcEdits }): number => {
      const all = { edits: m.edits, srcEdits: m.srcEdits ?? {} };
      const kept
        = canonOptions.length > 0
          ? knownEdits(all.edits, all.srcEdits, new Set(canonOptions.map((c) => c.canon)))
          : { ...all, skipped: 0 };
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
    [canonOptions, emit],
  );

  const run = useCallback(
    async (m: Missing) => {
      const results = await runConvert(overrides, channel, m, keyFor(m));
      if (results?.length === 1) saveFile(results[0].url, results[0].name);
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
    engines,
    error: initError ?? converter.convError,
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
