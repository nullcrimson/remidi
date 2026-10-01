import { useT } from '../localeContext';
import { MISSING_OPTIONS, type Missing, type Swap } from '../lib/missing';
import { ChipRadioGroup } from './ChipRadioGroup';
import { InfoPopover } from './InfoPopover';
import { SettingRow } from './SettingRow';
import { TextButton } from './TextButton';

export function MissingDrumsSetting({
  value,
  hint,
  swaps = [],
  onOpenEditor,
  onChange,
}: {
  value: Missing;
  hint: string;
  swaps?: Swap[];
  onOpenEditor?: () => void;
  onChange: (missing: Missing) => void;
}) {
  const t = useT();
  const detail = swaps.length > 0 && (
    <InfoPopover label={hint}>
      <p className="font-semibold text-t1">
        {t({ id: value === 'nearest' ? 'missing-detail-moved' : 'missing-detail-dropped' })}
      </p>
      <ul className="flex flex-col gap-1">
        {swaps.map((s) => (
          <li key={s.drum} className="flex gap-2">
            <span className="text-t2">{s.drum}</span>
            {s.now !== null && (
              <>
                <span aria-hidden="true" className="text-t5">→</span>
                <span className="text-accent">{s.now}</span>
              </>
            )}
          </li>
        ))}
      </ul>
      {onOpenEditor && <TextButton onClick={onOpenEditor}>{t({ id: 'detail-edit' })}</TextButton>}
    </InfoPopover>
  );
  return (
    <SettingRow
      label={t({ id: 'missing-label' })}
      tipTitle={t({ id: 'missing-tip-title' })}
      tip={t({ id: 'missing-tip' })}
      hint={detail || hint}
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
