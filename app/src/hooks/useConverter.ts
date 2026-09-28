import { useCallback, useEffect, useReducer, useRef } from 'react';
import type { Channel } from '../lib/channel';
import { convertBatch } from '../lib/converter';
import type { Overrides } from '../lib/midiremap';
import type { Missing } from '../lib/missing';
import { MID_EXT, type FileFailure, type FileResult, type LoadedFile } from '../lib/files';

export type Conv
  = | { kind: 'idle' }
    | { kind: 'running' }
    | { kind: 'done'; results: FileResult[]; failures: FileFailure[] }
    | { kind: 'error'; failures: FileFailure[]; message: string };

type Stored = Exclude<Conv, { kind: 'idle' }> & { key: string };

interface State {
  files: LoadedFile[];
  skipped: string[];
  conv: Stored | { kind: 'idle' };
}

const IDLE: Conv = { kind: 'idle' };

type Action
  = | { type: 'ADD_FILES'; files: LoadedFile[]; skipped: string[] }
    | { type: 'REMOVE_FILE'; name: string }
    | { type: 'CLEAR_FILES' }
    | { type: 'RESET_CONV' }
    | { type: 'CONVERT_START'; key: string }
    | { type: 'CONVERT_DONE'; key: string; results: FileResult[]; failures: FileFailure[] }
    | { type: 'CONVERT_ERROR'; key: string; failures: FileFailure[]; message: string };

const INITIAL: State = { files: [], skipped: [], conv: { kind: 'idle' } };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'ADD_FILES': {
      const names = new Set(state.files.map((f) => f.name));
      const added = action.files.filter((f) => !names.has(f.name));
      if (added.length === 0) return { ...state, skipped: action.skipped };
      return { files: [...state.files, ...added], skipped: action.skipped, conv: { kind: 'idle' } };
    }
    case 'REMOVE_FILE':
      return {
        files: state.files.filter((f) => f.name !== action.name),
        skipped: [],
        conv: { kind: 'idle' },
      };
    case 'CLEAR_FILES':
      return { files: [], skipped: [], conv: { kind: 'idle' } };
    case 'RESET_CONV':
      return { ...state, conv: { kind: 'idle' } };
    case 'CONVERT_START':
      return { ...state, conv: { kind: 'running', key: action.key } };
    case 'CONVERT_DONE':
      return {
        ...state,
        conv: { kind: 'done', key: action.key, results: action.results, failures: action.failures },
      };
    case 'CONVERT_ERROR':
      return {
        ...state,
        conv: { kind: 'error', key: action.key, failures: action.failures, message: action.message },
      };
  }
}

function baseName(name: string): string {
  return name.replace(MID_EXT, '');
}

/**
 * Files and their conversion. `settingsKey` identifies everything a result depends on
 * besides the files; a result made under another key reads as idle. Each run names the key
 * it converts under, so a run started together with a settings change is not stale.
 */
export function useConverter(src: string, tgt: string, settingsKey: string) {
  const [{ files, skipped, conv: stored }, dispatch] = useReducer(reducer, INITIAL);
  const conv: Conv = stored.kind !== 'idle' && stored.key !== settingsKey ? IDLE : stored;
  const activeRun = useRef(0);
  const nextRun = useRef(0);

  const liveUrls = useRef<string[]>([]);
  useEffect(() => {
    const urls = stored.kind === 'done' ? stored.results.map((r) => r.url) : [];
    for (const u of liveUrls.current) if (!urls.includes(u)) URL.revokeObjectURL(u);
    liveUrls.current = urls;
  }, [stored]);
  useEffect(
    () => () => {
      liveUrls.current.forEach((u) => URL.revokeObjectURL(u));
    },
    [],
  );

  const addFiles = useCallback((incoming: LoadedFile[], skippedNames: string[] = []) => {
    if (incoming.length > 0) activeRun.current = 0;
    dispatch({ type: 'ADD_FILES', files: incoming, skipped: skippedNames });
  }, []);
  const removeFile = useCallback((name: string) => {
    activeRun.current = 0;
    dispatch({ type: 'REMOVE_FILE', name });
  }, []);
  const clearFiles = useCallback(() => {
    activeRun.current = 0;
    dispatch({ type: 'CLEAR_FILES' });
  }, []);
  const resetConv = useCallback(() => {
    activeRun.current = 0;
    dispatch({ type: 'RESET_CONV' });
  }, []);

  const convert = useCallback(
    async (
      ov: Overrides,
      channel: Channel,
      missing: Missing,
      key: string,
    ): Promise<FileResult[] | null> => {
      if (files.length === 0 || !src || !tgt) return null;
      const run = ++nextRun.current;
      activeRun.current = run;
      dispatch({ type: 'CONVERT_START', key });
      const batch = await convertBatch(files, src, tgt, ov, channel, missing);
      if (activeRun.current !== run) return null;
      const ok: FileResult[] = batch.ok.map(({ name, bytes, report }) => ({
        name: `${baseName(name)}-${tgt}.mid`,
        url: URL.createObjectURL(new Blob([bytes], { type: 'audio/midi' })),
        bytes,
        report,
      }));
      const bad: FileFailure[] = batch.failed;
      if (ok.length > 0) dispatch({ type: 'CONVERT_DONE', key, results: ok, failures: bad });
      else
        dispatch({
          type: 'CONVERT_ERROR',
          key,
          failures: bad,
          message: bad[0]?.error ?? 'conversion failed',
        });
      return ok;
    },
    [files, src, tgt],
  );

  const results = conv.kind === 'done' ? conv.results : [];
  const failures = conv.kind === 'done' || conv.kind === 'error' ? conv.failures : [];
  const convError = conv.kind === 'error' ? conv.message : null;

  return {
    files,
    skipped,
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
