type WasmModule = typeof import('@wasm');

export interface Engine {
  id: string;
  name: string;
}

export interface Overrides {
  tgt: { canon: string; note: number }[];
  src: { note: number; canon: string }[];
}

export interface CanonInfo {
  canon: string;
  label: string;
  family: string;
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
  unmappedSource: Record<string, number>;
  fallbackUsed: Record<string, number>;
  dropped: Record<string, number>;
}
export interface RemapResult {
  bytes: Uint8Array<ArrayBuffer>;
  report: RemapReport;
}

interface RawRemapReport {
  unmapped_source: Record<string, number>;
  fallback_used: Record<string, number>;
  dropped: Record<string, number>;
}

interface RawVoiceRow {
  canon: string;
  label: string;
  src_note: number;
  tgt_note: number | null;
  status: VoiceStatus;
}

let wasm: WasmModule | null = null;
let initPromise: Promise<void> | null = null;

/** Load and initialize the WASM module once; safe to call repeatedly. */
export function ready(): Promise<void> {
  if (!initPromise) {
    initPromise = import('@wasm').then(async (m) => {
      await m.default();
      wasm = m;
    });
  }
  return initPromise;
}

function mod(): WasmModule {
  if (!wasm) throw new Error('WASM module not initialized; await ready() first');
  return wasm;
}

export function engines(): Engine[] {
  return mod().engine_catalog() as Engine[];
}

export function engineDrums(tgtId: string): Drum[] {
  return mod().engine_drums(tgtId) as Drum[];
}

export function engineNotes(srcId: string): Drum[] {
  return mod().engine_notes(srcId) as Drum[];
}

export function canonCatalog(): CanonInfo[] {
  return mod().canon_catalog() as CanonInfo[];
}

export function plan(src: string, tgt: string, ov?: Overrides): VoiceRow[] {
  const raw = mod().plan(src, tgt, ov ? JSON.stringify(ov) : undefined) as RawVoiceRow[];
  return raw.map((r) => ({
    canon: r.canon,
    label: r.label,
    srcNote: r.src_note,
    tgtNote: r.tgt_note,
    status: r.status,
  }));
}

export function remap(mid: Uint8Array, src: string, tgt: string, ov?: Overrides): RemapResult {
  const r = mod().remap(mid, src, tgt, ov ? JSON.stringify(ov) : undefined) as {
    bytes: number[];
    report: RawRemapReport;
  };
  return {
    bytes: new Uint8Array(r.bytes),
    report: {
      unmappedSource: r.report.unmapped_source,
      fallbackUsed: r.report.fallback_used,
      dropped: r.report.dropped,
    },
  };
}
