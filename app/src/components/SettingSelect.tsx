import type { ReactNode } from 'react';
import { ChipSelect } from './ChipSelect';
import { SettingRow } from './SettingRow';

export function SettingSelect<T extends string>({
  id,
  label,
  value,
  options,
  onChange,
  tipTitle,
  tip,
  hint,
}: {
  id?: string;
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
      {(ids) => <ChipSelect id={id} {...ids} options={options} value={value} onChange={onChange} />}
    </SettingRow>
  );
}
