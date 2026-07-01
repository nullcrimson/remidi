import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  engines as listEngines,
  plan as computePlan,
  ready,
  remap,
  type Engine,
  type RemapReport,
  type VoiceRow,
} from '../lib/midiremap';
import { editsToOverrides, effectiveTgt, type Edits } from '../lib/overrides';
import { noteInOctave, octaveIndexOf } from '../lib/notes';

export interface LoadedFile {
  bytes: Uint8Array;
  name: string;
}

type Status = 'loading' | 'ready' | 'error';
type Conv = 'idle' | 'running' | 'done' | 'error';
type View = 'convert' | 'edit';
type Oct = 'c1' | 'c2';

interface Result {
  url: string;
  name: string;
  report: RemapReport;
}

function baseName(name: string): string {
  return name.replace(/\.midi?$/i, '');
}

export function useRemapper() {
  const [status, setStatus] = useState<Status>('loading');
  const [engines, setEngines] = useState<Engine[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [src, setSrc] = useState('');
  const [tgt, setTgt] = useState('');
  const [oct, setOct] = useState<Oct>('c1');
  const [file, setFileState] = useState<LoadedFile | null>(null);
  const [view, setView] = useState<View>('convert');
  const [conv, setConv] = useState<Conv>('idle');
  const [result, setResultState] = useState<Result | null>(null);
  const [rows, setRows] = useState<VoiceRow[]>([]);
  const [edits, setEdits] = useState<Edits>({});
  const [pick, setPick] = useState<{ canon: string; octIndex: number } | null>(null);

  const clearResult = useCallback(() => {
    setResultState((r) => {
      if (r) URL.revokeObjectURL(r.url);
      return null;
    });
  }, []);

  const refreshPlan = useCallback((s: string, t: string) => {
    if (s && t) setRows(computePlan(s, t));
  }, []);

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
          setError(String(e));
          setStatus('error');
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    return () => {
      setResultState((r) => {
        if (r) URL.revokeObjectURL(r.url);
        return r;
      });
    };
  }, []);

  const chooseSrc = useCallback(
    (id: string) => {
      clearResult();
      setConv('idle');
      setEdits({});
      setPick(null);
      setSrc(id);
      refreshPlan(id, tgt);
    },
    [clearResult, refreshPlan, tgt],
  );

  const chooseTgt = useCallback(
    (id: string) => {
      clearResult();
      setConv('idle');
      setEdits({});
      setPick(null);
      setTgt(id);
      refreshPlan(src, id);
    },
    [clearResult, refreshPlan, src],
  );

  const swap = useCallback(() => {
    clearResult();
    setConv('idle');
    setEdits({});
    setPick(null);
    setSrc(tgt);
    setTgt(src);
    refreshPlan(tgt, src);
  }, [clearResult, refreshPlan, src, tgt]);

  const toggleOct = useCallback(() => setOct((o) => (o === 'c1' ? 'c2' : 'c1')), []);

  const setFile = useCallback(
    (f: LoadedFile) => {
      clearResult();
      setError(null);
      setConv('idle');
      setFileState(f);
    },
    [clearResult],
  );

  const replaceFile = useCallback(() => {
    clearResult();
    setConv('idle');
    setFileState(null);
  }, [clearResult]);

  const convert = useCallback(() => {
    if (!file || !src || !tgt) return;
    setConv('running');
    setError(null);
    try {
      const { bytes, report } = remap(file.bytes, src, tgt, editsToOverrides(edits));
      const url = URL.createObjectURL(new Blob([bytes], { type: 'audio/midi' }));
      setResultState({ url, name: `${baseName(file.name)}-${tgt}.mid`, report });
      setConv('done');
    } catch (e) {
      setError(String(e));
      setConv('error');
    }
  }, [edits, file, src, tgt]);

  const reset = useCallback(() => {
    clearResult();
    setConv('idle');
  }, [clearResult]);

  const openPick = useCallback(
    (canon: string) => {
      const row = rows.find((r) => r.canon === canon);
      if (!row) return;
      const note = edits[canon] ?? row.tgtNote ?? row.srcNote;
      setPick({ canon, octIndex: octaveIndexOf(note) });
    },
    [edits, rows],
  );

  const setPickOct = useCallback((octIndex: number) => {
    setPick((p) => (p ? { ...p, octIndex } : p));
  }, []);

  const chooseNote = useCallback(
    (semitone: number) => {
      if (!pick) return;
      setEdits((e) => ({ ...e, [pick.canon]: noteInOctave(pick.octIndex, semitone) }));
      setPick(null);
    },
    [pick],
  );

  const closePick = useCallback(() => setPick(null), []);

  const remappedCount = useMemo(
    () => rows.filter((r) => r.status !== 'dropped' && effectiveTgt(r, edits) !== r.srcNote).length,
    [rows, edits],
  );
  const droppedCount = useMemo(() => rows.filter((r) => r.status === 'dropped').length, [rows]);

  return {
    status,
    engines,
    error,
    src,
    tgt,
    oct,
    file,
    view,
    conv,
    result,
    rows,
    edits,
    remappedCount,
    droppedCount,
    voiceCount: rows.length,
    chooseSrc,
    chooseTgt,
    swap,
    toggleOct,
    setFile,
    replaceFile,
    setView,
    convert,
    reset,
    pick,
    openPick,
    setPickOct,
    chooseNote,
    closePick,
  };
}
