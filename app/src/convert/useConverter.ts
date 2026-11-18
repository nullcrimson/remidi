import { useCallback, useEffect, useReducer, useRef } from 'react';
import type { Converter } from './converter';
import type { BatchResult, FailedFile } from './batch';
import type { EnginePair } from '../core/enginePair';
import { toAppError, type AppError } from '../core/errors';
import type { ChannelScope, Part } from '../core/midiremap';
import { keyFor, type ConvertSetup } from './convertSetup';
import { mergedFiles } from './mergedFiles';
import { asksForParts, pickedParts, type PickedParts } from '../core/part';
import type { SelectionEvent } from '../core/selection';
import { withoutMidExtension, type FileResult, type LoadedFile } from '../core/files';

export type Conv
  = | { kind: 'idle' }
    | { kind: 'running' }
    | { kind: 'done'; pair: EnginePair; results: FileResult[]; failures: FailedFile[]; heavy: boolean }
    | { kind: 'error'; failures: FailedFile[]; error: AppError };

/** A finished run that converted at least one file. */
export type Converted = Extract<Conv, { kind: 'done' }> & { results: [FileResult, ...FileResult[]] };

/** Whether `conv` finished with at least one converted file. */
export function isConverted(conv: Conv): conv is Converted {
  return conv.kind === 'done' && conv.results.length > 0;
}

/** What a run of the converter came to, when it was not stopped: a batch that returned, or the call failing as a whole. */
export type ConvertOutcome
  = | { kind: 'done'; ok: FileResult[]; failed: FailedFile[] }
    | { kind: 'failed'; error: AppError };

type Stored = Exclude<Conv, { kind: 'idle' }> & { key: string };

/** The drum parts picked for each file, by file name; a file with none picked has no entry. */
export type Picks = Readonly<Record<string, PickedParts>>;

/** The files, the names the last add skipped and those it replaced, the parts picked, and the run on show. */
interface State {
  files: LoadedFile[];
  skipped: string[];
  replaced: string[];
  picks: Picks;
  conv: Stored | { kind: 'idle' };
}

const NO_PICKS: Picks = {};

/** `files` with the parts picked for each attached, when the channel is one parts are picked under. */
export function withPicks(files: LoadedFile[], picks: Picks, channel: ChannelScope): LoadedFile[] {
  if (!asksForParts(channel)) return files;
  return files.map((f) => {
    const parts = picks[f.name];
    return parts === undefined ? f : { ...f, parts };
  });
}

/** No run on show. */
export const IDLE = { kind: 'idle' } as const satisfies Conv;

type Action
  = | SelectionEvent
    | { type: 'ADD_FILES'; files: LoadedFile[]; skipped: string[] }
    | { type: 'REMOVE_FILE'; name: string }
    | { type: 'CLEAR_FILES' }
    | { type: 'SET_PARTS'; name: string; parts: Part[] }
    | { type: 'CONVERT_START'; key: string }
    | { type: 'CONVERT_DONE'; key: string; pair: EnginePair; results: FileResult[]; failures: FailedFile[]; heavy: boolean }
    | { type: 'CONVERT_ERROR'; key: string; failures: FailedFile[]; error: AppError };

const INITIAL: State = { files: [], skipped: [], replaced: [], picks: NO_PICKS, conv: { kind: 'idle' } };

/** `state` with `incoming` merged in: a replaced file's parts are forgotten, and any file added takes the run on show away. */
function added(state: State, incoming: LoadedFile[], skipped: string[]): State {
  const merged = mergedFiles(state.files, incoming);
  if (merged === null) return { ...state, skipped, replaced: [] };
  const picks = Object.fromEntries(Object.entries(state.picks).filter(([name]) => !merged.fresh.has(name)));
  return { files: merged.files, skipped, replaced: merged.replaced, picks, conv: { kind: 'idle' } };
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'ADD_FILES':
      return added(state, action.files, action.skipped);
    case 'REMOVE_FILE': {
      const { [action.name]: _dropped, ...picks } = state.picks;
      return {
        files: state.files.filter((f) => f.name !== action.name),
        skipped: [],
        replaced: [],
        picks,
        conv: { kind: 'idle' },
      };
    }
    case 'CLEAR_FILES':
      return INITIAL;
    case 'SET_PARTS': {
      const { [action.name]: _previous, ...others } = state.picks;
      const parts = pickedParts(action.parts);
      const picks = parts === undefined ? others : { ...others, [action.name]: parts };
      return { ...state, picks, conv: { kind: 'idle' } };
    }
    case 'chooseSrc':
    case 'chooseTgt':
    case 'swap':
    case 'preselect':
    case 'loadMapping':
    case 'setChannel':
    case 'setMissing':
    case 'setUnrecognized':
      return { ...state, conv: { kind: 'idle' } };
    case 'CONVERT_START':
      return { ...state, conv: { kind: 'running', key: action.key } };
    case 'CONVERT_DONE':
      return {
        ...state,
        conv: { kind: 'done', key: action.key, pair: action.pair, results: action.results, failures: action.failures, heavy: action.heavy },
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
 * besides the files; a result made under another key reads as idle. Each run is handed the
 * setup it converts from and converts under that setup's key, so a run started together with
 * a settings change converts the new setup and is not stale; a run
 * handed the files it converts is not stale when they were added in the same event.
 * A run still converting is stopped through its abort signal when another starts, when
 * the files or the selection change, and when the screen goes away.
 */
export function useConverter(converter: Pick<Converter, 'convert'>, settingsKey: string) {
  const [{ files, skipped, replaced, picks, conv: stored }, dispatch] = useReducer(reducer, INITIAL);
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
  const setParts = useCallback((name: string, parts: Part[]) => {
    stop();
    dispatch({ type: 'SET_PARTS', name, parts });
  }, [stop]);
  const onSelection = useCallback((event: SelectionEvent) => {
    stop();
    dispatch(event);
  }, [stop]);

  const convert = useCallback(
    async (setup: ConvertSetup, only?: LoadedFile[]): Promise<ConvertOutcome | null> => {
      const { pair, overrides, channel, missing, unrecognized } = setup;
      const key = keyFor(setup);
      const toConvert = only ?? withPicks(files, picks, channel);
      if (toConvert.length === 0) return null;
      stop();
      const run = new AbortController();
      running.current = run;
      dispatch({ type: 'CONVERT_START', key });
      let batch: BatchResult;
      try {
        batch = await converter.convert(toConvert, pair, overrides, channel, missing, unrecognized, run.signal);
      } catch (err) {
        if (run.signal.aborted) return null;
        const error = toAppError(err);
        dispatch({ type: 'CONVERT_ERROR', key, failures: [], error });
        return { kind: 'failed', error };
      }
      if (run.signal.aborted) return null;
      const ok: FileResult[] = batch.ok.map(({ input, bytes, report, damage, picked, offers }) => ({
        name: `${withoutMidExtension(input.name)}-${pair.tgt}.mid`,
        url: URL.createObjectURL(new Blob([bytes], { type: 'audio/midi' })),
        bytes,
        report,
        damage,
        input,
        picked,
        offers,
      }));
      const asked: FailedFile[] = batch.asked.map((name) => ({ name, error: { kind: 'needsParts' } }));
      const bad = [...batch.failed, ...asked];
      if (ok.length > 0 || bad.length === 0) dispatch({ type: 'CONVERT_DONE', key, pair, results: ok, failures: bad, heavy: batch.heavy });
      else dispatch({ type: 'CONVERT_ERROR', key, failures: bad, error: bad[0].error });
      return { kind: 'done', ok, failed: bad };
    },
    [converter, files, picks, stop],
  );

  const results = conv.kind === 'done' ? conv.results : [];
  const failures = conv.kind === 'done' || conv.kind === 'error' ? conv.failures : [];

  return {
    files,
    skipped,
    replaced,
    picks,
    setParts,
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
