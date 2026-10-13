import { useCallback, useEffect, useReducer, useRef } from 'react';
import type { Converter } from './converter';
import type { BatchResult, FailedFile } from './batch';
import type { EnginePair } from '../core/enginePair';
import { toAppError, type AppError } from '../core/errors';
import type { ChannelScope, MissingDrums, Overrides } from '../core/midiremap';
import type { SelectionEvent } from '../core/selection';
import { withoutMidExtension, type FileResult, type LoadedFile } from '../core/files';

export type Conv
  = | { kind: 'idle' }
    | { kind: 'running' }
    | { kind: 'done'; pair: EnginePair; results: FileResult[]; failures: FailedFile[] }
    | { kind: 'error'; failures: FailedFile[]; error: AppError };

/** What a run of the converter came to, when it was not stopped: a batch that returned, or the call failing as a whole. */
export type ConvertOutcome
  = | { kind: 'done'; ok: FileResult[]; failed: FailedFile[] }
    | { kind: 'failed'; error: AppError };

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
    | { type: 'CONVERT_DONE'; key: string; pair: EnginePair; results: FileResult[]; failures: FailedFile[] }
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
        conv: { kind: 'done', key: action.key, pair: action.pair, results: action.results, failures: action.failures },
      };
    case 'CONVERT_ERROR':
      return {
        ...state,
        conv: { kind: 'error', key: action.key, failures: action.failures, error: action.error },
      };
  }
}

/**
 * Files and their conversion. `settingsKey` identifies everything a result depends on
 * besides the files; a result made under another key reads as idle. Each run names the key
 * it converts under, so a run started together with a settings change is not stale.
 * A run still converting is stopped through its abort signal when another starts, when
 * the files or the selection change, and when the screen goes away.
 */
export function useConverter(converter: Converter, pair: EnginePair | null, settingsKey: string) {
  const [{ files, skipped, conv: stored }, dispatch] = useReducer(reducer, INITIAL);
  const conv: Conv = stored.kind !== 'idle' && stored.key !== settingsKey ? IDLE : stored;
  const running = useRef<AbortController | null>(null);
  const stop = useCallback(() => {
    running.current?.abort();
    running.current = null;
  }, []);
  useEffect(() => stop, [stop]);

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
    if (incoming.length > 0) stop();
    dispatch({ type: 'ADD_FILES', files: incoming, skipped: skippedNames });
  }, [stop]);
  const removeFile = useCallback((name: string) => {
    stop();
    dispatch({ type: 'REMOVE_FILE', name });
  }, [stop]);
  const clearFiles = useCallback(() => {
    stop();
    dispatch({ type: 'CLEAR_FILES' });
  }, [stop]);
  const onSelection = useCallback((event: SelectionEvent) => {
    stop();
    dispatch(event);
  }, [stop]);

  const convert = useCallback(
    async (
      ov: Overrides,
      channel: ChannelScope,
      missing: MissingDrums,
      key: string,
    ): Promise<ConvertOutcome | null> => {
      if (files.length === 0 || pair === null) return null;
      stop();
      const run = new AbortController();
      running.current = run;
      dispatch({ type: 'CONVERT_START', key });
      let batch: BatchResult;
      try {
        batch = await converter.convert(files, pair, ov, channel, missing, run.signal);
      } catch (err) {
        if (run.signal.aborted) return null;
        const error = toAppError(err);
        dispatch({ type: 'CONVERT_ERROR', key, failures: [], error });
        return { kind: 'failed', error };
      }
      if (run.signal.aborted) return null;
      const ok: FileResult[] = batch.ok.map(({ name, bytes, report }) => ({
        name: `${withoutMidExtension(name)}-${pair.tgt}.mid`,
        url: URL.createObjectURL(new Blob([bytes], { type: 'audio/midi' })),
        bytes,
        report,
      }));
      const bad = batch.failed;
      if (ok.length > 0 || bad.length === 0) dispatch({ type: 'CONVERT_DONE', key, pair, results: ok, failures: bad });
      else dispatch({ type: 'CONVERT_ERROR', key, failures: bad, error: bad[0].error });
      return { kind: 'done', ok, failed: bad };
    },
    [converter, files, pair, stop],
  );

  const results = conv.kind === 'done' ? conv.results : [];
  const failures = conv.kind === 'done' || conv.kind === 'error' ? conv.failures : [];

  return {
    files,
    skipped,
    conv,
    results,
    failures,
    addFiles,
    removeFile,
    clearFiles,
    onSelection,
    convert,
  };
}
