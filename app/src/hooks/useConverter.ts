import { useCallback, useEffect, useReducer, useRef } from 'react';
import { remap, type Overrides } from '../lib/midiremap';
import { MID_EXT, type FileFailure, type FileResult, type LoadedFile } from '../lib/files';

export type Conv =
  | { kind: 'idle' }
  | { kind: 'running' }
  | { kind: 'done'; results: FileResult[]; failures: FileFailure[] }
  | { kind: 'error'; failures: FileFailure[]; message: string };

interface State {
  files: LoadedFile[];
  conv: Conv;
}

type Action =
  | { type: 'ADD_FILES'; files: LoadedFile[] }
  | { type: 'REMOVE_FILE'; name: string }
  | { type: 'CLEAR_FILES' }
  | { type: 'RESET_CONV' }
  | { type: 'CONVERT_START' }
  | { type: 'CONVERT_DONE'; results: FileResult[]; failures: FileFailure[] }
  | { type: 'CONVERT_ERROR'; failures: FileFailure[]; message: string };

const INITIAL: State = { files: [], conv: { kind: 'idle' } };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'ADD_FILES': {
      const names = new Set(state.files.map((f) => f.name));
      const merged = [...state.files, ...action.files.filter((f) => !names.has(f.name))];
      return { files: merged, conv: { kind: 'idle' } };
    }
    case 'REMOVE_FILE':
      return { files: state.files.filter((f) => f.name !== action.name), conv: { kind: 'idle' } };
    case 'CLEAR_FILES':
      return { files: [], conv: { kind: 'idle' } };
    case 'RESET_CONV':
      return { ...state, conv: { kind: 'idle' } };
    case 'CONVERT_START':
      return { ...state, conv: { kind: 'running' } };
    case 'CONVERT_DONE':
      return { ...state, conv: { kind: 'done', results: action.results, failures: action.failures } };
    case 'CONVERT_ERROR':
      return { ...state, conv: { kind: 'error', failures: action.failures, message: action.message } };
  }
}

function baseName(name: string): string {
  return name.replace(MID_EXT, '');
}

export function useConverter(src: string, tgt: string) {
  const [{ files, conv }, dispatch] = useReducer(reducer, INITIAL);

  const liveUrls = useRef<string[]>([]);
  useEffect(() => {
    const urls = conv.kind === 'done' ? conv.results.map((r) => r.url) : [];
    for (const u of liveUrls.current) if (!urls.includes(u)) URL.revokeObjectURL(u);
    liveUrls.current = urls;
  }, [conv]);
  useEffect(
    () => () => {
      liveUrls.current.forEach((u) => URL.revokeObjectURL(u));
    },
    [],
  );

  const addFiles = useCallback(
    (incoming: LoadedFile[]) => dispatch({ type: 'ADD_FILES', files: incoming }),
    [],
  );
  const removeFile = useCallback((name: string) => dispatch({ type: 'REMOVE_FILE', name }), []);
  const clearFiles = useCallback(() => dispatch({ type: 'CLEAR_FILES' }), []);
  const resetConv = useCallback(() => dispatch({ type: 'RESET_CONV' }), []);

  const convert = useCallback(
    async (ov: Overrides) => {
      if (files.length === 0 || !src || !tgt) return;
      dispatch({ type: 'CONVERT_START' });
      await new Promise((resolve) => setTimeout(resolve, 0));
      const ok: FileResult[] = [];
      const bad: FileFailure[] = [];
      for (const f of files) {
        try {
          const { bytes, report } = remap(f.bytes, src, tgt, ov);
          const url = URL.createObjectURL(new Blob([bytes], { type: 'audio/midi' }));
          ok.push({ name: `${baseName(f.name)}-${tgt}.mid`, url, bytes, report });
        } catch (e) {
          bad.push({ name: f.name, error: String(e) });
        }
      }
      if (ok.length > 0) dispatch({ type: 'CONVERT_DONE', results: ok, failures: bad });
      else
        dispatch({
          type: 'CONVERT_ERROR',
          failures: bad,
          message: bad[0]?.error ?? 'conversion failed',
        });
    },
    [files, src, tgt],
  );

  const results = conv.kind === 'done' ? conv.results : [];
  const failures = conv.kind === 'done' || conv.kind === 'error' ? conv.failures : [];
  const convError = conv.kind === 'error' ? conv.message : null;

  return {
    files,
    conv,
    results,
    failures,
    convError,
    addFiles,
    removeFile,
    clearFiles,
    resetConv,
    convert,
  };
}
