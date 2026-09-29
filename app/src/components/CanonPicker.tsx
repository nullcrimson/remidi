import { t } from '../i18n';
import { groupByFamily } from '../lib/families';
import type { CanonInfo } from '../lib/midiremap';
import { IconButton } from './IconButton';
import { ListRow } from './ListRow';
import { MonoLabel } from './MonoLabel';
import { PickerShell } from './PickerShell';

export function CanonPicker({
  noteLabel,
  current,
  options,
  families,
  onPick,
  onClose,
}: {
  noteLabel: string;
  current: string | null;
  options: CanonInfo[];
  families: readonly string[];
  onPick: (canon: string) => void;
  onClose: () => void;
}) {
  const groups = groupByFamily(options, (o) => o.family, families);

  return (
    <PickerShell label={t({ id: 'canon-picker-label', args: { note: noteLabel } })} onClose={onClose}>
      <div className="mb-3 flex items-center justify-between">
        <MonoLabel tone="text-t4">{t({ id: 'canon-picker-heading', args: { note: noteLabel } })}</MonoLabel>
        <IconButton label={t({ id: 'close' })} onClick={onClose}>×</IconButton>
      </div>
      <div className="mr-scroll flex max-h-64 flex-col gap-2 pr-1">
        {groups.map((g) => (
          <div key={g.family}>
            <MonoLabel className="mb-1">{g.family}</MonoLabel>
            {g.items.map((o) => (
              <ListRow
                key={o.canon}
                selected={o.canon === current}
                onSelect={() => onPick(o.canon)}
                className="
                  flex w-full items-center justify-between py-1 pr-2 pl-2.5
                  text-ui/tight
                  pointer-coarse:min-h-11
                "
              >
                <span className="min-w-0 truncate">{o.label}</span>
                <span className="ml-2 shrink-0 font-mono text-caption text-t5">{o.canon}</span>
              </ListRow>
            ))}
          </div>
        ))}
      </div>
    </PickerShell>
  );
}
