import { useCallback, useEffect, useReducer, useRef } from 'react';
import type { Channel } from '../lib/channel';
import { convertBatch } from '../lib/converter';
import type { FailedFile } from '../lib/batch';
import { toAppError, type AppError } from '../lib/errors';
import type { Overrides } from '../lib/midiremap';
import type { Missing } from '../lib/missing';
import type { SelectionEvent } from '../lib/selection';
import { MID_EXT, type FileResult, type LoadedFile } from '../lib/files';
import { track } from '../lib/stats';

export type Conv
  = | { kind: 'idle' }
    | { kind: 'running' }
    | { kind: 'done'; results: FileResult[]; failures: FailedFile[] }
    | { kind: 'error'; failures: FailedFile[]; error: AppError };

type Stored = Exclude<Conv, { kind: 'idle' }> & { key: string };

interface State {
  files: LoadedFile[];
  skipped: string[];
  conv: Stored | { kind: 'idle' };
}

const IDLE: Conv = { kind: 'idle' };

type Action
  = | SelectionEvent
    | { type: 'ADD_FILES'; files: LoadedFile[]; skipped: string[] }
    | { type: 'REMOVE_FILE'; name: string }
    | { type: 'CLEAR_FILES' }
    | { type: 'CONVERT_START'; key: string }
    | { type: 'CONVERT_DONE'; key: string; results: FileResult[]; failures: FailedFile[] }
    | { type: 'CONVERT_ERROR'; key: string; failures: FailedFile[]; error: AppError };

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
    case 'chooseSrc':
    case 'chooseTgt':
    case 'swap':
    case 'preselect':
    case 'loadMapping':
    case 'setChannel':
    case 'setMissing':
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
        conv: { kind: 'error', key: action.key, failures: action.failures, error: action.error },
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
  const onSelection = useCallback((event: SelectionEvent) => {
    activeRun.current = 0;
    dispatch(event);
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
      let batch: Awaited<ReturnType<typeof convertBatch>>;
      try {
        batch = await convertBatch(files, src, tgt, ov, channel, missing);
      } catch (err) {
        track('convert-failed', { from: src, to: tgt });
        if (activeRun.current === run) {
          dispatch({
            type: 'CONVERT_ERROR',
            key,
            failures: [],
            error: toAppError(err),
          });
        }
        return null;
      }
      if (activeRun.current !== run) return null;
      const ok: FileResult[] = batch.ok.map(({ name, bytes, report }) => ({
        name: `${baseName(name)}-${tgt}.mid`,
        url: URL.createObjectURL(new Blob([bytes], { type: 'audio/midi' })),
        bytes,
        report,
      }));
      const bad = batch.failed;
      track('converted', {
        from: src,
        to: tgt,
        files: ok.length,
        failed: bad.length,
        missing,
        edited: (ov.tgt?.length ?? 0) + (ov.src?.length ?? 0) > 0,
      });
      if (ok.length > 0 || bad.length === 0) dispatch({ type: 'CONVERT_DONE', key, results: ok, failures: bad });
      else dispatch({ type: 'CONVERT_ERROR', key, failures: bad, error: bad[0].error });
      return ok;
    },
    [files, src, tgt],
  );

  const results = conv.kind === 'done' ? conv.results : [];
  const failures = conv.kind === 'done' || conv.kind === 'error' ? conv.failures : [];
  const convError = conv.kind === 'error' ? conv.error : null;

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
    onSelection,
    convert,
  };
}
