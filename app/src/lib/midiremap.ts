import type { Channel } from './channel';
import type { Missing } from './missing';

type WasmModule = typeof import('@wasm');

export interface Engine {
  id: string;
  name: string;
  fullName?: string;
}

export interface Overrides {
  tgt: { canon: string; note: number }[];
  src: { note: number; canon: string | null }[];
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
  srcNotes: number[];
  tgtNote: number | null;
  defaultTgtNote: number | null;
  status: VoiceStatus;
  /** The target lacks this drum and its nearest stand-in is another drum. */
  otherDrum: boolean;
}
export interface FallbackTally {
  note: number;
  count: number;
}
export interface RemapReport {
  unmappedSource: Record<string, number>;
  fallbackUsed: Record<string, FallbackTally>;
  dropped: Record<string, number>;
  untouched: number;
  converted: number;
}
export interface RemapResult {
  bytes: Uint8Array<ArrayBuffer>;
  report: RemapReport;
}

interface RawRemapReport {
  unmapped_source: Record<string, number>;
  fallback_used: Record<string, FallbackTally>;
  dropped: Record<string, number>;
  untouched: number;
  converted: number;
}

interface RawVoiceRow {
  canon: string;
  label: string;
  src_notes: number[];
  tgt_note?: number | null;
  default_tgt_note?: number | null;
  status: VoiceStatus;
  other_drum: boolean;
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

export function plan(src: string, tgt: string, ov?: Overrides, missing?: Missing): VoiceRow[] {
  const raw = mod().plan(src, tgt, ov ? JSON.stringify(ov) : undefined, missing) as RawVoiceRow[];
  return raw.map((r) => ({
    canon: r.canon,
    label: r.label,
    srcNotes: r.src_notes,
    tgtNote: r.tgt_note ?? null,
    defaultTgtNote: r.default_tgt_note ?? null,
    status: r.status,
    otherDrum: r.other_drum,
  }));
}

export function remap(
  mid: Uint8Array,
  src: string,
  tgt: string,
  ov?: Overrides,
  channel?: Channel,
  missing?: Missing,
): RemapResult {
  const r = mod().remap(mid, src, tgt, ov ? JSON.stringify(ov) : undefined, channel, missing) as {
    bytes: Uint8Array<ArrayBuffer>;
    report: RawRemapReport;
  };
  return {
    bytes: r.bytes,
    report: {
      unmappedSource: r.report.unmapped_source,
      fallbackUsed: r.report.fallback_used,
      dropped: r.report.dropped,
      untouched: r.report.untouched,
      converted: r.report.converted,
    },
  };
}
