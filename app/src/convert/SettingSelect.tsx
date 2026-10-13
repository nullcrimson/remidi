import type { FocusRef } from '../ui/useFocusIntent';
import type { ReactNode } from 'react';
import { ChipSelect } from '../ui/ChipSelect';
import { SettingRow } from './SettingRow';

export function SettingSelect<T extends string>({
  ref,
  label,
  value,
  options,
  onChange,
  tipTitle,
  tip,
  hint,
}: {
  ref?: FocusRef;
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
      {(ids) => <ChipSelect ref={ref} {...ids} options={options} value={value} onChange={onChange} />}
    </SettingRow>
  );
}
