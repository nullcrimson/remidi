import { useRef } from 'react';
import { useRestoreFocus } from '../hooks/useRestoreFocus';
import { FAMILY_ORDER } from '../lib/families';
import type { CanonInfo } from '../lib/midiremap';
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
        my-0.5 mb-2 rounded-[10px] border border-accent/18 bg-inset
        p-[13px_14px_16px] outline-none
      "
    >
      <div className="mb-3 flex items-center justify-between">
        <span className="font-mono text-[9.5px] tracking-[0.12em] text-t4">SOURCE · {noteLabel}</span>
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="
            flex size-5 items-center justify-center rounded-[5px] bg-white/5
            text-[14px] text-t4
          "
        >
          ×
        </button>
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
                  text-[12px] leading-tight
                "
              >
                <span className="min-w-0 truncate">{o.label}</span>
                <span className="ml-2 shrink-0 font-mono text-[10px] text-t6">{o.canon}</span>
              </ListRow>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
