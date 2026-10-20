import type { Message } from '../generated/i18n';
import type { ChannelScope } from './midiremap';
import type { Option } from './options';

const NAMED = {
  auto: { id: 'channel-auto' },
  all: { id: 'channel-all' },
} satisfies Partial<Record<ChannelScope, Message>>;

type Named = keyof typeof NAMED;
type Numbered = Exclude<ChannelScope, Named>;

const NUMBERED: Record<Numbered, null> = {
  1: null, 2: null, 3: null, 4: null, 5: null, 6: null, 7: null, 8: null,
  9: null, 10: null, 11: null, 12: null, 13: null, 14: null, 15: null, 16: null,
};

const isNamed = (channel: ChannelScope): channel is Named => channel in NAMED;

/** The name a channel scope goes by in the picker and the settings summary. */
export function channelLabel(channel: ChannelScope): Message {
  return isNamed(channel) ? NAMED[channel] : { id: 'channel-number', args: { channel } };
}

/** Every channel scope the converter accepts, with its label, in the order the picker lists them. */
export const CHANNELS: Option<ChannelScope>[] = ([...Object.keys(NAMED), ...Object.keys(NUMBERED)] as ChannelScope[])
  .map((value) => ({ value, label: channelLabel(value) }));

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
