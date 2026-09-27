const NUMBERED = [
  '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16',
] as const;

/** Which MIDI channels a conversion rewrites; the exact values the converter parses. */
export type Channel = 'auto' | 'all' | (typeof NUMBERED)[number];

export const CHANNELS: { value: Channel; label: string }[] = [
  { value: 'auto', label: 'Auto' },
  { value: 'all', label: 'All channels' },
  ...NUMBERED.map((n) => ({ value: n, label: n })),
];

export function channelHint(channel: Channel): string {
  switch (channel) {
    case 'auto':
      return 'tracks with channel-10 hits · others unchanged';
    case 'all':
      return 'every channel is converted';
    default:
      return `only channel ${channel} is converted`;
  }
}
