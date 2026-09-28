import {
  FloatingFocusManager,
  useDismiss,
  useFloating,
  useInteractions,
} from '@floating-ui/react';
import { useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { OverlayAnchor } from './overlayAnchor';

/**
 * A note picker's frame: a bottom sheet on phones, an inline panel from `sm` up. It takes
 * focus when it opens, gives it back when it closes, and closes on Escape or a press
 * outside the row it belongs to ({@link OverlayAnchor}).
 */
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
  const anchor = useContext(OverlayAnchor);
  const [opener] = useState(() => ({ current: document.activeElement as HTMLElement | null }));
  const [panel, setPanel] = useState<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const attachPanel = useCallback((el: HTMLDivElement | null) => {
    panelRef.current = el;
    setPanel(el);
  }, []);
  const { context } = useFloating({
    open: true,
    onOpenChange: (open) => {
      if (!open) onClose();
    },
    elements: { reference: anchor, floating: panel },
  });
  const { getFloatingProps } = useInteractions([
    useDismiss(context, {
      outsidePressEvent: 'mousedown',
      outsidePress: (event) => event.target !== backdropRef.current,
    }),
  ]);
  return (
    <>
      <div
        ref={backdropRef}
        data-testid="sheet-backdrop"
        aria-hidden="true"
        onClick={onClose}
        className="
          fixed inset-0 z-40 bg-page/70 backdrop-blur-[1.5px]
          sm:hidden
        "
      />
      <FloatingFocusManager
        context={context}
        modal={false}
        initialFocus={panelRef}
        returnFocus={opener}
        closeOnFocusOut={false}
      >
        <div
          ref={attachPanel}
          role="dialog"
          aria-label={label}
          tabIndex={-1}
          {...getFloatingProps()}
          className={`
            fixed inset-x-0 bottom-0 z-50 max-h-[85vh] overflow-y-auto
            rounded-t-card border border-accent/18 bg-card p-[16px_16px_24px]
            shadow-sheet outline-none
            sm:static sm:z-auto sm:my-0.5 sm:mb-3 sm:max-h-none
            sm:overflow-visible sm:rounded-panel sm:bg-inset
            sm:p-[13px_14px_16px] sm:shadow-none
            ${className}
          `}
        >
          {children}
        </div>
      </FloatingFocusManager>
    </>
  );
}
