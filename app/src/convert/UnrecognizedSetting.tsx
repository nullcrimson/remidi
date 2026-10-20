import { useT } from '../locale/localeContext';
import type { Unrecognized } from '../core/midiremap';
import { UNRECOGNIZED_OPTIONS, unrecognizedHint } from '../core/unrecognized';
import { ChipRadioGroup } from '../ui/ChipRadioGroup';
import { SettingRow } from './SettingRow';

export function UnrecognizedSetting({
  value,
  onChange,
}: {
  value: Unrecognized;
  onChange: (unrecognized: Unrecognized) => void;
}) {
  const t = useT();
  return (
    <SettingRow
      label={t({ id: 'unrecognized-label' })}
      tipTitle={t({ id: 'unrecognized-tip-title' })}
      tip={t({ id: 'unrecognized-tip' })}
      hint={t(unrecognizedHint(value))}
    >
      {(ids) => (
        <ChipRadioGroup
          {...ids}
          options={UNRECOGNIZED_OPTIONS.map((o) => ({ value: o.value, label: t(o.label) }))}
          value={value}
          onChange={onChange}
        />
      )}
    </SettingRow>
  );
}
