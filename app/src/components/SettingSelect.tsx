import type { ReactNode } from 'react';
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
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  tipTitle: string;
  tip: ReactNode;
  hint: string;
}) {
  return (
    <SettingRow label={label} tipTitle={tipTitle} tip={tip} hint={hint}>
      {(labelId) => (
        <select
          aria-labelledby={labelId}
          value={value}
          onChange={(e) => onChange(e.target.value as T)}
          className="
            field-sizing-content cursor-pointer border-b border-dashed border-t5
            bg-transparent pb-px font-mono text-[12.5px] font-semibold text-t1
            hover:border-accent hover:text-accent
          "
        >
          {options.map((o) => (
            <option key={o.value} value={o.value} className="bg-card text-t1">
              {o.label}
            </option>
          ))}
        </select>
      )}
    </SettingRow>
  );
}
