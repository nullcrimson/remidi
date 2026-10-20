import { useT } from '../locale/localeContext';
import { octaveName, type OctaveBase } from '../core/notes';
import { ChipRadioGroup } from '../ui/ChipRadioGroup';
import { SettingRow } from './SettingRow';

const OCTAVES = (['c1', 'c2'] as const).map((value) => ({ value, label: octaveName(value) }));

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
