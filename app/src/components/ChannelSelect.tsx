import { CHANNELS, channelHint, type Channel } from '../lib/channel';
import { SettingSelect } from './SettingSelect';

export const CHANNEL_SELECT_ID = 'drum-channel';

export function ChannelSelect({
  value,
  onChange,
}: {
  value: Channel;
  onChange: (channel: Channel) => void;
}) {
  return (
    <SettingSelect
      id={CHANNEL_SELECT_ID}
      label="Drum channel"
      value={value}
      options={CHANNELS}
      onChange={onChange}
      tipTitle="Which notes get converted"
      tip="Auto converts every track that uses channel 10 — the General MIDI drum channel — and leaves other instruments alone. Pick a channel or All if your drums are elsewhere."
      hint={channelHint(value)}
    />
  );
}
