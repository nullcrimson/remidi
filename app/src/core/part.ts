import type { Message } from '../generated/i18n';
import type { ChannelScope, Part, PartSummary, Selection } from './midiremap';

/** The parts picked as a file's drums: at least one. */
export type PickedParts = [Part, ...Part[]];

/** `parts` as a pick, when it holds one or more. */
export function pickedParts(parts: Part[]): PickedParts | undefined {
  const [first, ...rest] = parts;
  return first === undefined ? undefined : [first, ...rest];
}

export function samePart(a: Part, b: Part): boolean {
  return a.track === b.track && a.channel === b.channel;
}

/** Whether a file's drum parts are asked about and picked: only under `auto`, the scope that asks. */
export function asksForParts(channel: ChannelScope): boolean {
  return channel === 'auto';
}

/** What converting a file rewrites: the parts picked for it, else the channels `channel` selects. */
export function selectionOf(parts: PickedParts | undefined, channel: ChannelScope): Selection {
  return parts === undefined ? { scope: channel } : { parts };
}

/** One part as people read it: its track by name or number, and its channel. */
export function partLabel({ part: { track, channel }, trackName }: PartSummary): Message {
  return trackName === null
    ? { id: 'parts-track-unnamed', args: { track, channel } }
    : { id: 'parts-track-named', args: { name: trackName, channel } };
}
