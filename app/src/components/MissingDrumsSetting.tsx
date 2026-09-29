import { t } from '../i18n';
import { MISSING_OPTIONS, type Missing } from '../lib/missing';
import { ChipRadioGroup } from './ChipRadioGroup';
import { SettingRow } from './SettingRow';

export function MissingDrumsSetting({
  value,
  hint,
  onChange,
}: {
  value: Missing;
  hint: string;
  onChange: (missing: Missing) => void;
}) {
  return (
    <SettingRow
      label={t({ id: 'missing-label' })}
      tipTitle={t({ id: 'missing-tip-title' })}
      tip={t({ id: 'missing-tip' })}
      hint={hint}
    >
      {(ids) => (
        <ChipRadioGroup
          {...ids}
          options={MISSING_OPTIONS.map((o) => ({ value: o.value, label: t(o.label) }))}
          value={value}
          onChange={onChange}
        />
      )}
    </SettingRow>
  );
}
