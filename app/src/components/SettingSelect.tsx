import type { ReactNode } from 'react';
import { ChipSelect } from './ChipSelect';
import { SettingRow } from './SettingRow';

export function SettingSelect<T extends string>({
  label,
  value,
  options,
  onChange,
  tipTitle,
  tip,
  hint,
}: {
  label: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
  tipTitle: string;
  tip: ReactNode;
  hint: string;
}) {
  return (
    <SettingRow label={label} tipTitle={tipTitle} tip={tip} hint={hint}>
      {(ids) => <ChipSelect {...ids} options={options} value={value} onChange={onChange} />}
    </SettingRow>
  );
}
