import { useCallback, useReducer } from 'react';
import type { Engine } from '../lib/midiremap';
import { editsToOverrides, type Edits, type SrcEdits } from '../lib/overrides';
import { preselection } from '../lib/preselect';
import { useConverter } from './useConverter';
import { useEditor } from './useEditor';
import { useEngineCatalog } from './useEngineCatalog';

export type { Conv } from './useConverter';

type View = 'convert' | 'edit';
type Oct = 'c1' | 'c2';

interface Selection {
  src: string;
  tgt: string;
  oct: Oct;
  view: View;
}

type SelectionAction
  = | { type: 'CHOOSE_SRC'; id: string }
    | { type: 'CHOOSE_TGT'; id: string }
    | { type: 'SWAP' }
    | { type: 'TOGGLE_OCT' }
    | { type: 'SET_VIEW'; view: View }
    | { type: 'LOAD'; src: string; tgt: string }
    | { type: 'PRESELECT'; src?: string; tgt?: string };

const INITIAL: Selection = { src: '', tgt: '', oct: 'c1', view: 'convert' };

function selectionReducer(state: Selection, action: SelectionAction): Selection {
  switch (action.type) {
    case 'CHOOSE_SRC':
      return { ...state, src: action.id };
    case 'CHOOSE_TGT':
      return { ...state, tgt: action.id };
    case 'SWAP':
      return { ...state, src: state.tgt, tgt: state.src };
    case 'TOGGLE_OCT':
      return { ...state, oct: state.oct === 'c1' ? 'c2' : 'c1' };
    case 'SET_VIEW':
      return { ...state, view: action.view };
    case 'LOAD':
      return { ...state, src: action.src, tgt: action.tgt, view: 'convert' };
    case 'PRESELECT':
      return { ...state, src: action.src ?? state.src, tgt: action.tgt ?? state.tgt };
  }
}

export function useRemapper() {
  const [{ src, tgt, oct, view }, dispatch] = useReducer(selectionReducer, INITIAL);
  const onCatalogReady = useCallback((list: Engine[]) => {
    const picked = preselection(window.location.search, list);
    if (picked) dispatch({ type: 'PRESELECT', ...picked });
  }, []);
  const { status, engines, error: initError } = useEngineCatalog(onCatalogReady);
  const editor = useEditor(status, src, tgt);
  const converter = useConverter(src, tgt);

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
  const toggleOct = useCallback(() => dispatch({ type: 'TOGGLE_OCT' }), []);
  const setView = useCallback((v: View) => dispatch({ type: 'SET_VIEW', view: v }), []);

  const loadMapping = useCallback(
    (m: { src: string; tgt: string; edits: Edits; srcEdits?: SrcEdits }) => {
      dispatch({ type: 'LOAD', src: m.src, tgt: m.tgt });
      loadEditor(m.edits, m.srcEdits ?? {});
      resetConv();
    },
    [loadEditor, resetConv],
  );

  const { edits, srcEdits } = editor;
  const convert = useCallback(
    () => runConvert(editsToOverrides(edits, srcEdits)),
    [runConvert, edits, srcEdits],
  );

  return {
    status,
    engines,
    error: initError ?? converter.convError,
    src,
    tgt,
    oct,
    files: converter.files,
    view,
    conv: converter.conv,
    results: converter.results,
    failures: converter.failures,
    editor,
    chooseSrc,
    chooseTgt,
    swap,
    toggleOct,
    addFiles: converter.addFiles,
    removeFile: converter.removeFile,
    clearFiles: converter.clearFiles,
    setView,
    convert,
    reset: resetConv,
    loadMapping,
  };
}
