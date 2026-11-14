import type {
  ChannelScope,
  Drum,
  Engine,
  Family,
  MissingDrums,
  Overrides,
  PresetName,
  LoadedPreset,
  RackFile,
  Conversion,
  Part,
  PartSummary,
  SourceFits,
  Unrecognized,
  CanonEntry,
  VoicePlan,
} from '@wasm';
import type { EnginePair } from './enginePair';
import { isWasmError, WasmCallError } from './errors';

type WasmModule = typeof import('@wasm');

export type {
  Canon,
  ChannelScope,
  Drum,
  Engine,
  EngineId,
  Family,
  MissingDrums,
  Note,
  NoteNamings,
  OctaveBase,
  Overrides,
  Packing,
  Outcome,
  PresetName,
  LoadedPreset,
  RackFile,
  Conversion,
  Converted,
  Damage,
  Part,
  PartSummary,
  Report,
  SourceFit,
  SourceFits,
  Unrecognized,
  CanonEntry,
  VoicePlan,
} from '@wasm';

/** The loaded converter module. A call the module refuses throws a `WasmCallError`. */
export interface Midiremap {
  engines(): Engine[];
  engineDrums(tgtId: string): Drum[];
  engineNotes(srcId: string): Drum[];
  canonCatalog(): CanonEntry[];
  familyOrder(): Family[];
  parsePresetFile(json: string): LoadedPreset;
  plan(pair: EnginePair, ov?: Overrides, missing?: MissingDrums): VoicePlan[];
  remap(
    mid: Uint8Array,
    pair: EnginePair,
    ov?: Overrides,
    channel?: ChannelScope,
    missing?: MissingDrums,
    unrecognized?: Unrecognized,
  ): Conversion;
  /** `remap` of only the `parts` picked as the file's drums. */
  remapParts(
    mid: Uint8Array,
    pair: EnginePair,
    ov: Overrides | undefined,
    parts: Part[],
    missing?: MissingDrums,
    unrecognized?: Unrecognized,
  ): Conversion;
  /** The parts of `mid`, played as `src`, when converting it under `auto` would ask which are the drums. */
  autoQuestion(mid: Uint8Array, src?: string): PartSummary[] | undefined;
  /** Every part of `mid` with hits, played as `src` when given. */
  fileParts(mid: Uint8Array, src?: string): PartSummary[];
  /** The Ableton rack that plays `pair.src` MIDI on `pair.tgt` as `remap` converts it, named after `presetName` when given. */
  remapRack(
    pair: EnginePair,
    ov?: Overrides,
    missing?: MissingDrums,
    unrecognized?: Unrecognized,
    presetName?: PresetName,
  ): RackFile;
  /** Every engine fitted to the hits of `mids` a conversion with `channel` reads, best first; a file that does not parse is left out. */
  sourceFits(mids: Uint8Array[], channel?: ChannelScope): SourceFits;
  /** A two-bar groove of kick, snare, closed hi-hat and crash on the notes `engine` plays them on. */
  sampleFile(engine: string): Uint8Array;
}

/** Loads the converter module, or rejects with why it could not. */
export type LoadMidiremap = () => Promise<Midiremap>;

function call<T>(f: () => T): T {
  try {
    return f();
  } catch (err) {
    throw isWasmError(err) ? new WasmCallError(err) : err;
  }
}

function calls(m: WasmModule): Midiremap {
  return {
    engines: () => call(() => m.engine_catalog()),
    engineDrums: (tgtId) => call(() => m.engine_drums(tgtId)),
    engineNotes: (srcId) => call(() => m.engine_notes(srcId)),
    canonCatalog: () => call(() => m.canon_catalog()),
    familyOrder: () => call(() => m.family_order()),
    parsePresetFile: (json) => call(() => m.parse_preset_file(json)),
    plan: ({ src, tgt }, ov, missing) => call(() => m.plan(src, tgt, ov, missing)),
    remap: (mid, { src, tgt }, ov, channel, missing, unrecognized) =>
      call(() => m.remap(mid, src, tgt, ov, channel, missing, unrecognized)),
    remapParts: (mid, { src, tgt }, ov, parts, missing, unrecognized) =>
      call(() => m.remap_parts(mid, src, tgt, ov, parts, missing, unrecognized)),
    autoQuestion: (mid, src) => call(() => m.auto_question(mid, src)),
    fileParts: (mid, src) => call(() => m.file_parts(mid, src)),
    remapRack: ({ src, tgt }, ov, missing, unrecognized, presetName) =>
      call(() => m.remap_rack(src, tgt, ov, missing, unrecognized, presetName)),
    sourceFits: (mids, channel) => call(() => m.source_fits(mids, channel)),
    sampleFile: (engine) => call(() => m.sample_file(engine)),
  };
}

/**
 * A loader of the WASM module that loads and initializes it on its first call; every
 * call yields that same load, so a loader handed to several readers loads once.
 */
export function moduleLoader(): LoadMidiremap {
  let loading: Promise<Midiremap> | null = null;
  return () => {
    loading ??= import('@wasm').then(async (m) => {
      await m.default();
      return calls(m);
    });
    return loading;
  };
}
