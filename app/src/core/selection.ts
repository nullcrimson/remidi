import type { EnginePair } from './enginePair';
import type { ChannelScope, EngineId, MissingDrums, Overrides, Unrecognized } from './midiremap';
import type { KnownEdits } from './overrides';

/** What taking a suggested source left behind: the pair, its edits and its open preset, which the way back restores whole. */
export interface Left {
  pair: EnginePair;
  overrides: Overrides;
  presetId: string | null;
}

/**
 * How the source came to be chosen: named by the link, restored from the last session, picked,
 * or taken as a suggestion, with what was left behind (`null` when no pair was chosen yet).
 */
export type SrcVia = 'link' | 'restored' | 'picked' | { kind: 'suggested'; from: Left | null };

/** How a source came to be chosen, as the events name it. */
export type SrcViaKind = Extract<SrcVia, string> | Extract<SrcVia, { kind: string }>['kind'];

/** The ways the screen chooses a source: a pick, or a suggestion taken. */
type PickVia = Extract<SrcVia, 'picked' | { kind: 'suggested' }>;

/** The chosen source and how it came to be: one cannot be written without the other. */
export interface Src {
  id: EngineId;
  via: SrcVia;
}

/** `id` as the source, come to be by `via`; none without an id. */
export function sourceOf(id: EngineId | null, via: SrcVia): Src | null {
  return id === null ? null : { id, via };
}

/** What taking a suggestion left behind, when `source` is a suggestion taken; `back` is `null` when no pair was chosen before. */
export function suggestedFrom(source: Src | null): { back: Left | null } | null {
  return source === null || typeof source.via === 'string' ? null : { back: source.via.from };
}

/** The kind of `via`, as the events name it. */
export function viaKind(via: SrcVia): SrcViaKind {
  return typeof via === 'string' ? via : via.kind;
}

/**
 * A change to what is being converted. The screen hands each one to every reducer that
 * depends on the selection (the selection itself, the note editor, the converter), and
 * each decides what it means for its own state.
 */
export type SelectionEvent
  = | { type: 'chooseSrc'; id: EngineId; via: PickVia }
    | { type: 'chooseTgt'; id: EngineId }
    | { type: 'swap'; via: PickVia }
    | { type: 'preselect'; src: Src | null; tgt: EngineId | null }
    | {
      type: 'loadMapping';
      src: EngineId;
      tgt: EngineId;
      presetId: string | null;
      known: KnownEdits;
    }
    | { type: 'setChannel'; channel: ChannelScope }
    | { type: 'setMissing'; missing: MissingDrums }
    | { type: 'setUnrecognized'; unrecognized: Unrecognized };

/** A change of source the screen converts from at once: a suggestion taken, the pair swapped, or a pair it left restored. */
export type SourceSwitch = Extract<SelectionEvent, { type: 'chooseSrc' | 'swap' | 'loadMapping' }>;

/** Whether the event picks another engine pair, so edits made for the old one no longer apply. */
export function changesPair(event: SelectionEvent): boolean {
  switch (event.type) {
    case 'chooseSrc':
    case 'chooseTgt':
    case 'swap':
    case 'preselect':
    case 'loadMapping':
      return true;
    case 'setChannel':
    case 'setMissing':
    case 'setUnrecognized':
      return false;
  }
}
