import { useT } from '../locale/localeContext';
import { groupByFamily } from './families';
import type { Canon, Family, VocabularyDrum } from '../core/midiremap';
import { IconButton } from '../ui/IconButton';
import { ListRow } from './ListRow';
import { MonoLabel } from '../ui/MonoLabel';
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
  current: Canon | null;
  options: VocabularyDrum[];
  families: readonly Family[];
  onPick: (canon: Canon) => void;
  onClose: () => void;
}) {
  const t = useT();
  const groups = groupByFamily(options, (o) => o.family, families);

  return (
    <PickerShell label={t({ id: 'canon-picker-label', args: { note: noteLabel } })} onClose={onClose}>
      <div className="mb-3 flex items-center justify-between">
        <MonoLabel tone="muted">{t({ id: 'canon-picker-heading', args: { note: noteLabel } })}</MonoLabel>
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
