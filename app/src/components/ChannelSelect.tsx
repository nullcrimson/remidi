import { t } from '../i18n';
import { CHANNELS, channelHint, type Channel } from '../lib/channel';
import type { FocusRef } from '../hooks/useFocusIntent';
import { SettingSelect } from './SettingSelect';

export function ChannelSelect({
  ref,
  value,
  onChange,
}: {
  ref?: FocusRef;
  value: Channel;
  onChange: (channel: Channel) => void;
}) {
  return (
    <SettingSelect
      ref={ref}
      label={t({ id: 'channel-label' })}
      value={value}
      options={CHANNELS.map((c) => ({ value: c.value, label: t(c.label) }))}
      onChange={onChange}
      tipTitle={t({ id: 'channel-tip-title' })}
      tip={t({ id: 'channel-tip' })}
      hint={t(channelHint(value))}
    />
  );
}
