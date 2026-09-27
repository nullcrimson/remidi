import { useRef, type ReactNode } from 'react';
import { useRestoreFocus } from '../hooks/useRestoreFocus';

/** A note picker's frame: a bottom sheet on phones, an inline panel from `sm` up. */
export function PickerShell({
  label,
  onClose,
  className = '',
  children,
}: {
  label: string;
  onClose: () => void;
  className?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useRestoreFocus(ref);
  return (
    <>
      <div
        data-testid="sheet-backdrop"
        aria-hidden="true"
        onClick={onClose}
        className="
          fixed inset-0 z-40 bg-page/70 backdrop-blur-[1.5px]
          sm:hidden
        "
      />
      <div
        ref={ref}
        role="dialog"
        aria-label={label}
        tabIndex={-1}
        className={`
          fixed inset-x-0 bottom-0 z-50 max-h-[85vh] overflow-y-auto
          rounded-t-card border border-accent/18 bg-card p-[16px_16px_24px]
          shadow-[0_-18px_48px_-12px_rgba(0,0,0,0.7)] outline-none
          sm:static sm:z-auto sm:my-0.5 sm:mb-3 sm:max-h-none
          sm:overflow-visible sm:rounded-panel sm:bg-inset sm:p-[13px_14px_16px]
          sm:shadow-none
          ${className}
        `}
      >
        {children}
      </div>
    </>
  );
}
