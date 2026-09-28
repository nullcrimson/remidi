import { useCallback, useMemo, useReducer } from 'react';
import type { Channel } from '../lib/channel';
import { saveFile } from '../lib/download';
import type { Engine } from '../lib/midiremap';
import { loadMissing, saveMissing, type Missing } from '../lib/missing';
import type { OctaveBase } from '../lib/notes';
import { editsToOverrides, type Edits, type SrcEdits } from '../lib/overrides';
import { preselection } from '../lib/preselect';
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
  = | { type: 'CHOOSE_SRC'; id: string }
    | { type: 'CHOOSE_TGT'; id: string }
    | { type: 'SWAP' }
    | { type: 'SET_OCT'; oct: OctaveBase }
    | { type: 'SET_CHANNEL'; channel: Channel }
    | { type: 'SET_MISSING'; missing: Missing }
    | { type: 'SET_VIEW'; view: View }
    | { type: 'LOAD'; src: string; tgt: string; presetId: string | null }
    | { type: 'SET_PRESET'; presetId: string | null }
    | { type: 'PRESELECT'; src?: string; tgt?: string };

const INITIAL: Selection = {
  src: '',
  tgt: '',
  oct: 'c1',
  channel: 'auto',
  missing: 'nearest',
  view: 'convert',
  presetId: null,
};

function initialSelection(): Selection {
  return { ...INITIAL, missing: loadMissing() };
}

function selectionReducer(state: Selection, action: SelectionAction): Selection {
  switch (action.type) {
    case 'CHOOSE_SRC':
      return { ...state, src: action.id, presetId: null };
    case 'CHOOSE_TGT':
      return { ...state, tgt: action.id, presetId: null };
    case 'SWAP':
      return { ...state, src: state.tgt, tgt: state.src, presetId: null };
    case 'SET_OCT':
      return { ...state, oct: action.oct };
    case 'SET_CHANNEL':
      return { ...state, channel: action.channel };
    case 'SET_MISSING':
      return { ...state, missing: action.missing };
    case 'SET_VIEW':
      return { ...state, view: action.view };
    case 'LOAD':
      return {
        ...state,
        src: action.src,
        tgt: action.tgt,
        view: 'convert',
        presetId: action.presetId,
      };
    case 'SET_PRESET':
      return { ...state, presetId: action.presetId };
    case 'PRESELECT':
      return {
        ...state,
        src: action.src ?? state.src,
        tgt: action.tgt ?? state.tgt,
        presetId: null,
      };
  }
}

export function useRemapper() {
  const [{ src, tgt, oct, channel, missing, view, presetId }, dispatch] = useReducer(
    selectionReducer,
    undefined,
    initialSelection,
  );
  const onCatalogReady = useCallback((list: Engine[]) => {
    const picked = preselection(window.location.search, list);
    if (picked) dispatch({ type: 'PRESELECT', ...picked });
  }, []);
  const { status, engines, error: initError } = useEngineCatalog(onCatalogReady);
  const editor = useEditor(status, src, tgt, missing);
  const { edits, srcEdits } = editor;
  const overrides = useMemo(() => editsToOverrides(edits, srcEdits), [edits, srcEdits]);
  const keyFor = useCallback(
    (m: Missing) => JSON.stringify({ src, tgt, channel, missing: m, overrides }),
    [src, tgt, channel, overrides],
  );
  const settingsKey = useMemo(() => keyFor(missing), [keyFor, missing]);
  const converter = useConverter(src, tgt, settingsKey);

  const { reset: resetEditor, load: loadEditor } = editor;
  const { resetConv, convert: runConvert } = converter;

  const chooseSrc = useCallback(
    (id: string) => {
      dispatch({ type: 'CHOOSE_SRC', id });
      resetEditor();
      resetConv();
    },
    [resetEditor, resetConv],
  );
  const chooseTgt = useCallback(
    (id: string) => {
      dispatch({ type: 'CHOOSE_TGT', id });
      resetEditor();
      resetConv();
    },
    [resetEditor, resetConv],
  );
  const swap = useCallback(() => {
    dispatch({ type: 'SWAP' });
    resetEditor();
    resetConv();
  }, [resetEditor, resetConv]);
  const setOct = useCallback((o: OctaveBase) => dispatch({ type: 'SET_OCT', oct: o }), []);
  const setChannel = useCallback(
    (c: Channel) => {
      dispatch({ type: 'SET_CHANNEL', channel: c });
      resetConv();
    },
    [resetConv],
  );
  const setMissing = useCallback(
    (m: Missing) => {
      dispatch({ type: 'SET_MISSING', missing: m });
      saveMissing(m);
      resetConv();
    },
    [resetConv],
  );
  const setView = useCallback((v: View) => dispatch({ type: 'SET_VIEW', view: v }), []);

  const loadMapping = useCallback(
    (m: { id?: string; src: string; tgt: string; edits: Edits; srcEdits?: SrcEdits }) => {
      dispatch({ type: 'LOAD', src: m.src, tgt: m.tgt, presetId: m.id ?? null });
      loadEditor(m.edits, m.srcEdits ?? {});
      resetConv();
    },
    [loadEditor, resetConv],
  );
  const setPreset = useCallback(
    (id: string | null) => dispatch({ type: 'SET_PRESET', presetId: id }),
    [],
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
    dispatch({ type: 'SET_MISSING', missing: 'drop' });
    saveMissing('drop');
    return run('drop');
  }, [run]);

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
    reset: resetConv,
    loadMapping,
    setPreset,
  };
}
