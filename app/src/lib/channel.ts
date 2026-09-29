import type { Message } from '../generated/i18n';

const NUMBERED = [
  '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16',
] as const;

/** Which MIDI channels a conversion rewrites; the exact values the converter parses. */
export type Channel = 'auto' | 'all' | (typeof NUMBERED)[number];

export const CHANNELS: { value: Channel; label: Message }[] = [
  { value: 'auto', label: { id: 'channel-auto' } },
  { value: 'all', label: { id: 'channel-all' } },
  ...NUMBERED.map((n) => ({ value: n, label: { id: 'channel-number', args: { channel: n } } }) as const),
];

export function channelHint(channel: Channel): Message {
  switch (channel) {
    case 'auto':
      return { id: 'channel-hint-auto' };
    case 'all':
      return { id: 'channel-hint-all' };
    default:
      return { id: 'channel-hint-one', args: { channel } };
  }
}
