import { useT } from '../localeContext';
import {
  FloatingFocusManager,
  FloatingOverlay,
  useDismiss,
  useFloating,
  useInteractions,
} from '@floating-ui/react';
import { useCallback, useRef, useState, type ReactNode } from 'react';
import { IconButton } from './IconButton';

interface ModalProps {
  open: boolean;
  heading: string;
  onClose: () => void;
  children: ReactNode;
}

/**
 * A dialog over the page: it traps focus, locks page scroll, closes on Escape or the
 * backdrop, and gives focus back to what opened it. Closed, its content stays in the
 * page, hidden, so crawlers still read it.
 */
export function Modal({ open, ...props }: ModalProps) {
  if (open) return <ModalDialog {...props} />;
  return (
    <div role="dialog" aria-label={props.heading} hidden>
      <ModalContent {...props} />
    </div>
  );
}

function ModalDialog(props: Omit<ModalProps, 'open'>) {
  const { heading, onClose } = props;
  const [opener] = useState(() => ({ current: document.activeElement as HTMLElement | null }));
  const [panel, setPanel] = useState<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const attachPanel = useCallback((el: HTMLDivElement | null) => {
    panelRef.current = el;
    setPanel(el);
  }, []);
  const { context } = useFloating({
    open: true,
    onOpenChange: (next) => {
      if (!next) onClose();
    },
    elements: { floating: panel },
  });
  const { getFloatingProps } = useInteractions([
    useDismiss(context, { outsidePressEvent: 'click' }),
  ]);

  return (
    <FloatingOverlay
      lockScroll
      data-testid="modal-backdrop"
      className="z-40 bg-page/72 backdrop-blur-[1.5px]"
    >
      <FloatingFocusManager context={context} initialFocus={panelRef} returnFocus={opener}>
        <div
          ref={attachPanel}
          role="dialog"
          aria-modal
          aria-label={heading}
          tabIndex={-1}
          {...getFloatingProps()}
          className="
            fixed top-1/2 left-1/2 z-50 flex max-h-[82vh] w-160 max-w-[92vw]
            -translate-1/2 flex-col overflow-hidden rounded-card border
            border-hairline bg-card shadow-modal outline-none
          "
        >
          <ModalContent {...props} />
        </div>
      </FloatingFocusManager>
    </FloatingOverlay>
  );
}

function ModalContent({ heading, onClose, children }: Omit<ModalProps, 'open'>) {
  const t = useT();
  return (
    <>
      <div className="
        flex items-center justify-between border-b border-hairline px-6 py-4
      "
      >
        <h2 className="
          font-display text-brand font-semibold tracking-[0.01em] text-t1
        "
        >
          {heading}
        </h2>
        <IconButton label={t({ id: 'close' })} onClick={onClose}>×</IconButton>
      </div>
      <div className="
        mr-scroll overflow-y-auto px-6 py-5 text-body/relaxed text-t4
      "
      >
        {children}
      </div>
    </>
  );
}
