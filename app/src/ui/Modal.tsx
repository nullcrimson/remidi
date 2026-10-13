import { useT } from '../locale/localeContext';
import { FloatingFocusManager, FloatingOverlay } from '@floating-ui/react';
import type { ReactNode } from 'react';
import { useDialog } from './useDialog';
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
  const { focus, panel } = useDialog({ onClose, outsidePressEvent: 'click' });

  return (
    <FloatingOverlay
      lockScroll
      data-testid="modal-backdrop"
      className="z-40 bg-page/72 backdrop-blur-[1.5px]"
    >
      <FloatingFocusManager {...focus}>
        <div
          {...panel}
          aria-modal
          aria-label={heading}
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
