import { useT } from '../locale/localeContext';
import { CHANNELS, channelHint } from '../core/channel';
import type { ChannelScope } from '../core/midiremap';
import type { FocusRef } from '../ui/useFocusIntent';
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
