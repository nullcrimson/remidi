import type { Message } from '../generated/i18n';
import type { ChannelScope } from './midiremap';

const NAMED = {
  auto: { id: 'channel-auto' },
  all: { id: 'channel-all' },
} satisfies Partial<Record<ChannelScope, Message>>;

type Numbered = Exclude<ChannelScope, keyof typeof NAMED>;

const NUMBERED: Record<Numbered, null> = {
  1: null, 2: null, 3: null, 4: null, 5: null, 6: null, 7: null, 8: null,
  9: null, 10: null, 11: null, 12: null, 13: null, 14: null, 15: null, 16: null,
};

/** Every channel scope the converter accepts, with its label, in the order the picker lists them. */
export const CHANNELS: { value: ChannelScope; label: Message }[] = [
  ...(Object.keys(NAMED) as (keyof typeof NAMED)[]).map((value) => ({ value, label: NAMED[value] })),
  ...(Object.keys(NUMBERED) as Numbered[]).map((value) => ({
    value,
    label: { id: 'channel-number', args: { channel: value } } as const,
  })),
];

/** The name a channel scope goes by in the picker and the settings summary. */
export function channelLabel(channel: ChannelScope): Message {
  switch (channel) {
    case 'auto':
      return NAMED.auto;
    case 'all':
      return NAMED.all;
    default:
      return { id: 'channel-number', args: { channel } };
  }
}

export function channelHint(channel: ChannelScope): Message {
  switch (channel) {
    case 'auto':
      return { id: 'channel-hint-auto' };
    case 'all':
      return { id: 'channel-hint-all' };
    default:
      return { id: 'channel-hint-one', args: { channel } };
  }
}
