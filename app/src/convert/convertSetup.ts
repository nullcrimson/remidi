import type { EnginePair } from '../core/enginePair';
import type { ChannelScope, MissingDrums, Overrides, Unrecognized } from '../core/midiremap';
import { viaKind, type Left, type SourceSwitch, type SrcViaKind } from '../core/selection';
import type { StatEvents } from '../core/umami';
import { overridesAfter } from '../editor/editorState';
import { switchedSelection, type ChosenSelection } from './selectionState';

/** What the question before converting led to: not asked, converted anyway, or switched to a suggestion or the other way. */
export type Asked = StatEvents['converted']['asked'];

/**
 * Everything one conversion runs from and reports: the pair, its edits and settings, the open
 * preset, how the source came to be and what the question before converting led to.
 */
export interface ConvertSetup {
  pair: EnginePair;
  overrides: Overrides;
  channel: ChannelScope;
  missing: MissingDrums;
  unrecognized: Unrecognized;
  presetId: string | null;
  via: SrcViaKind;
  asked: Asked;
}

/** What a result made from `setup` depends on besides the files: a result made under another key is stale. */
export function keyFor({ pair, channel, missing, unrecognized, overrides }: ConvertSetup): string {
  return JSON.stringify({ pair, channel, missing, unrecognized, overrides });
}

/** The setup `selection` converts with `overrides`. */
export function setupOf(selection: ChosenSelection, overrides: Overrides, asked: Asked): ConvertSetup {
  const { src, tgt, channel, missing, unrecognized, presetId } = selection;
  return { pair: { src: src.id, tgt }, overrides, channel, missing, unrecognized, presetId, via: viaKind(src.via), asked };
}

/**
 * The setup after `event`, as the selection and the editor change `selection` and `overrides`
 * on it: a new pair clears the edits and the preset, a restored one brings its own.
 */
export function setupAfter(selection: ChosenSelection, overrides: Overrides, event: SourceSwitch, asked: Asked): ConvertSetup {
  return setupOf(switchedSelection(selection, event), overridesAfter(overrides, event), asked);
}

/** What taking a suggestion from `setup` leaves behind, for the way back. */
export function leftBy({ pair, overrides, presetId }: ConvertSetup): Left {
  return { pair, overrides, presetId };
}
