import { useState, type ReactNode } from 'react';
import {
  autoUpdate,
  flip,
  offset,
  shift,
  useClick,
  useDismiss,
  useFloating,
  useHover,
  useInteractions,
  useRole,
} from '@floating-ui/react';

/**
 * Text with a dotted underline that opens a panel of detail: on hover, closing a moment
 * after the mouse leaves both, or pinned open by a click, tap or Enter until Esc, a click
 * outside or another click. The panel follows the text in the DOM, so Tab reaches its
 * controls next.
 */
export function InfoPopover({ label, children }: { label: ReactNode; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [pinned, setPinned] = useState(false);
  const { refs, floatingStyles, context } = useFloating({
    open,
    onOpenChange: (next, _event, reason) => {
      if (reason === 'click' && !next && !pinned) {
        setPinned(true);
        return;
      }
      if (!next && pinned && reason === 'hover') return;
      setPinned(next && reason === 'click');
      setOpen(next);
    },
    placement: 'bottom-start',
    strategy: 'fixed',
    middleware: [offset(8), flip(), shift({ padding: 8 })],
    whileElementsMounted: autoUpdate,
  });
  const { getReferenceProps, getFloatingProps } = useInteractions([
    useHover(context, { delay: { open: 100, close: 300 } }),
    useClick(context),
    useDismiss(context),
    useRole(context, { role: 'dialog' }),
  ]);

  return (
    <>
      <button
        ref={refs.setReference}
        type="button"
        {...getReferenceProps()}
        className="
          tap cursor-pointer border-b border-dotted border-t5 text-left
          transition-colors
          hover:border-accent hover:text-t2
          aria-expanded:border-accent aria-expanded:text-t2
        "
      >
        {label}
      </button>
      {open && (
        <div
          // eslint-disable-next-line react-hooks/refs -- Floating UI setFloating is a callback-ref setter, not a during-render ref read
          ref={refs.setFloating}
          style={floatingStyles}
          {...getFloatingProps()}
          className="
            z-50 flex w-max max-w-72 flex-col gap-3 rounded-panel border
            border-accent/25 bg-ink px-3.5 py-3 text-left font-sans
            text-caption/snug text-t3 shadow-popover
          "
        >
          {children}
        </div>
      )}
    </>
  );
}
