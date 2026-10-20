import { useT } from '../locale/localeContext';
import type { FocusRef } from '../ui/useFocusIntent';
import { labelText } from '../ui/styles';

function Chevron({ tone }: { tone: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      className={`
        shrink-0
        ${tone}
      `}
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

/**
 * One side of the conversion as a card: its label, the engine chosen for it or an
 * invitation to choose one, gold when it is the choice the visitor has to make next.
 * Pressing it opens the engine picker.
 */
export function EngineCard({ ref, label, chosen, next, onOpen }: {
  ref?: FocusRef;
  label: string;
  chosen: string | null;
  next: boolean;
  onOpen: () => void;
}) {
  const t = useT();
  return (
    <button
      ref={ref}
      type="button"
      aria-haspopup="dialog"
      onClick={onOpen}
      className={`
        flex min-h-15 w-full items-center justify-between gap-3 rounded-panel
        border px-4 py-2.5 text-left transition-colors
        ${next
      ? `
        border-star/45 bg-star/5
        hover:border-star/75
      `
      : `
        border-field-border bg-field
        hover:border-accent/50
      `}
      `}
    >
      <span className="flex min-w-0 flex-col gap-1">
        <span className={`
          font-mono text-caption tracking-[0.14em]
          ${labelText('muted')}
        `}
        >{label}
        </span>
        {chosen === null
          ? <span className="text-body text-t3">{t({ id: 'engine-choose' })}</span>
          : (
              <span
                data-testid="chosen-engine"
                className="truncate text-body font-medium text-t1"
              >{chosen}
              </span>
            )}
      </span>
      <Chevron tone={next ? 'text-star' : 'text-t4'} />
    </button>
  );
}
