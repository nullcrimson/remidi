import initWasm, {
  engine_catalog,
  engine_drums,
  plan as wasmPlan,
  remap as wasmRemap,
} from '@wasm';

export interface Engine {
  id: string;
  name: string;
}

export interface Overrides {
  tgt: { canon: string; note: number }[];
}

export interface Drum {
  note: number;
  canon: string;
  label: string;
  family: string;
}
export type VoiceStatus = 'direct' | 'fallback' | 'dropped';
export interface VoiceRow {
  canon: string;
  label: string;
  srcNote: number;
  tgtNote: number | null;
  status: VoiceStatus;
}
export interface RemapReport {
  unmapped_source: Record<string, number>;
  fallback_used: Record<string, number>;
  dropped: Record<string, number>;
}
export interface RemapResult {
  bytes: Uint8Array<ArrayBuffer>;
  report: RemapReport;
}

interface RawVoiceRow {
  canon: string;
  label: string;
  src_note: number;
  tgt_note: number | null;
  status: VoiceStatus;
}

let initPromise: Promise<void> | null = null;

/** Initialize the WASM module once; safe to call repeatedly. */
export function ready(): Promise<void> {
  if (!initPromise) {
    initPromise = Promise.resolve(initWasm()).then(() => undefined);
  }
  return initPromise;
}

export function engines(): Engine[] {
  return engine_catalog() as Engine[];
}

export function engineDrums(tgtId: string): Drum[] {
  return engine_drums(tgtId) as Drum[];
}

export function plan(src: string, tgt: string, ov?: Overrides): VoiceRow[] {
  const raw = wasmPlan(src, tgt, ov ? JSON.stringify(ov) : undefined) as RawVoiceRow[];
  return raw.map((r) => ({
    canon: r.canon,
    label: r.label,
    srcNote: r.src_note,
    tgtNote: r.tgt_note,
    status: r.status,
  }));
}

export function remap(mid: Uint8Array, src: string, tgt: string, ov?: Overrides): RemapResult {
  const r = wasmRemap(mid, src, tgt, ov ? JSON.stringify(ov) : undefined) as {
    bytes: number[];
    report: RemapReport;
  };
  return { bytes: new Uint8Array(r.bytes), report: r.report };
}
