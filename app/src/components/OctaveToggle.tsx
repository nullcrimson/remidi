import { useT } from '../localeContext';
import type { OctaveBase } from '../lib/notes';
import { ChipRadioGroup } from './ChipRadioGroup';
import { SettingRow } from './SettingRow';

const OCTAVES: { value: OctaveBase; label: string }[] = [
  { value: 'c1', label: 'C-1' },
  { value: 'c2', label: 'C-2' },
];

const DAWS: Record<OctaveBase, string> = {
  c1: 'Reaper · Logic · Ableton · Guitar Pro',
  c2: 'Studio One · Cubase · FL Studio',
};

export function OctaveToggle({
  value,
  onChange,
}: {
  value: OctaveBase;
  onChange: (base: OctaveBase) => void;
}) {
  const t = useT();
  return (
    <SettingRow
      label={t({ id: 'octave-label' })}
      tipTitle={t({ id: 'octave-tip-title' })}
      tip={t({ id: 'octave-tip' })}
      hint={DAWS[value]}
    >
      {(ids) => <ChipRadioGroup {...ids} options={OCTAVES} value={value} onChange={onChange} />}
    </SettingRow>
  );
}
