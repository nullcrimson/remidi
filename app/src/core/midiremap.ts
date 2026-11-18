import type {
  Advised,
  AutoQuestion,
  Drum,
  Engine,
  EngineId,
  Family,
  MissingDrums,
  Overrides,
  PresetName,
  LoadedPreset,
  RackFile,
  Conversion,
  AdviceFile,
  Loss,
  Selection,
  Unrecognized,
  CanonEntry,
  VoicePlan,
} from '@wasm';
import type { EnginePair } from './enginePair';
import { isWasmError, WasmCallError } from './errors';

type WasmModule = typeof import('@wasm');

export type {
  Advised,
  AutoQuestion,
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
  AdviceFile,
  Loss,
  Part,
  PartSummary,
  Plays,
  Lacks,
  QuestionReason,
  Report,
  Selection,
  SourceAdvice,
  Unrecognized,
  UnmappedFate,
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
    selection?: Selection,
    missing?: MissingDrums,
    unrecognized?: Unrecognized,
  ): Conversion;
  /** What converting `mid` under `auto` would ask, its parts played as `src`: the question `remap` asks when `tgt`, `ov`, `missing` and `unrecognized` are its own. */
  autoQuestion(
    mid: Uint8Array,
    src?: string,
    tgt?: string,
    ov?: Overrides,
    missing?: MissingDrums,
    unrecognized?: Unrecognized,
  ): AutoQuestion | undefined;
  /** The Ableton rack that plays `pair.src` MIDI on `pair.tgt` as `remap` converts it, named after `presetName` when given. */
  remapRack(
    pair: EnginePair,
    ov?: Overrides,
    missing?: MissingDrums,
    unrecognized?: Unrecognized,
    presetName?: PresetName,
  ): RackFile;
  /** What to tell a visitor converting the hits of `files` converting each with its selection reads, from `source` to `target`, with the ids it was computed for; a file that does not parse, or lacks a picked part, is left out. */
  sourceAdvice(files: AdviceFile[], source: EngineId, target: EngineId | null): Advised;
  /** A two-bar groove of kick, snare, closed hi-hat and crash on the notes `engine` plays them on. */
  sampleFile(engine: string): Uint8Array;
  /** Whether `loss` is heavy, the share of the hits read that makes the done card warn; a loss of more than was read throws. */
  lossIsHeavy(losses: Loss[]): boolean;
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
    remap: (mid, { src, tgt }, ov, selection, missing, unrecognized) =>
      call(() => m.remap(mid, src, tgt, ov, selection, missing, unrecognized)),
    autoQuestion: (mid, src, tgt, ov, missing, unrecognized) =>
      call(() => m.auto_question(mid, src, tgt, ov, missing, unrecognized)),
    remapRack: ({ src, tgt }, ov, missing, unrecognized, presetName) =>
      call(() => m.remap_rack(src, tgt, ov, missing, unrecognized, presetName)),
    sourceAdvice: (files, source, target) => call(() => m.source_advice(files, source, target)),
    sampleFile: (engine) => call(() => m.sample_file(engine)),
    lossIsHeavy: (losses) => call(() => m.loss_is_heavy(losses)),
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
