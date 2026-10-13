import { useT } from '../localeContext';
import { CHANNELS, channelHint } from '../lib/channel';
import type { ChannelScope } from '../lib/midiremap';
import type { FocusRef } from '../hooks/useFocusIntent';
import { SettingSelect } from './SettingSelect';

export function ChannelSelect({
  ref,
  value,
  onChange,
}: {
  ref?: FocusRef;
  value: ChannelScope;
  onChange: (channel: ChannelScope) => void;
}) {
  const t = useT();
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
