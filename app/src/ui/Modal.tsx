import { useT } from '../locale/localeContext';
import { FloatingFocusManager, FloatingOverlay, FloatingPortal } from '@floating-ui/react';
import type { ReactNode, RefObject } from 'react';
import { useDialog } from './useDialog';
import { IconButton } from './IconButton';

/** Where the dialog sits: centred on every screen, or a sheet rising from the bottom on a phone and centred from `sm` up. */
export type ModalLayout = 'centred' | 'sheet';

interface ModalProps {
  open: boolean;
  heading: string;
  onClose: () => void;
  layout?: ModalLayout;
  /** What takes focus when the dialog opens; the dialog itself when absent. */
  initialFocus?: RefObject<HTMLElement | null>;
  children: ReactNode;
}

const LAYOUTS = {
  centred: {
    panel: `
      fixed top-1/2 left-1/2 z-50 flex max-h-[82vh] w-160 max-w-[92vw]
      -translate-1/2 flex-col overflow-hidden rounded-card border
      border-hairline bg-card shadow-modal outline-none
    `,
    head: `
      flex items-center justify-between border-b border-hairline px-6 py-4
    `,
    heading: `
      font-display text-brand font-semibold tracking-[0.01em] text-t1
    `,
    body: `
      mr-scroll overflow-y-auto px-6 py-5 text-body/relaxed text-t4
    `,
  },
  sheet: {
    panel: `
      fixed inset-x-0 bottom-0 z-50 flex max-h-[85vh] flex-col rounded-t-card
      border-t border-hairline bg-card pb-[env(safe-area-inset-bottom)]
      shadow-modal outline-none
      sm:inset-x-auto sm:top-1/2 sm:bottom-auto sm:left-1/2 sm:w-140
      sm:max-w-[92vw] sm:-translate-1/2 sm:rounded-card sm:border
    `,
    head: `
      flex items-center justify-between gap-3 px-5 pt-3 pb-3
      sm:px-6 sm:pt-5
    `,
    heading: 'font-display text-brand font-semibold text-t1',
    body: `
      min-h-0 px-5 pb-5
      sm:px-6 sm:pb-6
    `,
  },
} as const satisfies Record<ModalLayout, Record<'panel' | 'head' | 'heading' | 'body', string>>;

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
  const { heading, onClose, layout = 'centred', initialFocus } = props;
  const { focus, panel } = useDialog({ onClose, outsidePressEvent: 'click' });

  return (
    <FloatingPortal>
      <FloatingOverlay
        lockScroll
        data-testid="modal-backdrop"
        className="z-40 bg-page/72 backdrop-blur-[1.5px]"
      >
        <FloatingFocusManager {...focus} initialFocus={initialFocus ?? focus.initialFocus}>
          <div
            {...panel}
            aria-modal
            aria-label={heading}
            className={LAYOUTS[layout].panel}
          >
            <ModalContent {...props} />
          </div>
        </FloatingFocusManager>
      </FloatingOverlay>
    </FloatingPortal>
  );
}

function ModalContent({ heading, onClose, layout = 'centred', children }: Omit<ModalProps, 'open'>) {
  const t = useT();
  const classes = LAYOUTS[layout];
  return (
    <>
      {layout === 'sheet' && (
        <span
          aria-hidden="true"
          className="
            mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-white/18
            sm:hidden
          "
        />
      )}
      <div className={classes.head}>
        <h2 className={classes.heading}>{heading}</h2>
        <IconButton label={t({ id: 'close' })} onClick={onClose}>×</IconButton>
      </div>
      <div className={classes.body}>
        {children}
      </div>
    </>
  );
}
