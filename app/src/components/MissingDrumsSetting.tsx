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
      label="Missing drums"
      tipTitle="When the target lacks a drum"
      tip="Nearest plays it on the closest drum the target has — a China on a crash, Tom 4 on Tom 3. Drop leaves it out. Ghost notes, rimshots and other ways of playing a drum the target does have always fall back to a plain hit on that drum."
      hint={hint}
    >
      {(ids) => <ChipRadioGroup {...ids} options={MISSING_OPTIONS} value={value} onChange={onChange} />}
    </SettingRow>
  );
}
