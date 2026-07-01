import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import {
  engineDrums,
  engines as listEngines,
  plan as computePlan,
  ready,
  remap,
  type Drum,
  type Engine,
  type VoiceRow,
} from '../lib/midiremap';
import { MID_EXT, type FileFailure, type FileResult, type LoadedFile } from '../lib/files';
import { editsToOverrides, effectiveTgt, type Edits } from '../lib/overrides';
import { noteInOctave, octaveIndexOf } from '../lib/notes';

type Status = 'loading' | 'ready' | 'error';
type View = 'convert' | 'edit';
type Oct = 'c1' | 'c2';

export type Conv =
  | { kind: 'idle' }
  | { kind: 'running' }
  | { kind: 'done'; results: FileResult[]; failures: FileFailure[] }
  | { kind: 'error'; failures: FileFailure[]; message: string };

interface Pick {
  canon: string;
  octIndex: number;
}

interface State {
  src: string;
  tgt: string;
  oct: Oct;
  view: View;
  files: LoadedFile[];
  conv: Conv;
  edits: Edits;
  pick: Pick | null;
}

type Action =
  | { type: 'CHOOSE_SRC'; id: string }
  | { type: 'CHOOSE_TGT'; id: string }
  | { type: 'SWAP' }
  | { type: 'TOGGLE_OCT' }
  | { type: 'SET_VIEW'; view: View }
  | { type: 'ADD_FILES'; files: LoadedFile[] }
  | { type: 'REMOVE_FILE'; name: string }
  | { type: 'CLEAR_FILES' }
  | { type: 'OPEN_PICK'; canon: string; octIndex: number }
  | { type: 'SET_PICK_OCT'; octIndex: number }
  | { type: 'CHOOSE_NOTE'; semitone: number }
  | { type: 'CHOOSE_NOTE_ABS'; note: number }
  | { type: 'CLOSE_PICK' }
  | { type: 'CONVERT_DONE'; results: FileResult[]; failures: FileFailure[] }
  | { type: 'CONVERT_ERROR'; failures: FileFailure[]; message: string }
  | { type: 'RESET' };

const INITIAL: State = {
  src: '',
  tgt: '',
  oct: 'c1',
  view: 'convert',
  files: [],
  conv: { kind: 'idle' },
  edits: {},
  pick: null,
};

const engineReset = { conv: { kind: 'idle' } as Conv, edits: {} as Edits, pick: null };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'CHOOSE_SRC':
      return { ...state, src: action.id, ...engineReset };
    case 'CHOOSE_TGT':
      return { ...state, tgt: action.id, ...engineReset };
    case 'SWAP':
      return { ...state, src: state.tgt, tgt: state.src, ...engineReset };
    case 'TOGGLE_OCT':
      return { ...state, oct: state.oct === 'c1' ? 'c2' : 'c1' };
    case 'SET_VIEW':
      return { ...state, view: action.view };
    case 'ADD_FILES': {
      const names = new Set(state.files.map((f) => f.name));
      const merged = [...state.files, ...action.files.filter((f) => !names.has(f.name))];
      return { ...state, files: merged, conv: { kind: 'idle' } };
    }
    case 'REMOVE_FILE':
      return {
        ...state,
        files: state.files.filter((f) => f.name !== action.name),
        conv: { kind: 'idle' },
      };
    case 'CLEAR_FILES':
      return { ...state, files: [], conv: { kind: 'idle' } };
    case 'OPEN_PICK':
      return { ...state, pick: { canon: action.canon, octIndex: action.octIndex } };
    case 'SET_PICK_OCT':
      return state.pick ? { ...state, pick: { ...state.pick, octIndex: action.octIndex } } : state;
    case 'CHOOSE_NOTE':
      return state.pick
        ? {
            ...state,
            edits: {
              ...state.edits,
              [state.pick.canon]: noteInOctave(state.pick.octIndex, action.semitone),
            },
            pick: null,
          }
        : state;
    case 'CHOOSE_NOTE_ABS':
      return state.pick
        ? { ...state, edits: { ...state.edits, [state.pick.canon]: action.note }, pick: null }
        : state;
    case 'CLOSE_PICK':
      return { ...state, pick: null };
    case 'CONVERT_DONE':
      return { ...state, conv: { kind: 'done', results: action.results, failures: action.failures } };
    case 'CONVERT_ERROR':
      return {
        ...state,
        conv: { kind: 'error', failures: action.failures, message: action.message },
      };
    case 'RESET':
      return { ...state, conv: { kind: 'idle' } };
  }
}

function baseName(name: string): string {
  return name.replace(MID_EXT, '');
}

export function useRemapper() {
  const [status, setStatus] = useState<Status>('loading');
  const [engines, setEngines] = useState<Engine[]>([]);
  const [initError, setInitError] = useState<string | null>(null);
  const [state, dispatch] = useReducer(reducer, INITIAL);
  const { src, tgt, oct, view, files, conv, edits, pick } = state;

  useEffect(() => {
    let cancelled = false;
    ready()
      .then(() => {
        if (cancelled) return;
        setEngines(listEngines());
        setStatus('ready');
      })
      .catch((e) => {
        if (!cancelled) {
          setInitError(String(e));
          setStatus('error');
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

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

  const rows = useMemo<VoiceRow[]>(
    () => (status === 'ready' && src && tgt ? computePlan(src, tgt) : []),
    [status, src, tgt],
  );

  const chooseSrc = useCallback((id: string) => dispatch({ type: 'CHOOSE_SRC', id }), []);
  const chooseTgt = useCallback((id: string) => dispatch({ type: 'CHOOSE_TGT', id }), []);
  const swap = useCallback(() => dispatch({ type: 'SWAP' }), []);
  const toggleOct = useCallback(() => dispatch({ type: 'TOGGLE_OCT' }), []);
  const setView = useCallback((v: View) => dispatch({ type: 'SET_VIEW', view: v }), []);
  const addFiles = useCallback(
    (incoming: LoadedFile[]) => dispatch({ type: 'ADD_FILES', files: incoming }),
    [],
  );
  const removeFile = useCallback((name: string) => dispatch({ type: 'REMOVE_FILE', name }), []);
  const clearFiles = useCallback(() => dispatch({ type: 'CLEAR_FILES' }), []);
  const setPickOct = useCallback(
    (octIndex: number) => dispatch({ type: 'SET_PICK_OCT', octIndex }),
    [],
  );
  const chooseNote = useCallback(
    (semitone: number) => dispatch({ type: 'CHOOSE_NOTE', semitone }),
    [],
  );
  const chooseNoteAbsolute = useCallback(
    (note: number) => dispatch({ type: 'CHOOSE_NOTE_ABS', note }),
    [],
  );
  const closePick = useCallback(() => dispatch({ type: 'CLOSE_PICK' }), []);
  const reset = useCallback(() => dispatch({ type: 'RESET' }), []);

  const openPick = useCallback(
    (canon: string) => {
      const row = rows.find((r) => r.canon === canon);
      if (!row) return;
      const note = edits[canon] ?? row.tgtNote ?? row.srcNote;
      dispatch({ type: 'OPEN_PICK', canon, octIndex: octaveIndexOf(note) });
    },
    [edits, rows],
  );

  const convert = useCallback(() => {
    if (files.length === 0 || !src || !tgt) return;
    const ov = editsToOverrides(edits);
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
    else dispatch({ type: 'CONVERT_ERROR', failures: bad, message: bad[0]?.error ?? 'conversion failed' });
  }, [edits, files, src, tgt]);

  const remappedCount = useMemo(
    () => rows.filter((r) => r.status !== 'dropped' && effectiveTgt(r, edits) !== r.srcNote).length,
    [rows, edits],
  );
  const droppedCount = useMemo(() => rows.filter((r) => r.status === 'dropped').length, [rows]);
  const targetDrums = useMemo<Drum[]>(() => {
    if (status !== 'ready' || !tgt) return [];
    try {
      return engineDrums(tgt);
    } catch {
      return [];
    }
  }, [status, tgt]);

  const results = conv.kind === 'done' ? conv.results : [];
  const failures = conv.kind === 'done' || conv.kind === 'error' ? conv.failures : [];
  const convError = conv.kind === 'error' ? conv.message : null;

  return {
    status,
    engines,
    targetDrums,
    error: initError ?? convError,
    src,
    tgt,
    oct,
    files,
    view,
    conv,
    results,
    failures,
    rows,
    edits,
    remappedCount,
    droppedCount,
    voiceCount: rows.length,
    chooseSrc,
    chooseTgt,
    swap,
    toggleOct,
    addFiles,
    removeFile,
    clearFiles,
    setView,
    convert,
    reset,
    pick,
    openPick,
    setPickOct,
    chooseNote,
    chooseNoteAbsolute,
    closePick,
  };
}
