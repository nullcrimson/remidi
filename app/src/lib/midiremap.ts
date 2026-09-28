import type {
  CanonInfo,
  Drum,
  EngineInfo,
  ErrorKind,
  Family,
  MissingDrums,
  Overrides,
  PresetView,
  RemapOutput,
  VoiceRow,
  WasmError,
} from '@wasm';
import type { Channel } from './channel';

type WasmModule = typeof import('@wasm');

export type {
  CanonInfo,
  Drum,
  EngineInfo as Engine,
  ErrorKind,
  Family,
  FallbackTally,
  PresetView as ImportedPreset,
  MissingDrums,
  OctaveBase,
  Overrides,
  RemapOutput as RemapResult,
  Report as RemapReport,
  VoiceRow,
  PlanStatus as VoiceStatus,
} from '@wasm';

/** A call into the WASM module failed; `kind` and `id` say how and on what. */
export class WasmCallError extends Error {
  readonly kind: ErrorKind;
  readonly id: string | null;

  constructor(err: WasmError) {
    super(err.message);
    this.name = 'WasmCallError';
    this.kind = err.kind;
    this.id = err.id;
  }
}

function isWasmError(err: unknown): err is WasmError {
  return typeof err === 'object' && err !== null && 'kind' in err && 'message' in err;
}

function call<T>(f: (m: WasmModule) => T): T {
  try {
    return f(mod());
  } catch (err) {
    throw isWasmError(err) ? new WasmCallError(err) : err;
  }
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

export function engines(): EngineInfo[] {
  return call((m) => m.engine_catalog());
}

export function engineDrums(tgtId: string): Drum[] {
  return call((m) => m.engine_drums(tgtId));
}

export function engineNotes(srcId: string): Drum[] {
  return call((m) => m.engine_notes(srcId));
}

export function canonCatalog(): CanonInfo[] {
  return call((m) => m.canon_catalog());
}

export function familyOrder(): Family[] {
  return call((m) => m.family_order());
}

export function parsePresetFile(json: string): PresetView {
  return call((m) => m.parse_preset_file(json));
}

export function plan(src: string, tgt: string, ov?: Overrides, missing?: MissingDrums): VoiceRow[] {
  return call((m) => m.plan(src, tgt, ov, missing));
}

export function remap(
  mid: Uint8Array,
  src: string,
  tgt: string,
  ov?: Overrides,
  channel?: Channel,
  missing?: MissingDrums,
): RemapOutput {
  return call((m) => m.remap(mid, src, tgt, ov, channel, missing));
}
