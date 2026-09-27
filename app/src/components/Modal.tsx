import { useEffect, useRef, type ReactNode } from 'react';

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';

function keepFocusInside(dialog: HTMLElement, e: KeyboardEvent) {
  const items = [...dialog.querySelectorAll<HTMLElement>(FOCUSABLE)];
  if (items.length === 0) return;
  const first = items[0];
  const last = items[items.length - 1];
  const active = document.activeElement;
  const outside = !dialog.contains(active);
  if (e.shiftKey && (active === first || active === dialog || outside)) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && (active === last || outside)) {
    e.preventDefault();
    first.focus();
  }
}

export function Modal({
  open,
  heading,
  onClose,
  children,
}: {
  open: boolean;
  heading: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Tab' && ref.current) keepFocusInside(ref.current, e);
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      prev?.focus();
    };
  }, [open, onClose]);

  return (
    <>
      {open && (
        <div
          onClick={onClose}
          aria-hidden="true"
          className="fixed inset-0 z-40 bg-page/72 backdrop-blur-[1.5px]"
        />
      )}
      <div
        ref={ref}
        role="dialog"
        aria-modal={open || undefined}
        aria-label={heading}
        tabIndex={open ? -1 : undefined}
        hidden={!open}
        className={
          open
            ? `
              fixed top-1/2 left-1/2 z-50 flex max-h-[82vh] w-160 max-w-[92vw]
              -translate-1/2 flex-col overflow-hidden rounded-card border
              border-hairline bg-card shadow-[0_24px_70px_-20px_rgba(0,0,0,0.8)]
              outline-none
            `
            : undefined
        }
      >
        <div className="
          flex items-center justify-between border-b border-hairline px-6 py-4
        "
        >
          <h2 className="
            font-display text-[17px] font-semibold tracking-[0.01em] text-t1
          "
          >
            {heading}
          </h2>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="
              flex size-7 items-center justify-center rounded-[7px] bg-white/5
              text-[18px] text-t4 transition-colors
              hover:bg-white/10 hover:text-t2
            "
          >
            ×
          </button>
        </div>
        <div className="
          mr-scroll overflow-y-auto px-6 py-5 text-[15px] leading-relaxed
          text-t4
        "
        >
          {children}
        </div>
      </div>
    </>
  );
}
