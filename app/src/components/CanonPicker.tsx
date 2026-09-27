import { useRef } from 'react';
import { useRestoreFocus } from '../hooks/useRestoreFocus';
import { FAMILY_ORDER } from '../lib/families';
import type { CanonInfo } from '../lib/midiremap';
import { IconButton } from './IconButton';
import { ListRow } from './ListRow';
import { MonoLabel } from './MonoLabel';

export function CanonPicker({
  noteLabel,
  current,
  options,
  onPick,
  onClose,
}: {
  noteLabel: string;
  current: string | null;
  options: CanonInfo[];
  onPick: (canon: string) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useRestoreFocus(ref);

  const groups = FAMILY_ORDER.map((family) => ({
    family,
    items: options.filter((o) => o.family === family),
  })).filter((g) => g.items.length > 0);

  return (
    <div
      ref={ref}
      role="dialog"
      aria-label={`Canon for ${noteLabel}`}
      tabIndex={-1}
      className="
        my-0.5 mb-2 rounded-panel border border-accent/18 bg-inset
        p-[13px_14px_16px] outline-none
      "
    >
      <div className="mb-3 flex items-center justify-between">
        <MonoLabel tone="text-t4">SOURCE · {noteLabel}</MonoLabel>
        <IconButton label="Close" onClick={onClose}>×</IconButton>
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
                "
              >
                <span className="min-w-0 truncate">{o.label}</span>
                <span className="ml-2 shrink-0 font-mono text-caption text-t5">{o.canon}</span>
              </ListRow>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
