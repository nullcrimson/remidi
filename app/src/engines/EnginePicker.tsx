import { FloatingFocusManager, FloatingOverlay, FloatingPortal } from '@floating-ui/react';
import type { ReactNode, RefObject } from 'react';
import { useT } from '../locale/localeContext';
import { IconButton } from '../ui/IconButton';
import { useDialog } from '../ui/useDialog';

/**
 * The dialog an engine is picked in: a sheet rising from the bottom on a phone, a centred
 * panel on a wider screen. It traps focus, starting on `initialFocus`, closes on Escape or
 * the backdrop, and gives focus back to what opened it.
 */
export function EnginePicker({ heading, initialFocus, onClose, children }: {
  heading: string;
  initialFocus: RefObject<HTMLElement | null>;
  onClose: () => void;
  children: ReactNode;
}) {
  const t = useT();
  const { focus, panel } = useDialog({ onClose, outsidePressEvent: 'click' });
  return (
    <FloatingPortal>
      <FloatingOverlay
        lockScroll
        className="z-40 bg-page/72 backdrop-blur-[1.5px]"
      >
        <FloatingFocusManager {...focus} initialFocus={initialFocus}>
          <div
            {...panel}
            aria-modal
            aria-label={heading}
            className="
              fixed inset-x-0 bottom-0 z-50 flex max-h-[85vh] flex-col
              rounded-t-card border-t border-hairline bg-card
              pb-[env(safe-area-inset-bottom)] shadow-modal outline-none
              sm:inset-x-auto sm:top-1/2 sm:bottom-auto sm:left-1/2 sm:w-140
              sm:max-w-[92vw] sm:-translate-1/2 sm:rounded-card sm:border
            "
          >
            <span
              aria-hidden="true"
              className="
                mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-white/18
                sm:hidden
              "
            />
            <div className="
              flex items-center justify-between gap-3 px-5 pt-3 pb-3
              sm:px-6 sm:pt-5
            "
            >
              <h2 className="font-display text-brand font-semibold text-t1">{heading}</h2>
              <IconButton label={t({ id: 'close' })} onClick={onClose}>×</IconButton>
            </div>
            <div className="
              min-h-0 px-5 pb-5
              sm:px-6 sm:pb-6
            "
            >
              {children}
            </div>
          </div>
        </FloatingFocusManager>
      </FloatingOverlay>
    </FloatingPortal>
  );
}
